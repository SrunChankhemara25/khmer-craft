import mongoose, { Document, Model, Schema } from 'mongoose';
import { PayoutMethod } from './PayoutAccount';

export const SELLER_PAYOUT_STATUSES = ['PENDING', 'PAID', 'CANCELLED'] as const;
export type SellerPayoutStatus = (typeof SELLER_PAYOUT_STATUSES)[number];

/**
 * One settlement line: what a single order contributes to a payout.
 *
 * `net` is signed. An online order KhmerCraft collected the money for is
 * positive (the seller's share after commission). A cash-on-delivery order is
 * negative: the seller already holds the cash, so only the commission they
 * owe KhmerCraft moves, and it comes off the payout.
 */
export interface IPayoutLine {
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  paymentMethod: string;
  collectedBy: 'KHMERCRAFT' | 'SELLER';
  deliveredAt: Date;
  gross: number;
  refunded: number;
  commission: number;
  net: number;
}

/**
 * Money KhmerCraft sends a store. Lines and account are snapshots taken when
 * the payout is created, so a later change to an order or to the seller's
 * bank details cannot rewrite what this payout was for or where it went.
 *
 * An order belongs to at most one PENDING or PAID payout — that is what stops
 * it being paid twice. Cancelling a payout releases its orders back to the
 * store's balance.
 */
export interface ISellerPayout extends Document {
  payoutNumber: string;
  storeId: mongoose.Types.ObjectId;
  storeName: string;
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  commissionRate: number;
  grossSales: number;
  commissionTotal: number;
  lines: IPayoutLine[];
  orderIds: mongoose.Types.ObjectId[];
  account: {
    method: PayoutMethod;
    bankName?: string;
    accountName: string;
    accountNumber: string;
  };
  status: SellerPayoutStatus;
  createdBy: mongoose.Types.ObjectId;
  /** Bank / ABA transaction reference of the transfer. */
  reference?: string;
  /** The uploaded transfer receipt (image or PDF data URL). */
  proofUrl?: string;
  note?: string;
  paidAt?: Date;
  paidBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutLineSchema = new Schema<IPayoutLine>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    collectedBy: { type: String, enum: ['KHMERCRAFT', 'SELLER'], required: true },
    deliveredAt: { type: Date, required: true },
    gross: { type: Number, required: true },
    refunded: { type: Number, default: 0 },
    commission: { type: Number, required: true },
    net: { type: Number, required: true },
  },
  { _id: false },
);

const SellerPayoutSchema = new Schema<ISellerPayout>(
  {
    payoutNumber: { type: String, required: true, unique: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    storeName: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    commissionRate: { type: Number, required: true },
    grossSales: { type: Number, required: true },
    commissionTotal: { type: Number, required: true },
    lines: { type: [PayoutLineSchema], default: [] },
    orderIds: { type: [Schema.Types.ObjectId], default: [], index: true },
    account: {
      type: new Schema(
        {
          method: { type: String, required: true },
          bankName: { type: String },
          accountName: { type: String, required: true },
          accountNumber: { type: String, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    status: { type: String, enum: SELLER_PAYOUT_STATUSES, default: 'PENDING', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reference: { type: String, trim: true, maxlength: 120 },
    proofUrl: { type: String },
    note: { type: String, trim: true, maxlength: 500 },
    paidAt: { type: Date },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

SellerPayoutSchema.index({ storeId: 1, createdAt: -1 });

const SellerPayout: Model<ISellerPayout> =
  (mongoose.models.SellerPayout as Model<ISellerPayout>) ||
  mongoose.model<ISellerPayout>('SellerPayout', SellerPayoutSchema);

export default SellerPayout;
