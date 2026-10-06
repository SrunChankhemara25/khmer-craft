import crypto from 'crypto';
import mongoose from 'mongoose';
import Order, { IOrder } from '../../../models/Order';
import PayoutAccount, { IPayoutAccount, PayoutAccountStatus } from '../../../models/PayoutAccount';
import PlatformSetting, { IPlatformSetting } from '../../../models/PlatformSetting';
import SellerPayout, { IPayoutLine, ISellerPayout } from '../../../models/SellerPayout';
import Store from '../../../models/Store';
import { AppError } from '../../errors/app-error';

const DAY_MS = 24 * 60 * 60 * 1000;
const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Who is holding the buyer's money once an order is paid.
 *
 * Online payments land in KhmerCraft's merchant account, so KhmerCraft owes
 * the seller their share. Cash on delivery is collected by the seller, so the
 * seller owes KhmerCraft the commission instead. POS sales are the seller's
 * own in-store register and are not part of marketplace settlement at all.
 */
const COLLECTED_BY_KHMERCRAFT = ['ABA_PAYWAY', 'ABA_DEMO', 'STRIPE_SANDBOX'];
const COLLECTED_BY_SELLER = ['COD'];

// ------------------------------------------------------------------ settings

export const getSettings = async (): Promise<IPlatformSetting> => {
  const existing = await PlatformSetting.findOne({ key: 'platform' });
  if (existing) return existing;
  try {
    return await PlatformSetting.create({ key: 'platform' });
  } catch {
    // Two first requests raced to create it; the other one won.
    return (await PlatformSetting.findOne({ key: 'platform' }))!;
  }
};

export const toSettingsView = (settings: IPlatformSetting) => ({
  commissionRate: settings.commissionRate,
  payoutSchedule: settings.payoutSchedule,
  payoutWeekday: settings.payoutWeekday,
  holdDays: settings.holdDays,
  minimumPayout: settings.minimumPayout,
  nextPayoutDate: nextPayoutDate(settings).toISOString(),
  updatedAt: settings.updatedAt?.toISOString() ?? null,
});

export const updateSettings = async (
  adminId: string,
  input: Partial<Pick<IPlatformSetting, 'commissionRate' | 'payoutSchedule' | 'payoutWeekday' | 'holdDays' | 'minimumPayout'>>,
) => {
  const settings = await getSettings();
  Object.assign(settings, input, { updatedBy: new mongoose.Types.ObjectId(adminId) });
  await settings.save();
  return toSettingsView(settings);
};

/**
 * The next scheduled payout day, today included. Nothing pays automatically —
 * this is the date the admin queue marks stores as due, and what sellers see.
 */
export const nextPayoutDate = (settings: IPlatformSetting, from = new Date()) => {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (settings.payoutSchedule === 'MONTHLY') {
    // First chosen weekday of the month, this month if not yet passed.
    for (let monthOffset = 0; monthOffset < 2; monthOffset += 1) {
      const first = new Date(start.getFullYear(), start.getMonth() + monthOffset, 1);
      const shift = (settings.payoutWeekday - first.getDay() + 7) % 7;
      const day = new Date(first.getTime() + shift * DAY_MS);
      if (day >= start) return day;
    }
  }
  const shift = (settings.payoutWeekday - start.getDay() + 7) % 7;
  let day = new Date(start.getTime() + shift * DAY_MS);
  if (settings.payoutSchedule === 'BIWEEKLY') {
    // Every other week, anchored to a fixed epoch so the cycle never drifts.
    const weekIndex = Math.floor(day.getTime() / (7 * DAY_MS));
    if (weekIndex % 2 === 1) day = new Date(day.getTime() + 7 * DAY_MS);
  }
  return day;
};

// ---------------------------------------------------------------- settlement

const deliveredAt = (order: IOrder) => {
  const event = [...(order.statusHistory ?? [])].reverse().find((e) => e.status === 'DELIVERED');
  return event?.at ?? order.updatedAt;
};

export interface SettlementLine extends IPayoutLine {
  storeId: string;
  releasesAt: Date;
}

