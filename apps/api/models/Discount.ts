import mongoose, { Document, Schema } from 'mongoose';

export interface IDiscount extends Document {
  storeId: mongoose.Types.ObjectId;
  sellerUserId: mongoose.Types.ObjectId;
  name: string;
  code?: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  appliesTo: 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS';
  productIds: mongoose.Types.ObjectId[];
  startDate: Date;
  endDate: Date;
  status: 'DRAFT' | 'ACTIVE' | 'SCHEDULED' | 'EXPIRED';
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DiscountSchema = new Schema<IDiscount>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    sellerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, uppercase: true, trim: true },
    type: { type: String, enum: ['PERCENTAGE', 'FIXED'], default: 'PERCENTAGE' },
    value: { type: Number, required: true, min: 0 },
    appliesTo: { type: String, enum: ['ALL_PRODUCTS', 'SPECIFIC_PRODUCTS'], default: 'ALL_PRODUCTS' },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['DRAFT', 'ACTIVE', 'SCHEDULED', 'EXPIRED'], default: 'ACTIVE' },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Discount = mongoose.model<IDiscount>('Discount', DiscountSchema);
export default Discount;
