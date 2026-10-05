import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IStoreCollection extends Document {
  storeId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  coverImage?: string;
  productIds: Types.ObjectId[];
  visible: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const StoreCollectionSchema = new Schema<IStoreCollection>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    coverImage: { type: String, trim: true },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    visible: { type: Boolean, default: true },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

StoreCollectionSchema.index({ storeId: 1, slug: 1 }, { unique: true });
StoreCollectionSchema.index({ storeId: 1, sortOrder: 1 });

const StoreCollection: Model<IStoreCollection> =
  mongoose.models.StoreCollection ||
  mongoose.model<IStoreCollection>('StoreCollection', StoreCollectionSchema);

export default StoreCollection;
