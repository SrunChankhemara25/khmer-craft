import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISellerProfile extends Document {
  user_id: mongoose.Types.ObjectId;
  businessName: string;
  category: string;
  description: string;
  created_at: Date;
  updated_at: Date;
}

const SellerProfileSchema = new Schema<ISellerProfile>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, required: true, trim: true },
    description: { type: String, default: '', maxlength: 4000 },
  },
  {
    collection: 'seller_profiles',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

const SellerProfile: Model<ISellerProfile> =
  (mongoose.models.SellerProfile as Model<ISellerProfile> | undefined) ??
  mongoose.model<ISellerProfile>('SellerProfile', SellerProfileSchema);

export default SellerProfile;
