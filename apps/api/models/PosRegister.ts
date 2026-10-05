import mongoose, { Document, Schema } from 'mongoose';

export interface IPosRegister extends Document {
  storeId: mongoose.Types.ObjectId;
  name: string;
  registerNumber: string;
  location: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  currentShiftId?: mongoose.Types.ObjectId;
  currentCashierId?: mongoose.Types.ObjectId;
  settings: {
    receiptHeader?: string;
    receiptFooter?: string;
    defaultTaxRate: number;
    allowCash: boolean;
    allowKhqr: boolean;
    autoPrintReceipt: boolean;
    requireCustomer: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PosRegisterSchema = new Schema<IPosRegister>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: true, trim: true },
    registerNumber: { type: String, required: true, trim: true },
    location: { type: String, default: 'Main Counter', trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'], default: 'ACTIVE' },
    currentShiftId: { type: Schema.Types.ObjectId, ref: 'PosShift' },
    currentCashierId: { type: Schema.Types.ObjectId, ref: 'User' },
    settings: {
      receiptHeader: { type: String, default: 'Thank you for supporting Cambodian artisans!' },
      receiptFooter: { type: String, default: 'Goods sold can be exchanged within 7 days with valid receipt.' },
      defaultTaxRate: { type: Number, default: 0, min: 0, max: 100 },
      allowCash: { type: Boolean, default: true },
      allowKhqr: { type: Boolean, default: true },
      autoPrintReceipt: { type: Boolean, default: false },
      requireCustomer: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

PosRegisterSchema.index({ storeId: 1, registerNumber: 1 }, { unique: true });

export const PosRegister = mongoose.model<IPosRegister>('PosRegister', PosRegisterSchema);
export default PosRegister;
