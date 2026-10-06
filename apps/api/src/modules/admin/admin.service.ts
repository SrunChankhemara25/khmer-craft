import mongoose from 'mongoose';
import Product from '../../../models/Product';
import { PromotionSlide } from '../../../models/Promotion';
import RefreshToken from '../../../models/RefreshToken';
import SellerApplication from '../../../models/SellerApplication';
import Store, { IStore } from '../../../models/Store';
import SubscriptionPayment, { PaidPlan } from '../../../models/SubscriptionPayment';
import User, { UserStatus } from '../../../models/User';
import { AppError } from '../../errors/app-error';
import { PLAN_LABELS, PLAN_PRICES, effectivePlan } from '../subscriptions/subscriptions.service';

const DAY_MS = 24 * 60 * 60 * 1000;
/** A paid plan this close to lapsing is flagged so the admin can follow up. */
const EXPIRING_WINDOW_DAYS = 7;

/**
 * Where a store stands on billing right now.
 *
 * - paying:   on a paid plan that has not lapsed
 * - expiring: paying, but the period ends within EXPIRING_WINDOW_DAYS
 * - lapsed:   bought a paid plan once, it has run out, and nothing renewed it
 * - free:     on STARTER and never paid
 */
export type BillingStatus = 'paying' | 'expiring' | 'lapsed' | 'free';

const billingStatus = (store: IStore, now = Date.now()): BillingStatus => {
  if (effectivePlan(store) !== 'STARTER') {
    const left = (store.planExpiresAt?.getTime() ?? 0) - now;
    return left <= EXPIRING_WINDOW_DAYS * DAY_MS ? 'expiring' : 'paying';
  }
  return store.subscriptionPlan === 'STARTER' && !store.planExpiresAt ? 'free' : 'lapsed';
};

/**
 * The same four buckets as `billingStatus`, as a Mongo filter, so the list can
 * page through one bucket server-side instead of filtering a page in memory.
 */
const billingFilter = (status: BillingStatus | 'paid', now: Date): Record<string, any> => {
  const soon = new Date(now.getTime() + EXPIRING_WINDOW_DAYS * DAY_MS);
  const paidPlan = mongoose.trusted({ $in: ['STANDARD', 'PREMIUM'] });
  switch (status) {
    case 'paid':
      return { subscriptionPlan: paidPlan, planExpiresAt: mongoose.trusted({ $gt: now }) };
    case 'paying':
      return { subscriptionPlan: paidPlan, planExpiresAt: mongoose.trusted({ $gt: soon }) };
    case 'expiring':
      return { subscriptionPlan: paidPlan, planExpiresAt: mongoose.trusted({ $gt: now, $lte: soon }) };
    case 'lapsed':
      // A lapsed store either still records a paid plan with a past (or
      // missing) expiry, or was downgraded to STARTER but kept its old date.
      return {
        $or: [
          { subscriptionPlan: paidPlan, planExpiresAt: mongoose.trusted({ $not: { $gt: now } }) },
          { subscriptionPlan: 'STARTER', planExpiresAt: mongoose.trusted({ $ne: null }) },
        ],
      };
    case 'free':
      return { subscriptionPlan: 'STARTER', planExpiresAt: null };
  }
};

const startOfMonth = (date: Date, monthsBack = 0) =>
  new Date(date.getFullYear(), date.getMonth() - monthsBack, 1);

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/**
 * Everything the admin dashboard's monitoring cards need, in one request.
 * Each count is its own small query; they run in parallel.
 */
