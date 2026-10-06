import mongoose, { Schema, Document } from 'mongoose';

export interface IPromotionCampaign extends Document {
  title: string;
  theme: 'pchum-ben' | 'water-festival' | 'khmer-new-year' | 'local-pride' | 'general';
  kicker: string;
  description: string;
  bannerImage?: string;
  startDate: Date;
  endDate: Date;
  isFree: boolean;
  freeDays: number;
  dailyRate: number;
  status: 'ACTIVE' | 'ARCHIVED' | 'UPCOMING';
  createdAt: Date;
  updatedAt: Date;
}

const PromotionCampaignSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    theme: {
      type: String,
      enum: ['pchum-ben', 'water-festival', 'khmer-new-year', 'local-pride', 'general'],
      default: 'pchum-ben',
    },
    kicker: { type: String, default: 'SEASONAL SPECIAL' },
    description: { type: String, required: true },
    bannerImage: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isFree: { type: Boolean, default: true },
    freeDays: { type: Number, default: 7 },
    dailyRate: { type: Number, default: 3, min: 0 },
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED', 'UPCOMING'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

export const SLIDE_PLACEMENTS = ['HERO', 'BRAND_ADS'] as const;
export type SlidePlacement = (typeof SLIDE_PLACEMENTS)[number];

export const SLIDE_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'PAUSED',
  'REJECTED',
  'EXPIRED',
] as const;
export type SlideStatus = (typeof SLIDE_STATUSES)[number];

/**
 * One homepage slide.
 *
 * Two kinds share this collection: seller-requested slides (owned by a store,
 * reviewed by an admin) and KhmerCraft "house" slides an admin creates
 * directly. A house slide has no store and no seller, which is why those
 * fields are optional — `isHouse` is the switch, not their absence.
 *
 * `placement` picks the carousel: HERO is the full-width banner at the top of
 * the homepage, BRAND_ADS the featured-brands rail further down. Within a
 * placement, `sortOrder` ascending decides the order shoppers see.
 */
export interface IPromotionSlide extends Document {
  isHouse: boolean;
  placement: SlidePlacement;
  sortOrder: number;
  storeId?: mongoose.Types.ObjectId;
  storeName: string;
  storeSlug?: string;
  sellerUserId?: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  campaignTitle?: string;
  theme: string;
  badge: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  targetType: 'STORE' | 'PRODUCT';
  targetId: string;
  targetUrl: string;
  buttonText: string;
  startDate: Date;
  endDate: Date;
  days: number;
  freeDays: number;
  billableDays: number;
  dailyRate: number;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: Date;
  status: SlideStatus;
  rejectionReason?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSlideSchema: Schema = new Schema(
  {
    isHouse: { type: Boolean, default: false },
    placement: { type: String, enum: SLIDE_PLACEMENTS, default: 'BRAND_ADS', index: true },
    sortOrder: { type: Number, default: 0 },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: function (this: IPromotionSlide) { return !this.isHouse; } },
    storeName: { type: String, required: true },
    storeSlug: { type: String },
    sellerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: function (this: IPromotionSlide) { return !this.isHouse; } },
    campaignId: { type: Schema.Types.ObjectId, ref: 'PromotionCampaign' },
    campaignTitle: { type: String },
    theme: { type: String, default: 'pchum-ben' },
    badge: { type: String, default: 'FEATURED' },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    targetType: { type: String, enum: ['STORE', 'PRODUCT'], default: 'STORE' },
    targetId: { type: String, required: true },
    targetUrl: { type: String, required: true },
    buttonText: { type: String, default: 'Explore Now' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true, min: 1 },
    freeDays: { type: Number, default: 7 },
    billableDays: { type: Number, default: 0 },
    dailyRate: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    status: {
      type: String,
      enum: SLIDE_STATUSES,
      default: 'PENDING_APPROVAL',
    },
    rejectionReason: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

// The homepage query: live slides for one carousel, in display order.
PromotionSlideSchema.index({ placement: 1, status: 1, sortOrder: 1 });

export const PromotionCampaign = mongoose.model<IPromotionCampaign>(
  'PromotionCampaign',
  PromotionCampaignSchema
);

export const PromotionSlide = mongoose.model<IPromotionSlide>(
  'PromotionSlide',
  PromotionSlideSchema
);