const linesForOrder = (order: IOrder, rate: number): SettlementLine[] => {
  const collectedBy = COLLECTED_BY_KHMERCRAFT.includes(order.paymentMethod)
    ? 'KHMERCRAFT'
    : COLLECTED_BY_SELLER.includes(order.paymentMethod)
      ? 'SELLER'
      : null;
  if (!collectedBy) return [];

  // An order can hold items from several stores; settle each store's part.
  const byStore = new Map<string, number>();
  for (const item of order.items) {
    if (!item.sellerId) continue;
    const key = String(item.sellerId);
    byStore.set(key, (byStore.get(key) ?? 0) + item.subtotal);
  }

  const delivered = deliveredAt(order);
  return [...byStore.entries()].map(([storeId, gross]) => {
    // A partial refund is shared across stores in proportion to their part.
    const refunded = order.subtotal > 0 ? round(((order.refundedAmount ?? 0) * gross) / order.subtotal) : 0;
    const base = Math.max(0, gross - refunded);
    const commission = round((base * rate) / 100);
    return {
      storeId,
      orderId: order._id as mongoose.Types.ObjectId,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      collectedBy,
      deliveredAt: delivered,
      releasesAt: delivered,
      gross: round(gross),
      refunded,
      commission,
      net: collectedBy === 'KHMERCRAFT' ? round(base - commission) : -commission,
    };
  });
};

export interface StoreBalance {
  storeId: string;
  /** Ready to pay: past the hold window, not in any payout yet. Can be negative (seller owes). */
  available: number;
  availableLines: SettlementLine[];
  /** Delivered, but still inside the returns hold window. */
  onHold: number;
  onHoldLines: SettlementLine[];
  grossSales: number;
  commission: number;
}

/**
 * Balances for the given stores (or every store with settled orders).
 * Reads every delivered, paid, non-POS order once and groups it by store.
 */
export const computeBalances = async (
  settings: IPlatformSetting,
  storeIds?: string[],
  now = new Date(),
): Promise<Map<string, StoreBalance>> => {
  const filter: Record<string, unknown> = {
    orderStatus: 'DELIVERED',
    paymentStatus: 'PAID',
    channel: mongoose.trusted({ $ne: 'POS' }),
    isVoided: mongoose.trusted({ $ne: true }),
    refundStatus: mongoose.trusted({ $ne: 'FULL' }),
  };
  if (storeIds) {
    filter['items.sellerId'] = mongoose.trusted({ $in: storeIds.map((id) => new mongoose.Types.ObjectId(id)) });
  }

  const [orders, lockedPayouts] = await Promise.all([
    Order.find(filter),
    SellerPayout.find({ status: mongoose.trusted({ $in: ['PENDING', 'PAID'] }) }).select('storeId orderIds'),
  ]);

  // Locked per store: a multi-store order paid to store A is still owed to store B.
  const locked = new Set<string>();
  for (const payout of lockedPayouts) {
    for (const orderId of payout.orderIds) locked.add(`${payout.storeId}:${orderId}`);
  }

  const holdMs = settings.holdDays * DAY_MS;
  const balances = new Map<string, StoreBalance>();
  const wanted = storeIds ? new Set(storeIds) : null;

  for (const order of orders) {
    for (const line of linesForOrder(order, settings.commissionRate)) {
      if (wanted && !wanted.has(line.storeId)) continue;
      if (locked.has(`${line.storeId}:${line.orderId}`)) continue;
      let balance = balances.get(line.storeId);
      if (!balance) {
        balance = { storeId: line.storeId, available: 0, availableLines: [], onHold: 0, onHoldLines: [], grossSales: 0, commission: 0 };
        balances.set(line.storeId, balance);
      }
      line.releasesAt = new Date(line.deliveredAt.getTime() + holdMs);
      if (line.releasesAt <= now) {
        balance.available = round(balance.available + line.net);
        balance.availableLines.push(line);
      } else {
        balance.onHold = round(balance.onHold + line.net);
        balance.onHoldLines.push(line);
      }
      balance.grossSales = round(balance.grossSales + line.gross - line.refunded);
      balance.commission = round(balance.commission + line.commission);
    }
  }
  return balances;
};

const emptyBalance = (storeId: string): StoreBalance => ({
  storeId, available: 0, availableLines: [], onHold: 0, onHoldLines: [], grossSales: 0, commission: 0,
});

// ------------------------------------------------------------ views

const maskNumber = (value: string) => (value.length <= 4 ? value : `•••• ${value.slice(-4)}`);

