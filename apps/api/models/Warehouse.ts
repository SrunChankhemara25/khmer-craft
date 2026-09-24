import mongoose, { Document, Schema } from 'mongoose';

export const WAREHOUSE_TYPES = ['SHOP', 'STORAGE', 'HOME', 'PICKUP_POINT'] as const;
export type WarehouseType = (typeof WAREHOUSE_TYPES)[number];

/**
 * A physical place a seller keeps stock.
 *
 * Most sellers here have exactly one — the shop or room they already work
 * from — so this is deliberately small. It answers one question well: when an
 * order comes in, where does someone go to pick the item, and who do they
 * call when they are standing outside?
 *
 * Address is a province/district/commune hierarchy rather than a postcode,
 * because Cambodian addresses are not reliably postcoded and a courier
 * navigates by the hierarchy plus a landmark.
 *
 * Capacity, shelf codes and stock transfers are deliberately absent. They
 * matter at a scale this marketplace does not have, and every field a seller
 * must fill in for no return today is a reason to abandon onboarding.
 */
export interface IWarehouse extends Document {
  _id: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  name: string;
  type: WarehouseType;
  province: string;
  district?: string;
  commune?: string;
  addressLine?: string;
  /** Landmark or directions — how couriers actually find places here. */
  notes?: string;
  contactName?: string;
  phoneNumber?: string;
  openingHours?: string;
  /** Pre-selected when a seller adds a product. Exactly one per store. */
  isDefault: boolean;
  /** Closed locations stay for order history rather than being deleted. */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseSchema = new Schema<IWarehouse>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    type: { type: String, enum: WAREHOUSE_TYPES, default: 'SHOP' },
    province: { type: String, required: true, trim: true, maxlength: 80 },
    district: { type: String, trim: true, maxlength: 80 },
    commune: { type: String, trim: true, maxlength: 80 },
    addressLine: { type: String, trim: true, maxlength: 200 },
    notes: { type: String, trim: true, maxlength: 300 },
    contactName: { type: String, trim: true, maxlength: 100 },
    phoneNumber: { type: String, trim: true, maxlength: 30 },
    openingHours: { type: String, trim: true, maxlength: 120 },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { collection: 'warehouses', timestamps: true },
);

// Two locations in one store may not share a name: the name is what a seller
// picks from a dropdown when adding a product, and what a picker reads off an
// order, so a duplicate is an invitation to walk to the wrong building.
WarehouseSchema.index({ storeId: 1, name: 1 }, { unique: true });

export default (mongoose.models.Warehouse as mongoose.Model<IWarehouse>) ||
  mongoose.model<IWarehouse>('Warehouse', WarehouseSchema);
