import mongoose, { Schema, Document } from 'mongoose';

/**
 * A seller's storefront.
 *
 * Was `Seller.ts` / `mongoose.model('Seller', ...)`. Renamed because it was
 * never actually a "seller" record — seller *identity* (who can sign in, what
 * role they have) lives on `User`; this is the store that identity owns. The
 * collection name (`sellers`) is pinned explicitly below so this rename is a
 * pure code change — no data migration, no downtime.
 */
export interface IStore extends Document {
  userId: mongoose.Types.ObjectId;
  storeName: string;
  /** Unique, human-readable, public identifier — never a raw Mongo id in a URL. */
  slug: string;
  storeDescription?: string;
  storeAvatarUrl?: string;
  storeCoverImages?: string[];
  subscriptionPlan: 'STARTER' | 'STANDARD' | 'PREMIUM';
  paymentMethod?: 'ABA' | 'STRIPE' | 'FREE';
  onboardingStatus: 'PENDING' | 'COMPLETED';
  location?: string;
  phoneNumber?: string;
  /**
   * UNVERIFIED/PENDING until KhmerCraft admin reviews the seller's
   * application (see SellerApplication); only an admin decision moves this
   * to VERIFIED. Nothing about this claims government or legal verification —
   * see `toPublicStore` for the exact wording shown to shoppers.
   */
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED';
  verifiedAt?: Date | null;
  category?: string;
  /** Aggregated from approved reviews; recalculated on every new review. */
  rating: number;
  reviewCount: number;
}

const StoreSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storeName: { type: String, required: true },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    storeDescription: { type: String },
    storeAvatarUrl: { type: String },
    storeCoverImages: { type: [String], default: [] },
    subscriptionPlan: {
      type: String,
      enum: ['STARTER', 'STANDARD', 'PREMIUM'],
      required: true,
      default: 'STARTER',
    },
    paymentMethod: {
      type: String,
      enum: ['ABA', 'STRIPE', 'FREE'],
    },
    onboardingStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED'],
      required: true,
      default: 'PENDING',
    },
    location: { type: String },
    phoneNumber: { type: String },
    verificationStatus: {
      type: String,
      enum: ['UNVERIFIED', 'PENDING', 'VERIFIED'],
      default: 'UNVERIFIED',
    },
    verifiedAt: { type: Date, default: null },
    category: { type: String },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
  },
  { collection: 'sellers', timestamps: true },
);

const Store =
  (mongoose.models.Store as mongoose.Model<IStore> | undefined) ??
  mongoose.model<IStore>('Store', StoreSchema);

export default Store;
