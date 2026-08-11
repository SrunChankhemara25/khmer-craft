import mongoose, { Schema, Document } from 'mongoose';

export interface ISellerApplication extends Document {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  province: string;
  primaryCategory: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const SellerApplicationSchema: Schema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    province: { type: String, required: true },
    primaryCategory: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

export default mongoose.models.SellerApplication ||
  mongoose.model<ISellerApplication>('SellerApplication', SellerApplicationSchema);