const toAccountView = (account: IPayoutAccount | null, opts: { full: boolean }) =>
  account
    ? {
        id: String(account._id),
        storeId: String(account.storeId),
        method: account.method,
        bankName: account.bankName ?? null,
        accountName: account.accountName,
        accountNumber: opts.full ? account.accountNumber : maskNumber(account.accountNumber),
        phone: account.phone ?? null,
        khqrImage: opts.full ? (account.khqrImage ?? null) : null,
        hasKhqr: !!account.khqrImage,
        status: account.status,
        verifiedAt: account.verifiedAt?.toISOString() ?? null,
        rejectionReason: account.rejectionReason ?? null,
        updatedAt: account.updatedAt?.toISOString() ?? null,
      }
    : null;

const toLineView = (line: IPayoutLine | SettlementLine) => ({
  orderId: String(line.orderId),
  orderNumber: line.orderNumber,
  paymentMethod: line.paymentMethod,
  collectedBy: line.collectedBy,
  deliveredAt: line.deliveredAt.toISOString(),
  releasesAt: 'releasesAt' in line ? line.releasesAt.toISOString() : null,
  gross: line.gross,
  refunded: line.refunded,
  commission: line.commission,
  net: line.net,
});

/**
 * Receipts are large data URLs, so lists load payouts without them; this
 * finds which of those payouts do have one, for the `hasProof` flag.
 */
const idsWithProof = async (payouts: ISellerPayout[]) =>
  new Set(
    (
      await SellerPayout.find({
        _id: mongoose.trusted({ $in: payouts.map((p) => p._id) }),
        proofUrl: mongoose.trusted({ $exists: true, $ne: '' }),
      }).select('_id')
    ).map((p) => String(p._id)),
  );

const toPayoutView = (
  payout: ISellerPayout,
  opts: { withLines?: boolean; withProof?: boolean; proofIds?: Set<string> } = {},
) => ({
  id: String(payout._id),
  payoutNumber: payout.payoutNumber,
  storeId: String(payout.storeId),
  storeName: payout.storeName,
  amount: payout.amount,
  currency: payout.currency,
  commissionRate: payout.commissionRate,
  grossSales: payout.grossSales,
  commissionTotal: payout.commissionTotal,
  orderCount: payout.orderIds.length,
  account: payout.account,
  status: payout.status,
  reference: payout.reference ?? null,
  hasProof: opts.proofIds ? opts.proofIds.has(String(payout._id)) : !!payout.proofUrl,
  proofUrl: opts.withProof ? (payout.proofUrl ?? null) : undefined,
  note: payout.note ?? null,
  paidAt: payout.paidAt?.toISOString() ?? null,
  cancelledAt: payout.cancelledAt?.toISOString() ?? null,
  cancelReason: payout.cancelReason ?? null,
  createdAt: payout.createdAt.toISOString(),
  lines: opts.withLines ? payout.lines.map(toLineView) : undefined,
});

// --------------------------------------------------------- seller (owner)

const loadOwnedStore = async (storeId: string, userId: string) => {
  if (!mongoose.isValidObjectId(storeId)) throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND');
  const store = await Store.findById(storeId);
  if (!store || String(store.userId) !== userId) throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND');
  return store;
};

/** Everything the seller's "Sales & Payouts" screen needs. */
export const getSellerSummary = async (storeId: string, userId: string) => {
  const store = await loadOwnedStore(storeId, userId);
  const settings = await getSettings();
  const [balances, account, payouts, awaitingDelivery] = await Promise.all([
    computeBalances(settings, [storeId]),
    PayoutAccount.findOne({ storeId: store._id }),
    SellerPayout.find({ storeId: store._id }).sort({ createdAt: -1 }).limit(50).select('-proofUrl'),
    // Paid online but not delivered yet: on its way to becoming earnings.
    Order.find(<Record<string, unknown>>{
      'items.sellerId': store._id,
      paymentStatus: 'PAID',
      paymentMethod: mongoose.trusted({ $in: COLLECTED_BY_KHMERCRAFT }),
      orderStatus: mongoose.trusted({ $in: ['PENDING', 'CONFIRMED', 'SHIPPED'] }),
      channel: mongoose.trusted({ $ne: 'POS' }),
    }),
  ]);
  const balance = balances.get(storeId) ?? emptyBalance(storeId);
  const pendingDelivery = round(
    awaitingDelivery
      .flatMap((order) => linesForOrder(order, settings.commissionRate))
      .filter((line) => line.storeId === storeId)
      .reduce((sum, line) => sum + line.net, 0),
  );
  const proofIds = await idsWithProof(payouts);
  const paidOut = round(payouts.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0));

  return {
    settings: toSettingsView(settings),
    account: toAccountView(account, { full: true }),
    balance: {
      available: balance.available,
      onHold: balance.onHold,
      pendingDelivery,
      paidOut,
      inProcessing: round(payouts.filter((p) => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0)),
    },
    lines: [...balance.availableLines, ...balance.onHoldLines]
      .sort((a, b) => b.deliveredAt.getTime() - a.deliveredAt.getTime())
      .map((line) => ({ ...toLineView(line), status: line.releasesAt <= new Date() ? 'AVAILABLE' : 'ON_HOLD' })),
    payouts: payouts.map((p) => toPayoutView(p, { proofIds })),
  };
};

