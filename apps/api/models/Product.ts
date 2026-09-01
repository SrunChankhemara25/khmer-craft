import mongoose, { Document, Model, Schema } from 'mongoose';
import { slugify } from '../src/utils/slugify';

export const PRODUCT_STATUSES = ['ACTIVE', 'DRAFT', 'ARCHIVED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  /** Second level of the tree, e.g. Pottery > Bowls & Plates. */
  subcategory?: string;
  /**
   * The Store this listing belongs to. Set from the seller's own Store at
   * creation time (never trusted from the request) — see
   * `catalog.service.ts#createProduct`. Optional because a seller can have a
   * User(role=SELLER) account without having created a Store yet; once every
   * seller is required to have a store before listing, this can become
   * required.
   */
  sellerId?: mongoose.Types.ObjectId;
  /**
   * The seller account that owns this listing, as a User with role SELLER.
   * This is the field ownership checks and order routing key off of — it is
   * always set, unlike `sellerId`.
   */
  sellerUserId?: mongoose.Types.ObjectId;
  sellerName: string;
  storeName?: string;
  location: string;
  image?: string;
  images: string[];
  rating: number;
  reviewCount: number;
  stock: number;
  soldCount: number;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    description: { type: String, default: '', maxlength: 4000 },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    category: { type: String, required: true, trim: true, index: true },
    subcategory: { type: String, trim: true, index: true },

    sellerId: { type: Schema.Types.ObjectId, ref: 'Store' },
    sellerUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    sellerName: { type: String, required: true, trim: true },
    storeName: { type: String, trim: true },
    location: { type: String, default: '', trim: true, index: true },

    image: { type: String },
    images: { type: [String], default: [] },

    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    soldCount: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: PRODUCT_STATUSES,
      default: 'ACTIVE',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Backs the `search` query parameter. Weighted so a name match outranks a
// description match for the same term.
ProductSchema.index(
  { name: 'text', description: 'text', category: 'text', sellerName: 'text' },
  { weights: { name: 10, category: 4, sellerName: 3, description: 1 } },
);

// The list endpoint's common access pattern: active products, newest first.
ProductSchema.index({ status: 1, createdAt: -1 });
// Category landing pages filter on both levels at once.
ProductSchema.index({ category: 1, subcategory: 1 });

const ProductModel: Model<IProduct> =
  (mongoose.models.Product as Model<IProduct>) ||
  mongoose.model<IProduct>('Product', ProductSchema);

export default ProductModel;

// Re-exported so existing callers importing `slugify` from this file keep
// working — the implementation now lives in `src/utils/slugify.ts`, shared
// with the Store model.
export { slugify } from '../src/utils/slugify';
