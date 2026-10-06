import mongoose, { Document, Model, Schema } from 'mongoose';

export const PAYOUT_METHODS = ['ABA', 'ACLEDA', 'WING', 'OTHER_BANK'] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export const PAYOUT_ACCOUNT_STATUSES = ['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'] as const;
export type PayoutAccountStatus = (typeof PAYOUT_ACCOUNT_STATUSES)[number];

/**
 * Where KhmerCraft sends a store's earnings. One per store.
 *
 * Every change by the seller puts the account back to PENDING_VERIFICATION:
 * an admin must confirm the new details before money goes to them. That is
 * the guard against someone who takes over a seller login quietly pointing
 * the payouts at their own bank account.
 */
export interface IPayoutAccount extends Document {
  storeId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  method: PayoutMethod;
  /** Required for OTHER_BANK; implied by `method` otherwise. */
  bankName?: string;
  accountName: string;
  accountNumber: string;
  phone?: string;
  /** Optional KHQR the seller shared, so an admin can pay by scanning it. */
  khqrImage?: string;
  status: PayoutAccountStatus;
  verifiedAt?: Date | null;
  verifiedBy?: mongoose.Types.ObjectId | null;
  rejectionReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutAccountSchema = new Schema<IPayoutAccount>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    method: { type: String, enum: PAYOUT_METHODS, required: true },
    bankName: { type: String, trim: true, maxlength: 80 },
    accountName: { type: String, required: true, trim: true, maxlength: 120 },
    accountNumber: { type: String, required: true, trim: true, maxlength: 40 },
    phone: { type: String, trim: true, maxlength: 30 },
    khqrImage: { type: String },
    status: { type: String, enum: PAYOUT_ACCOUNT_STATUSES, default: 'PENDING_VERIFICATION', index: true },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: null },
  },
  { timestamps: true },
);

const PayoutAccount: Model<IPayoutAccount> =
  (mongoose.models.PayoutAccount as Model<IPayoutAccount>) ||
  mongoose.model<IPayoutAccount>('PayoutAccount', PayoutAccountSchema);

export default PayoutAccount;