export const getOverview = async () => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const seriesStart = startOfMonth(now, 5);

  const [
    sellerAccounts,
    sellerAccountsThisMonth,
    suspendedSellers,
    buyers,
    buyersThisMonth,
    stores,
    storesThisMonth,
    onboardedStores,
    verifiedStores,
    paidByPlan,
    paying,
    expiring,
    lapsed,
    free,
    pendingApplications,
    pendingSlides,
    liveSlides,
    revenueAllTime,
    revenueThisMonth,
    pendingPayments,
    failedPaymentsThisMonth,
    storesPerMonth,
    revenuePerMonth,
    expiringSoon,
  ] = await Promise.all([
    User.countDocuments({ role: 'SELLER' }),
    User.countDocuments({ role: 'SELLER', created_at: mongoose.trusted({ $gte: monthStart }) }),
    User.countDocuments({ role: 'SELLER', status: 'SUSPENDED' }),
    User.countDocuments({ role: 'BUYER' }),
    User.countDocuments({ role: 'BUYER', created_at: mongoose.trusted({ $gte: monthStart }) }),
    Store.countDocuments(),
    Store.countDocuments({ createdAt: mongoose.trusted({ $gte: monthStart }) }),
    Store.countDocuments({ onboardingStatus: 'COMPLETED' }),
    Store.countDocuments({ verificationStatus: 'VERIFIED' }),
    Store.aggregate<{ _id: PaidPlan; count: number }>([
      { $match: billingFilter('paid', now) },
      { $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } },
    ]),
    Store.countDocuments(billingFilter('paying', now)),
    Store.countDocuments(billingFilter('expiring', now)),
    Store.countDocuments(billingFilter('lapsed', now)),
    Store.countDocuments(billingFilter('free', now)),
    SellerApplication.countDocuments({ status: mongoose.trusted({ $in: ['SUBMITTED', 'UNDER_REVIEW'] }) }),
    PromotionSlide.countDocuments({ status: 'PENDING_APPROVAL' }),
    PromotionSlide.countDocuments({
      status: 'APPROVED',
      startDate: mongoose.trusted({ $lte: now }),
      endDate: mongoose.trusted({ $gte: now }),
    }),
    SubscriptionPayment.aggregate<{ total: number }>([
      { $match: { status: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    SubscriptionPayment.aggregate<{ total: number }>([
      { $match: { status: 'PAID', paidAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    SubscriptionPayment.countDocuments({ status: 'PENDING' }),
    SubscriptionPayment.countDocuments({ status: 'FAILED', createdAt: mongoose.trusted({ $gte: monthStart }) }),
    Store.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: seriesStart } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    SubscriptionPayment.aggregate<{ _id: string; total: number; count: number }>([
      { $match: { status: 'PAID', paidAt: { $gte: seriesStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    Store.find(billingFilter('expiring', now))
      .sort({ planExpiresAt: 1 })
      .limit(5)
      .select('storeName slug subscriptionPlan planExpiresAt'),
  ]);

  const planCount = (plan: PaidPlan) => paidByPlan.find((row) => row._id === plan)?.count ?? 0;
  // Monthly recurring revenue: what the currently-entitled stores pay per period.
  const mrr = planCount('STANDARD') * PLAN_PRICES.STANDARD + planCount('PREMIUM') * PLAN_PRICES.PREMIUM;

  const months = Array.from({ length: 6 }, (_, i) => startOfMonth(now, 5 - i));
  const series = months.map((month) => {
    const key = monthKey(month);
    const revenue = revenuePerMonth.find((row) => row._id === key);
    return {
      month: key,
      label: month.toLocaleString('en', { month: 'short' }),
      newStores: storesPerMonth.find((row) => row._id === key)?.count ?? 0,
      planPayments: revenue?.count ?? 0,
      revenue: Number((revenue?.total ?? 0).toFixed(2)),
    };
  });

  return {
    generatedAt: now.toISOString(),
    sellers: {
      accounts: sellerAccounts,
      newThisMonth: sellerAccountsThisMonth,
      suspended: suspendedSellers,
      stores,
      newStoresThisMonth: storesThisMonth,
      onboarded: onboardedStores,
      verified: verifiedStores,
    },
    buyers: { accounts: buyers, newThisMonth: buyersThisMonth },
    subscriptions: {
      paying: paying + expiring,
      expiring,
      lapsed,
      free,
      byPlan: { STANDARD: planCount('STANDARD'), PREMIUM: planCount('PREMIUM') },
      mrr,
      prices: PLAN_PRICES,
      labels: PLAN_LABELS,
      expiringSoon: expiringSoon.map((store) => ({
        storeId: String(store._id),
        storeName: store.storeName,
        slug: store.slug,
        plan: store.subscriptionPlan,
        expiresAt: store.planExpiresAt?.toISOString() ?? null,
      })),
    },
    revenue: {
      allTime: Number((revenueAllTime[0]?.total ?? 0).toFixed(2)),
      thisMonth: Number((revenueThisMonth[0]?.total ?? 0).toFixed(2)),
      pendingPayments,
      failedThisMonth: failedPaymentsThisMonth,
    },
    requests: {
      verification: pendingApplications,
      slides: pendingSlides,
      total: pendingApplications + pendingSlides,
    },
    slides: { live: liveSlides, pending: pendingSlides },
    series,
  };
};

export interface SellerListQuery {
  billing?: BillingStatus | 'all';
  q?: string;
  /** Restrict to these stores — lets another admin screen look up owners for its rows. */
  storeIds?: string[];
  page?: number;
  limit?: number;
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * One row per store, joined with its owner account and billing history —
 * the admin's "who is paying and who isn't" table.
 */
export const listSellers = async (query: SellerListQuery) => {
  const now = new Date();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

  const filter: Record<string, unknown> = {};
  if (query.billing && query.billing !== 'all') {
    Object.assign(filter, billingFilter(query.billing, now));
  }
  if (query.storeIds?.length) {
    filter._id = mongoose.trusted({ $in: query.storeIds.filter((id) => mongoose.isValidObjectId(id)) });
  }

  const needle = query.q?.trim();
  if (needle) {
    const pattern = new RegExp(escapeRegex(needle.slice(0, 80)), 'i');
    // Owners matched by name/email widen the search to their stores.
    const owners = await User.find({ $or: [{ name: pattern }, { email: pattern }] }).select('_id').limit(200);
    const textMatch = {
      $or: [
        { storeName: pattern },
        { slug: pattern },
        { userId: mongoose.trusted({ $in: owners.map((owner) => owner._id) }) },
      ],
    };
    if (filter.$or) {
      // The lapsed bucket already uses $or; combine instead of overwriting it.
      const billingOr = filter.$or;
      delete filter.$or;
      filter.$and = [{ $or: billingOr }, textMatch];
    } else {
      Object.assign(filter, textMatch);
    }
  }

  const [total, stores] = await Promise.all([
    Store.countDocuments(filter),
    Store.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  const storeIds = stores.map((store) => store._id);
  const ownerIds = stores.map((store) => store.userId);

  const [owners, paymentStats, productCounts] = await Promise.all([
    User.find({ _id: mongoose.trusted({ $in: ownerIds }) }).select('name email status role created_at'),
    SubscriptionPayment.aggregate<{
      _id: mongoose.Types.ObjectId;
      totalPaid: number;
      paidCount: number;
      lastPaidAt: Date | null;
      lastAttemptStatus: string;
      lastAttemptAt: Date;
    }>([
      { $match: { storeId: { $in: storeIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$storeId',
          totalPaid: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, '$amount', 0] } },
          paidCount: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] } },
          lastPaidAt: { $max: '$paidAt' },
          lastAttemptStatus: { $first: '$status' },
          lastAttemptAt: { $first: '$createdAt' },
        },
      },
    ]),
    Product.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { sellerId: { $in: storeIds }, status: { $ne: 'ARCHIVED' } } },
      { $group: { _id: '$sellerId', count: { $sum: 1 } } },
    ]),
  ]);

  const ownerById = new Map(owners.map((owner) => [String(owner._id), owner]));
  const statsByStore = new Map(paymentStats.map((row) => [String(row._id), row]));
  const productsByStore = new Map(productCounts.map((row) => [String(row._id), row.count]));

  return {
    sellers: stores.map((store) => {
      const owner = ownerById.get(String(store.userId));
      const stats = statsByStore.get(String(store._id));
      const current = effectivePlan(store);
      return {
        storeId: String(store._id),
        storeName: store.storeName,
        slug: store.slug,
        category: store.category ?? null,
        location: store.location ?? null,
        createdAt: (store as unknown as { createdAt: Date }).createdAt?.toISOString() ?? null,
        onboardingStatus: store.onboardingStatus,
        verificationStatus: store.verificationStatus,
        productCount: productsByStore.get(String(store._id)) ?? 0,
        owner: owner
          ? {
              id: String(owner._id),
              name: owner.name,
              email: owner.email,
              status: owner.status,
              role: owner.role,
              joinedAt: owner.created_at?.toISOString() ?? null,
            }
          : null,
        billing: {
          status: billingStatus(store, now.getTime()),
          plan: store.subscriptionPlan,
          effectivePlan: current,
          planLabel: current === 'STARTER' ? 'Starter' : PLAN_LABELS[current],
          monthlyPrice: current === 'STARTER' ? 0 : PLAN_PRICES[current],
          expiresAt: store.planExpiresAt?.toISOString() ?? null,
          totalPaid: Number((stats?.totalPaid ?? 0).toFixed(2)),
          paidCount: stats?.paidCount ?? 0,
          lastPaidAt: stats?.lastPaidAt?.toISOString() ?? null,
          lastAttemptStatus: stats?.lastAttemptStatus ?? null,
          lastAttemptAt: stats?.lastAttemptAt?.toISOString() ?? null,
        },
      };
    }),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
};

export const listSubscriptionPayments = async (query: { status?: string; page?: number; limit?: number }) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const filter: Record<string, unknown> = {};
  if (query.status && ['PENDING', 'PAID', 'FAILED', 'REFUNDED'].includes(query.status)) {
    filter.status = query.status;
  }

  const [total, payments] = await Promise.all([
    SubscriptionPayment.countDocuments(filter),
    SubscriptionPayment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  const [stores, users] = await Promise.all([
    Store.find({ _id: mongoose.trusted({ $in: payments.map((p) => p.storeId) }) }).select('storeName slug'),
    User.find({ _id: mongoose.trusted({ $in: payments.map((p) => p.userId) }) }).select('name email'),
  ]);
  const storeById = new Map(stores.map((s) => [String(s._id), s]));
  const userById = new Map(users.map((u) => [String(u._id), u]));

  return {
    payments: payments.map((payment) => {
      const store = storeById.get(String(payment.storeId));
      const user = userById.get(String(payment.userId));
      return {
        id: String(payment._id),
        tranId: payment.tranId,
        storeId: String(payment.storeId),
        storeName: store?.storeName ?? 'Deleted store',
        storeSlug: store?.slug ?? null,
        payerName: user?.name ?? null,
        payerEmail: user?.email ?? null,
        plan: payment.plan,
        planLabel: PLAN_LABELS[payment.plan],
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        periodStart: payment.periodStart?.toISOString() ?? null,
        periodEnd: payment.periodEnd?.toISOString() ?? null,
        paidAt: payment.paidAt?.toISOString() ?? null,
        createdAt: payment.createdAt.toISOString(),
      };
    }),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
};

/**
 * Suspend or reinstate an account. Suspension is enforced, not advisory:
 * `authenticate` already rejects non-ACTIVE users, bumping token_version
 * kills access tokens in flight, and revoking refresh tokens stops the
 * session from quietly renewing itself.
 */
export const setUserStatus = async (actorId: string, userId: string, status: UserStatus) => {
  if (!mongoose.isValidObjectId(userId)) {
    throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  }
  if (actorId === userId) {
    throw new AppError(409, 'You cannot change your own account status', 'CANNOT_CHANGE_SELF');
  }
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  if (user.role === 'ADMIN') {
    throw new AppError(403, 'Admin accounts cannot be suspended here', 'FORBIDDEN');
  }

  if (user.status !== status) {
    user.status = status;
    if (status === 'SUSPENDED') {
      user.token_version += 1;
      await RefreshToken.updateMany(
        { user_id: user._id, revoked_at: mongoose.trusted({ $exists: false }) },
        { $set: { revoked_at: new Date() } },
      );
    }
    await user.save();
  }

  return { id: String(user._id), name: user.name, email: user.email, role: user.role, status: user.status };
};
