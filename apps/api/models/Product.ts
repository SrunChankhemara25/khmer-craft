import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  title: string;
  price: number;
  category: string;
  images: string[];
  description?: string;
  sellerId: mongoose.Types.ObjectId;
  rating: number;
  stockCount: number;
}

const ProductSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    images: { type: [String], required: true },
    description: { type: String },
    sellerId: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
    rating: { type: Number, default: 0 },
    stockCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
