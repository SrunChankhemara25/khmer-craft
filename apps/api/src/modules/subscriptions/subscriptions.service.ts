import mongoose from 'mongoose';
import Store, { IStore } from '../../../models/Store';
import SubscriptionPayment, {
  PaidPlan,
} from '../../../models/SubscriptionPayment';
import { IUser } from '../../../models/User';
import { AppError } from '../../errors/app-error';
import { env } from '../../config/env';
import * as payway from '../payments/payway.gateway';

/**
 * Seller plan billing.
 *
 * ABA cannot auto-charge on this merchant account — it is KHQR-only, with no
 * card tokenisation — so there is no true recurring subscription to build.
 * A plan is therefore sold as a fixed period the seller renews by hand, and
 * lapsing is handled by reading rather than by a scheduler: see
 * `effectivePlan`.
 */

/**
 * Plan prices, in USD per period. These mirror the published pricing page
 * (apps/web/.../seller-pricing.ts) and are the server's copy on purpose — a
 * price must never arrive in a request body.
 */
export const PLAN_PRICES: Record<PaidPlan, number> = {
  STANDARD: 12,
  PREMIUM: 29,
};

export const PLAN_LABELS: Record<PaidPlan, string> = {
  STANDARD: 'Growth',
  PREMIUM: 'Professional',
};

/** How long one payment entitles a store to its plan. */
export const PLAN_PERIOD_DAYS = 30;

const addDays = (from: Date, days: number) =>
  new Date(from.getTime() + days * 24 * 60 * 60 * 1000);

/**
 * The plan a store is actually entitled to right now.
 *
 * `subscriptionPlan` alone is not the answer: it records what was bought,
 * and a lapsed paid plan has to read as STARTER without anything having run
 * in the meantime. Every feature gate should ask this, never the raw field.
 */
export const effectivePlan = (store: IStore): IStore['subscriptionPlan'] => {
  if (store.subscriptionPlan === 'STARTER') {
    return 'STARTER';
  }
  if (!store.planExpiresAt || store.planExpiresAt.getTime() <= Date.now()) {
    return 'STARTER';
  }
  return store.subscriptionPlan;
};

const loadOwnedStore = async (
  user: IUser,
  storeId: string,
): Promise<InstanceType<typeof Store>> => {
  if (!mongoose.isValidObjectId(storeId)) {
    throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND');
  }
  const store = await Store.findById(storeId);
  // A store nobody owns is indistinguishable from one owned by someone else,
  // on purpose: neither should confirm that a given store id exists.
  if (!store || String(store.userId) !== String(user._id)) {
    throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND');
  }
  return store;
};

export interface SubscriptionView {
  storeId: string;
  storeName: string;
  /** What was bought — may already have lapsed. */
  plan: IStore['subscriptionPlan'];
  /** What the store is entitled to right now. */
  effectivePlan: IStore['subscriptionPlan'];
  expiresAt: string | null;
  active: boolean;
  /** Prices so the UI never hardcodes them. */
  prices: Record<PaidPlan, number>;
  periodDays: number;
}

const toView = (store: InstanceType<typeof Store>): SubscriptionView => ({
  storeId: String(store._id),
  storeName: store.storeName,
  plan: store.subscriptionPlan,
  effectivePlan: effectivePlan(store),
  expiresAt: store.planExpiresAt ? store.planExpiresAt.toISOString() : null,
  active: effectivePlan(store) !== 'STARTER',
  prices: PLAN_PRICES,
  periodDays: PLAN_PERIOD_DAYS,
});

export const getSubscription = async (
  user: IUser,
  storeId: string,
): Promise<SubscriptionView> => toView(await loadOwnedStore(user, storeId));

export interface PlanCheckout extends payway.PaywayTransaction {
  paymentId: string;
  storeId: string;
  plan: PaidPlan;
  planLabel: string;
  periodDays: number;
}

/**
 * Opens an ABA transaction for a plan and returns the KHQR that buys it.
 *
 * Nothing about the store changes here. The plan is granted only in
 * `resolvePayment`, once ABA confirms the money arrived — so an abandoned QR
 * leaves the seller exactly where they were, on their current plan.
 */
