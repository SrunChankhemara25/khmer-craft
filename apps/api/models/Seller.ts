import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface ISeller extends Document {
  name: string;
  email: string;
  password?: string;
  storeName: string;
  storeDescription?: string;
  storeAvatarUrl?: string;
  storeCoverImages?: string[];
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const SellerSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, 
    storeName: { type: String, required: true },
    storeDescription: { type: String },
    storeAvatarUrl: { type: String },
    storeCoverImages: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Hash password before saving
SellerSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare passwords
SellerSchema.methods.comparePassword = async function (candidatePassword: string) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.Seller || mongoose.model<ISeller>('Seller', SellerSchema);
