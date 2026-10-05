import mongoose, { Document, Schema } from 'mongoose';

export interface ICashMovement {
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  amount: number;
  reason: string;
  timestamp: Date;
  cashierName?: string;
}

export interface IPosShift extends Document {
  storeId: mongoose.Types.ObjectId;
  sellerUserId: mongoose.Types.ObjectId;
  registerId?: mongoose.Types.ObjectId;
  registerName: string;
  cashierId: mongoose.Types.ObjectId;
  cashierName: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: Date;
  closedAt?: Date;
  startingCash: number;
  cashSales: number;
  khqrSales: number;
  totalSales: number;
  cashIn: number;
  cashOut: number;
  refundsTotal: number;
  returnsCount: number;
  voidsCount: number;
  expectedCash: number;
  actualCash?: number;
  variance?: number;
  notes?: string;
  cashMovements: ICashMovement[];
  orderIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const PosShiftSchema = new Schema<IPosShift>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    sellerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    registerId: { type: Schema.Types.ObjectId, ref: 'PosRegister', index: true },
    registerName: { type: String, default: 'Main Register' },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cashierName: { type: String, required: true },
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN', index: true },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    startingCash: { type: Number, default: 0, min: 0 },
    cashSales: { type: Number, default: 0 },
    khqrSales: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    cashIn: { type: Number, default: 0 },
    cashOut: { type: Number, default: 0 },
    refundsTotal: { type: Number, default: 0 },
    returnsCount: { type: Number, default: 0 },
    voidsCount: { type: Number, default: 0 },
    expectedCash: { type: Number, default: 0 },
    actualCash: { type: Number },
    variance: { type: Number },
    notes: { type: String },
    cashMovements: [
      {
        _id: false,
        type: { type: String, enum: ['IN', 'OUT', 'ADJUSTMENT'], required: true },
        amount: { type: Number, required: true },
        reason: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        cashierName: { type: String },
      },
    ],
    orderIds: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
  },
  { timestamps: true }
);

export const PosShift = mongoose.model<IPosShift>('PosShift', PosShiftSchema);
export default PosShift;
