import mongoose, { Document, Schema } from 'mongoose';

export interface ICaseMessage {
  senderRole: 'SELLER' | 'ADMIN' | 'SUPPORT';
  senderName: string;
  text: string;
  createdAt: Date;
}

export interface ISupportCase extends Document {
  storeId: mongoose.Types.ObjectId;
  sellerUserId: mongoose.Types.ObjectId;
  caseNumber: string;
  subject: string;
  category: 'ORDER' | 'MODERATION' | 'BILLING' | 'ADVERTISEMENT' | 'TECHNICAL' | 'OTHER';
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_SELLER' | 'RESOLVED' | 'CLOSED';
  messages: ICaseMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const SupportCaseSchema = new Schema<ISupportCase>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    sellerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    caseNumber: { type: String, required: true, unique: true },
    subject: { type: String, required: true },
    category: {
      type: String,
      enum: ['ORDER', 'MODERATION', 'BILLING', 'ADVERTISEMENT', 'TECHNICAL', 'OTHER'],
      default: 'OTHER',
    },
    description: { type: String, required: true },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_SELLER', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
    },
    messages: [
      {
        senderRole: { type: String, enum: ['SELLER', 'ADMIN', 'SUPPORT'], required: true },
        senderName: { type: String, required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const SupportCase = mongoose.model<ISupportCase>('SupportCase', SupportCaseSchema);
export default SupportCase;
