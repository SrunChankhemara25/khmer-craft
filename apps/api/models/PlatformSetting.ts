import mongoose, { Document, Model, Schema } from 'mongoose';

export const PAYOUT_SCHEDULES = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const;
export type PayoutSchedule = (typeof PAYOUT_SCHEDULES)[number];

/**
 * Marketplace-wide money rules an admin can change without a deploy.
 * A single document, keyed 'platform'.
 *
 * Changing the commission rate only affects payouts created afterwards —
 * each payout stores the rate it was calculated with.
 */
export interface IPlatformSetting extends Document {
  key: 'platform';
  /** Percent of the product subtotal KhmerCraft keeps, e.g. 3 for 3%. */
  commissionRate: number;
  payoutSchedule: PayoutSchedule;
  /** 0 = Sunday … 6 = Saturday; the weekday payouts go out on. */
  payoutWeekday: number;
  /** Days after delivery before an order's money can be paid out (returns window). */
  holdDays: number;
  /** A balance below this waits for the next cycle. */
  minimumPayout: number;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const PlatformSettingSchema = new Schema<IPlatformSetting>(
  {
    key: { type: String, enum: ['platform'], default: 'platform', unique: true },
    commissionRate: { type: Number, default: 3, min: 0, max: 50 },
    payoutSchedule: { type: String, enum: PAYOUT_SCHEDULES, default: 'WEEKLY' },
    payoutWeekday: { type: Number, default: 5, min: 0, max: 6 },
    holdDays: { type: Number, default: 7, min: 0, max: 60 },
    minimumPayout: { type: Number, default: 10, min: 0 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

const PlatformSetting: Model<IPlatformSetting> =
  (mongoose.models.PlatformSetting as Model<IPlatformSetting>) ||
  mongoose.model<IPlatformSetting>('PlatformSetting', PlatformSettingSchema);

export default PlatformSetting;
