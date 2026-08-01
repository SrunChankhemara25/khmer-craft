import mongoose, { Document, Model, Schema } from 'mongoose';

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ['COD', 'ABA_DEMO', 'STRIPE_SANDBOX'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Order lines DO copy the price and product details, unlike cart lines.
 *
 * An order is a historical record: if the seller later changes the price or
 * renames the product, what the buyer actually agreed to must not change with
 * it. The values are written from the database at order time, never from the
 * request body.
 */
export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  productImage?: string;
  sellerId?: mongoose.Types.ObjectId;
  sellerName: string;
  storeName?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface IDeliveryInfo {
  fullName: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  note?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  buyerId: mongoose.Types.ObjectId;
  buyerName: string;
  buyerPhone: string;
  items: IOrderItem[];
  deliveryInfo: IDeliveryInfo;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    productImage: { type: String },
    // TODO(seller-branch): populate from Product.sellerId once Seller merges.
    sellerId: { type: Schema.Types.ObjectId, ref: 'Seller' },
    sellerName: { type: String, required: true },
    storeName: { type: String },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const DeliveryInfoSchema = new Schema<IDeliveryInfo>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
  },
  { _id: false },
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    buyerName: { type: String, required: true },
    buyerPhone: { type: String, required: true },

    items: { type: [OrderItemSchema], required: true },
    deliveryInfo: { type: DeliveryInfoSchema, required: true },

    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'PENDING',
      required: true,
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'PENDING',
      required: true,
    },

    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

// "My orders", newest first.
OrderSchema.index({ buyerId: 1, createdAt: -1 });

const OrderModel: Model<IOrder> =
  (mongoose.models.Order as Model<IOrder>) ||
  mongoose.model<IOrder>('Order', OrderSchema);

export default OrderModel;
