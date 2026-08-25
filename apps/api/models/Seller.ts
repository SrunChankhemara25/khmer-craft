import mongoose, { Schema, Document } from 'mongoose';

export interface ISeller extends Document {
  userId: mongoose.Types.ObjectId;
  storeName: string;
  storeDescription?: string;
  storeAvatarUrl?: string;
  storeCoverImages?: string[];
  subscriptionPlan: 'STARTER' | 'STANDARD' | 'PREMIUM';
  paymentMethod?: 'ABA' | 'STRIPE' | 'FREE';
  onboardingStatus: 'PENDING' | 'COMPLETED';
  location?: string;
  phoneNumber?: string;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED';
  category?: string;
}

const SellerSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storeName: { type: String, required: true },
    storeDescription: { type: String },
    storeAvatarUrl: { type: String },
    storeCoverImages: { type: [String], default: [] },
    subscriptionPlan: {
      type: String,
      enum: ['STARTER', 'STANDARD', 'PREMIUM'],
      required: true,
      default: 'STARTER'
    },
    paymentMethod: {
      type: String,
      enum: ['ABA', 'STRIPE', 'FREE']
    },
    onboardingStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED'],
      required: true,
      default: 'PENDING'
    },
    location: { type: String },
    phoneNumber: { type: String },
    verificationStatus: {
      type: String,
      enum: ['UNVERIFIED', 'PENDING', 'VERIFIED'],
      default: 'UNVERIFIED'
    },
    category: { type: String }
  },
  { timestamps: true }
);

export default mongoose.models.Seller || mongoose.model<ISeller>('Seller', SellerSchema);