export interface PayoutAccountInput {
  method: IPayoutAccount['method'];
  bankName?: string;
  accountName: string;
  accountNumber: string;
  phone?: string;
  khqrImage?: string | null;
}

export const saveSellerAccount = async (storeId: string, userId: string, input: PayoutAccountInput) => {
  const store = await loadOwnedStore(storeId, userId);
  if (input.method === 'OTHER_BANK' && !input.bankName) {
    throw new AppError(422, 'Tell us which bank this account is with', 'VALIDATION_ERROR', { bankName: ['Required for other banks'] });
  }
  const account = await PayoutAccount.findOneAndUpdate(
    { storeId: store._id },
    {
      $set: {
        userId: new mongoose.Types.ObjectId(userId),
        method: input.method,
        bankName: input.method === 'OTHER_BANK' ? input.bankName : undefined,
        accountName: input.accountName,
        accountNumber: input.accountNumber,
        phone: input.phone,
        khqrImage: input.khqrImage || undefined,
        // Any change needs a fresh admin check before money is sent to it.
        status: 'PENDING_VERIFICATION',
        verifiedAt: null,
        verifiedBy: null,
        rejectionReason: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return toAccountView(account, { full: true });
};

/** Owner of the store, or an admin, can open a payout's receipt. */
export const getPayoutDetail = async (payoutId: string, user: { userId: string; role: string }) => {
  if (!mongoose.isValidObjectId(payoutId)) throw new AppError(404, 'Payout not found', 'PAYOUT_NOT_FOUND');
  const payout = await SellerPayout.findById(payoutId);
  if (!payout || (user.role !== 'ADMIN' && String(payout.userId) !== user.userId)) {
    throw new AppError(404, 'Payout not found', 'PAYOUT_NOT_FOUND');
  }
  return toPayoutView(payout, { withLines: true, withProof: true });
};

// --------------------------------------------------------------- admin

export const adminBalances = async () => {
  const settings = await getSettings();
  const [balances, accounts, lastPaid, pending] = await Promise.all([
    computeBalances(settings),
    PayoutAccount.find(),
    SellerPayout.aggregate<{ _id: mongoose.Types.ObjectId; paidAt: Date; total: number }>([
      { $match: { status: 'PAID' } },
      { $group: { _id: '$storeId', paidAt: { $max: '$paidAt' }, total: { $sum: '$amount' } } },
    ]),
    SellerPayout.find({ status: 'PENDING' }).select('storeId amount payoutNumber'),
  ]);
  const accountByStore = new Map(accounts.map((a) => [String(a.storeId), a]));
  const lastByStore = new Map(lastPaid.map((p) => [String(p._id), p]));
  const pendingByStore = new Map(pending.map((p) => [String(p.storeId), p]));

  // Every store that has money moving, has an account, or has been paid before.
  const storeIds = new Set<string>([...balances.keys(), ...accountByStore.keys(), ...lastByStore.keys(), ...pendingByStore.keys()]);
  const stores = await Store.find({ _id: mongoose.trusted({ $in: [...storeIds] }) }).select('storeName slug userId');

  const rows = stores.map((store) => {
    const id = String(store._id);
    const balance = balances.get(id) ?? emptyBalance(id);
    const account = accountByStore.get(id) ?? null;
    const last = lastByStore.get(id);
    const inFlight = pendingByStore.get(id);
    const canPay = !inFlight && account?.status === 'VERIFIED' && balance.available > 0;
    return {
      storeId: id,
      storeName: store.storeName,
      slug: store.slug,
      available: balance.available,
      onHold: balance.onHold,
      readyOrders: balance.availableLines.length,
      grossSales: balance.grossSales,
      commission: balance.commission,
      account: toAccountView(account, { full: false }),
      pendingPayout: inFlight ? { id: String(inFlight._id), payoutNumber: inFlight.payoutNumber, amount: inFlight.amount } : null,
      lastPaidAt: last?.paidAt?.toISOString() ?? null,
      totalPaid: round(last?.total ?? 0),
      /** Ready, verified and above the minimum: what a scheduled run would pay. */
      due: canPay && balance.available >= settings.minimumPayout,
      canPay,
      blockedReason: inFlight
        ? 'A payout is already in progress'
        : !account
          ? 'No payout account yet'
          : account.status !== 'VERIFIED'
            ? 'Payout account not verified'
            : balance.available <= 0
              ? balance.available < 0 ? 'Seller owes commission' : 'Nothing ready to pay'
              : null,
    };
  });
  rows.sort((a, b) => Number(b.due) - Number(a.due) || b.available - a.available);

  const sum = (pick: (r: (typeof rows)[number]) => number) => round(rows.reduce((total, r) => total + pick(r), 0));
  return {
    settings: toSettingsView(settings),
    totals: {
      dueNow: sum((r) => (r.due ? r.available : 0)),
      dueStores: rows.filter((r) => r.due).length,
      onHold: sum((r) => Math.max(0, r.onHold)),
      owedBySellers: sum((r) => (r.available < 0 ? -r.available : 0)),
      commissionEarned: sum((r) => r.commission),
      accountsToVerify: accounts.filter((a) => a.status === 'PENDING_VERIFICATION').length,
      pendingPayouts: pending.length,
    },
    stores: rows,
  };
};

export const adminListAccounts = async (status?: string) => {
  const filter: Record<string, unknown> = {};
  if (status && status !== 'ALL') filter.status = status;
  const accounts = await PayoutAccount.find(filter).sort({ updatedAt: -1 });
  const stores = await Store.find({ _id: mongoose.trusted({ $in: accounts.map((a) => a.storeId) }) }).select('storeName slug');
  const nameById = new Map(stores.map((s) => [String(s._id), s]));
  return accounts.map((account) => ({
    ...toAccountView(account, { full: true })!,
    storeName: nameById.get(String(account.storeId))?.storeName ?? 'Deleted store',
    storeSlug: nameById.get(String(account.storeId))?.slug ?? null,
  }));
};

export const adminReviewAccount = async (
  adminId: string,
  accountId: string,
  status: Exclude<PayoutAccountStatus, 'PENDING_VERIFICATION'>,
  reason?: string,
) => {
  if (!mongoose.isValidObjectId(accountId)) throw new AppError(404, 'Payout account not found', 'NOT_FOUND');
  const account = await PayoutAccount.findById(accountId);
  if (!account) throw new AppError(404, 'Payout account not found', 'NOT_FOUND');
  account.status = status;
  account.verifiedAt = status === 'VERIFIED' ? new Date() : null;
  account.verifiedBy = status === 'VERIFIED' ? new mongoose.Types.ObjectId(adminId) : null;
  account.rejectionReason = status === 'REJECTED' ? (reason ?? null) : null;
  await account.save();
  return toAccountView(account, { full: true });
};

const newPayoutNumber = () => {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `PO-${date}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

export interface MarkPaidInput {
  reference?: string;
  proofUrl: string;
  note?: string;
}

/**
 * Lock a store's ready balance into a PENDING payout. With `paid`, the admin
 * has already sent the transfer and this records it in the same step — the
 * one-click path.
 */
export const createPayout = async (adminId: string, storeId: string, paid?: MarkPaidInput) => {
  if (!mongoose.isValidObjectId(storeId)) throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND');
  const store = await Store.findById(storeId);
  if (!store) throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND');

  const account = await PayoutAccount.findOne({ storeId: store._id });
  if (!account) throw new AppError(409, 'This seller has not added a payout account yet', 'NO_PAYOUT_ACCOUNT');
  if (account.status !== 'VERIFIED') {
    throw new AppError(409, 'Verify the seller’s payout account before paying it', 'PAYOUT_ACCOUNT_UNVERIFIED');
  }
  if (await SellerPayout.exists({ storeId: store._id, status: 'PENDING' })) {
    throw new AppError(409, 'This store already has a payout in progress', 'PAYOUT_IN_PROGRESS');
  }

  const settings = await getSettings();
  const balance = (await computeBalances(settings, [storeId])).get(storeId) ?? emptyBalance(storeId);
  if (balance.available <= 0 || !balance.availableLines.length) {
    throw new AppError(409, balance.available < 0 ? 'The seller owes more commission than they have earned' : 'Nothing is ready to pay for this store', 'NOTHING_TO_PAY');
  }

  const lines = balance.availableLines;
  const payout = await SellerPayout.create({
    payoutNumber: newPayoutNumber(),
    storeId: store._id,
    storeName: store.storeName,
    userId: store.userId,
    amount: balance.available,
    commissionRate: settings.commissionRate,
    grossSales: round(lines.reduce((sum, l) => sum + l.gross - l.refunded, 0)),
    commissionTotal: round(lines.reduce((sum, l) => sum + l.commission, 0)),
    lines: lines.map(({ storeId: _s, releasesAt: _r, ...line }) => line),
    orderIds: lines.map((l) => l.orderId),
    account: {
      method: account.method,
      bankName: account.bankName,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
    },
    createdBy: new mongoose.Types.ObjectId(adminId),
  });

  if (paid) return markPaid(adminId, String(payout._id), paid);
  return toPayoutView(payout, { withLines: true });
};

/** Create PENDING payouts for every store that is due under the current rules. */
export const createDuePayouts = async (adminId: string) => {
  const { stores } = await adminBalances();
  const created = [];
  const skipped = [];
  for (const row of stores.filter((r) => r.due)) {
    try {
      created.push(await createPayout(adminId, row.storeId));
    } catch (err) {
      skipped.push({ storeId: row.storeId, storeName: row.storeName, reason: err instanceof AppError ? err.message : 'Failed' });
    }
  }
  return { created, skipped };
};

export const markPaid = async (adminId: string, payoutId: string, input: MarkPaidInput) => {
  if (!mongoose.isValidObjectId(payoutId)) throw new AppError(404, 'Payout not found', 'PAYOUT_NOT_FOUND');
  const payout = await SellerPayout.findById(payoutId);
  if (!payout) throw new AppError(404, 'Payout not found', 'PAYOUT_NOT_FOUND');
  if (payout.status !== 'PENDING') {
    throw new AppError(409, `This payout is already ${payout.status.toLowerCase()}`, 'PAYOUT_NOT_PENDING');
  }
  // Last line of defence against paying an order twice.
  const clash = await SellerPayout.exists({
    _id: mongoose.trusted({ $ne: payout._id }),
    storeId: payout.storeId,
    status: 'PAID',
    orderIds: mongoose.trusted({ $in: payout.orderIds }),
  });
  if (clash) {
    throw new AppError(409, 'Some of these orders were already paid in another payout — cancel this one', 'ORDERS_ALREADY_PAID');
  }

  // Conditional update so two admins confirming at once cannot both succeed.
  const updated = await SellerPayout.findOneAndUpdate(
    { _id: payout._id, status: 'PENDING' },
    {
      $set: {
        status: 'PAID',
        reference: input.reference,
        proofUrl: input.proofUrl,
        note: input.note,
        paidAt: new Date(),
        paidBy: new mongoose.Types.ObjectId(adminId),
      },
    },
    { new: true },
  );
  if (!updated) throw new AppError(409, 'This payout was just updated by someone else', 'PAYOUT_NOT_PENDING');
  return toPayoutView(updated, { withLines: true });
};

export const cancelPayout = async (payoutId: string, reason: string) => {
  if (!mongoose.isValidObjectId(payoutId)) throw new AppError(404, 'Payout not found', 'PAYOUT_NOT_FOUND');
  const updated = await SellerPayout.findOneAndUpdate(
    { _id: payoutId, status: 'PENDING' },
    { $set: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason } },
    { new: true },
  );
  if (!updated) throw new AppError(409, 'Only a payout that has not been paid can be cancelled', 'PAYOUT_NOT_PENDING');
  return toPayoutView(updated);
};

export const adminListPayouts = async (query: { status?: string; storeId?: string; page?: number; limit?: number }) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const filter: Record<string, unknown> = {};
  if (query.status && ['PENDING', 'PAID', 'CANCELLED'].includes(query.status)) filter.status = query.status;
  if (query.storeId && mongoose.isValidObjectId(query.storeId)) filter.storeId = query.storeId;
  const [total, payouts, paidTotals] = await Promise.all([
    SellerPayout.countDocuments(filter),
    SellerPayout.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-proofUrl -lines'),
    SellerPayout.aggregate<{ _id: null; total: number; count: number }>([
      { $match: { status: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);
  const proofIds = await idsWithProof(payouts);
  return {
    payouts: payouts.map((p) => toPayoutView(p, { proofIds })),
    paidAllTime: round(paidTotals[0]?.total ?? 0),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
};
