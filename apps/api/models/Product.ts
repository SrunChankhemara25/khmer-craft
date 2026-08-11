import mongoose, { Document, Model, Schema } from 'mongoose';

export const PRODUCT_STATUSES = ['ACTIVE', 'DRAFT', 'ARCHIVED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  /**
   * TODO(seller-branch): `sellerId` matches the Seller model on
   * origin/prototype and is left untouched for that developer. It stays
   * optional and unused here.
   */
  sellerId?: mongoose.Types.ObjectId;
  /**
   * The seller account that owns this listing, as a User with role SELLER.
   *
   * This exists because seller identity currently lives in two places: the
   * Seller collection on origin/prototype, which has no working login, and
   * User(role=SELLER), which does. Order routing needs a seller who can
   * actually authenticate, so it points here for now.
   *
   * TODO(seller-branch): collapse into a single link once the two branches
   * agree on which collection owns a seller.
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

    sellerId: { type: Schema.Types.ObjectId, ref: 'Seller' },
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

const ProductModel: Model<IProduct> =
  (mongoose.models.Product as Model<IProduct>) ||
  mongoose.model<IProduct>('Product', ProductSchema);

export default ProductModel;

/** Derive a URL slug from a product name. */
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