export const createPlanCheckout = async (
  user: IUser,
  storeId: string,
  plan: PaidPlan,
): Promise<PlanCheckout> => {
  const store = await loadOwnedStore(user, storeId);
  const amount = PLAN_PRICES[plan];
  const tranId = payway.generateTranId();

  const payment = await SubscriptionPayment.create({
    storeId: store._id,
    userId: user._id,
    plan,
    amount,
    currency: payway.PAYWAY_CURRENCY,
    status: 'PENDING',
    tranId,
  });

  const successUrl = `${env.webUrl}/seller/billing?store=${encodeURIComponent(String(store._id))}&paid=1`;

  try {
    const transaction = await payway.createTransaction({
      tranId,
      amount,
      items: [
        {
          name: `KhmerCraft ${PLAN_LABELS[plan]} plan — ${PLAN_PERIOD_DAYS} days`,
          quantity: 1,
          price: amount,
        },
      ],
      firstName: user.name,
      phone: store.phoneNumber ?? user.phone ?? '',
      returnParams: String(payment._id),
      successUrl,
      cancelUrl: `${env.webUrl}/seller/billing?store=${encodeURIComponent(String(store._id))}`,
    });

    return {
      ...transaction,
      paymentId: String(payment._id),
      storeId: String(store._id),
      plan,
      planLabel: PLAN_LABELS[plan],
      periodDays: PLAN_PERIOD_DAYS,
    };
  } catch (error) {
    // ABA refused to open the transaction, so this attempt can never be paid.
    // Dropping it keeps the billing history to real attempts rather than rows
    // that were never payable.
    await SubscriptionPayment.deleteOne({ _id: payment._id });
    throw error;
  }
};

/**
 * Asks ABA what happened to a plan payment and, if it cleared, grants the
 * plan. The single place a subscription is ever activated.
 *
 * Renewing early extends rather than restarts: the new period runs from the
 * current expiry when the plan is still live, so a seller is never punished
 * for paying before they had to.
 */
const resolvePayment = async (
  payment: InstanceType<typeof SubscriptionPayment>,
): Promise<void> => {
  if (payment.status === 'PAID') {
    return;
  }

  const status = await payway.checkTransaction(payment.tranId);
  if (status === 'PENDING' || status === payment.status) {
    return;
  }

  if (status !== 'PAID') {
    payment.status = status;
    await payment.save();
    return;
  }

  const store = await Store.findById(payment.storeId);
  if (!store) {
    // The store was removed between paying and confirming. Record the payment
    // truthfully rather than silently dropping it; a refund is a human call.
    payment.status = 'PAID';
    payment.paidAt = new Date();
    await payment.save();
    console.warn(
      '[payway] plan paid for a store that no longer exists:',
      String(payment.storeId),
    );
    return;
  }

  const now = new Date();
  const samePlanStillLive =
    store.subscriptionPlan === payment.plan &&
    store.planExpiresAt !== undefined &&
    store.planExpiresAt !== null &&
    store.planExpiresAt.getTime() > now.getTime();
  const periodStart = samePlanStillLive ? store.planExpiresAt! : now;
  const periodEnd = addDays(periodStart, PLAN_PERIOD_DAYS);

  payment.status = 'PAID';
  payment.paidAt = now;
  payment.periodStart = periodStart;
  payment.periodEnd = periodEnd;
  await payment.save();

  store.subscriptionPlan = payment.plan;
  store.planExpiresAt = periodEnd;
  store.paymentMethod = 'ABA';
  await store.save();
};

export interface PlanPaymentStatusView {
  paymentId: string;
  plan: PaidPlan;
  status: InstanceType<typeof SubscriptionPayment>['status'];
  paid: boolean;
  expiresAt: string | null;
  subscription: SubscriptionView;
}

/** What the plan payment page polls while the seller is in the ABA app. */
export const getPlanPaymentStatus = async (
  user: IUser,
  paymentId: string,
): Promise<PlanPaymentStatusView> => {
  if (!mongoose.isValidObjectId(paymentId)) {
    throw new AppError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
  }
  const payment = await SubscriptionPayment.findById(paymentId);
  if (!payment || String(payment.userId) !== String(user._id)) {
    throw new AppError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
  }

  await resolvePayment(payment);

  const store = await loadOwnedStore(user, String(payment.storeId));

  return {
    paymentId: String(payment._id),
    plan: payment.plan,
    status: payment.status,
    paid: payment.status === 'PAID',
    expiresAt: payment.periodEnd ? payment.periodEnd.toISOString() : null,
    subscription: toView(store),
  };
};

/**
 * Settles a plan payment from PayWay's webhook. Returns whether the tran_id
 * belonged to a subscription at all, so the shared callback handler knows
 * whether to keep looking.
 */
export const resolveByTranId = async (tranId: string): Promise<boolean> => {
  const payment = await SubscriptionPayment.findOne({ tranId });
  if (!payment) {
    return false;
  }
  await resolvePayment(payment);
  return true;
};

/** A store's billing history, newest first. */
export const listPayments = async (user: IUser, storeId: string) => {
  const store = await loadOwnedStore(user, storeId);
  const payments = await SubscriptionPayment.find({ storeId: store._id })
    .sort({ createdAt: -1 })
    .limit(50);

  return {
    subscription: toView(store),
    payments: payments.map((payment) => ({
      id: String(payment._id),
      plan: payment.plan,
      planLabel: PLAN_LABELS[payment.plan],
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      periodEnd: payment.periodEnd ? payment.periodEnd.toISOString() : null,
      createdAt: payment.createdAt.toISOString(),
    })),
  };
};
