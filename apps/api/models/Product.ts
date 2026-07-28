import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  title: string;
  price: number;
  category: string;
  image: string;
}

const ProductSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
