import mongoose, { Document, Schema } from 'mongoose';

export interface IPosRefundItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  refundAmount: number;
  returnToInventory: boolean;
}

export interface IPosRefund extends Document {
  storeId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  refundNumber: string;
  registerId?: mongoose.Types.ObjectId;
  registerName?: string;
  shiftId?: mongoose.Types.ObjectId;
  cashierId: mongoose.Types.ObjectId;
  cashierName: string;
  items: IPosRefundItem[];
  totalRefundAmount: number;
  reason: string;
  refundMethod: 'CASH' | 'KHQR' | 'STORE_CREDIT';
  status: 'COMPLETED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
}

const PosRefundSchema = new Schema<IPosRefund>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, required: true },
    refundNumber: { type: String, required: true, unique: true },
    registerId: { type: Schema.Types.ObjectId, ref: 'PosRegister' },
    registerName: { type: String, default: 'Register 1' },
    shiftId: { type: Schema.Types.ObjectId, ref: 'PosShift', index: true },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cashierName: { type: String, required: true },
    items: [
      {
        _id: false,
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        refundAmount: { type: Number, required: true, min: 0 },
        returnToInventory: { type: Boolean, default: true },
      },
    ],
    totalRefundAmount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    refundMethod: { type: String, enum: ['CASH', 'KHQR', 'STORE_CREDIT'], default: 'CASH' },
    status: { type: String, enum: ['COMPLETED', 'REJECTED'], default: 'COMPLETED' },
  },
  { timestamps: true }
);

export const PosRefund = mongoose.model<IPosRefund>('PosRefund', PosRefundSchema);
export default PosRefund;
