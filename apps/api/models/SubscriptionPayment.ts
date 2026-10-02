import mongoose, { Document, Model, Schema } from 'mongoose';

export const PAID_PLANS = ['STANDARD', 'PREMIUM'] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

export const SUBSCRIPTION_PAYMENT_STATUSES = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
] as const;
export type SubscriptionPaymentStatus =
  (typeof SUBSCRIPTION_PAYMENT_STATUSES)[number];

/**
 * One attempt to pay for a seller's plan.
 *
 * A record per attempt rather than a few fields on Store, because a store's
 * plan history is the billing history: what was charged, for which period,
 * and whether it actually cleared. Store keeps only the current answer
 * (`subscriptionPlan` + `planExpiresAt`); this is how that answer was reached.
 *
 * `amount` is copied at purchase time on purpose — the same reasoning as order
 * lines. If KhmerCraft later reprices a plan, what a seller already paid must
 * not change with it.
 */
export interface ISubscriptionPayment extends Document {
  storeId: mongoose.Types.ObjectId;
  /** Who paid — the store owner at the time, for an audit trail. */
  userId: mongoose.Types.ObjectId;
  plan: PaidPlan;
  amount: number;
  currency: string;
  status: SubscriptionPaymentStatus;
  /** The ABA transaction this is settled against. */
  tranId: string;
  /**
   * The period this payment buys. Only written once it is PAID — an unpaid
   * attempt has not bought anything, and dating it in advance would make an
   * abandoned QR look like entitlement.
   */
  periodStart?: Date;
  periodEnd?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPaymentSchema = new Schema<ISubscriptionPayment>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: String, enum: PAID_PLANS, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'USD' },
    status: {
      type: String,
      enum: SUBSCRIPTION_PAYMENT_STATUSES,
      required: true,
      default: 'PENDING',
    },
    tranId: { type: String, required: true, unique: true, index: true },
    periodStart: { type: Date },
    periodEnd: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

// A store's billing history, newest first.
SubscriptionPaymentSchema.index({ storeId: 1, createdAt: -1 });

const SubscriptionPaymentModel: Model<ISubscriptionPayment> =
  (mongoose.models.SubscriptionPayment as Model<ISubscriptionPayment>) ||
  mongoose.model<ISubscriptionPayment>(
    'SubscriptionPayment',
    SubscriptionPaymentSchema,
  );

export default SubscriptionPaymentModel;
