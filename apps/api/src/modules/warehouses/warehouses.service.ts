import mongoose from 'mongoose';
import Product from '../../../models/Product';
import Warehouse, { IWarehouse } from '../../../models/Warehouse';
import { AppError } from '../../errors/app-error';
import { findOwnedStore } from '../sellers/sellers.service';
import { CreateWarehouseInput, UpdateWarehouseInput } from './warehouses.validation';

const toResponse = (warehouse: IWarehouse) => ({
  id: warehouse._id.toString(),
  name: warehouse.name,
  type: warehouse.type,
  province: warehouse.province,
  district: warehouse.district ?? '',
  commune: warehouse.commune ?? '',
  addressLine: warehouse.addressLine ?? '',
  notes: warehouse.notes ?? '',
  contactName: warehouse.contactName ?? '',
  phoneNumber: warehouse.phoneNumber ?? '',
  openingHours: warehouse.openingHours ?? '',
  isDefault: warehouse.isDefault,
  isActive: warehouse.isActive,
});

/**
 * Ownership runs through findOwnedStore, which throws 404 rather than 403 —
 * a seller poking at another store's id learns nothing about whether it
 * exists. Every function here takes the authenticated user, never a trusted
 * storeId from the client alone.
 */
const ownedWarehouse = async (storeId: string, userId: string, warehouseId: string) => {
  await findOwnedStore(storeId, userId);
  if (!mongoose.isValidObjectId(warehouseId)) {
    throw new AppError(404, 'Location not found', 'WAREHOUSE_NOT_FOUND');
  }
  const warehouse = await Warehouse.findOne({ _id: warehouseId, storeId });
  if (!warehouse) throw new AppError(404, 'Location not found', 'WAREHOUSE_NOT_FOUND');
  return warehouse;
};

/**
 * Checked here rather than left to the unique index alone. The index is the
 * backstop against a race between two requests; this is what produces a
 * useful message, and it does not depend on the index having finished
 * building — which it may not have, on a fresh database.
 */
const assertNameFree = async (
  storeId: string,
  name: string,
  exceptId?: mongoose.Types.ObjectId,
) => {
  const clash = await Warehouse.findOne({
    storeId,
    name: name.trim(),
    ...(exceptId ? { _id: mongoose.trusted({ $ne: exceptId }) } : {}),
  });
  if (clash) {
    throw new AppError(409, 'You already have a location with that name', 'WAREHOUSE_NAME_TAKEN');
  }
};

/** Exactly one default per store, so the product form always has a sensible pick. */
const clearOtherDefaults = async (storeId: string, keepId: mongoose.Types.ObjectId) => {
  await Warehouse.updateMany(
    { storeId, _id: mongoose.trusted({ $ne: keepId }) },
    { $set: { isDefault: false } },
  );
};

export const listWarehouses = async (storeId: string, userId: string) => {
  await findOwnedStore(storeId, userId);
  const warehouses = await Warehouse.find({ storeId }).sort({ isDefault: -1, name: 1 });
  return { warehouses: warehouses.map(toResponse) };
};

export const createWarehouse = async (
  storeId: string,
  userId: string,
  input: CreateWarehouseInput,
) => {
  await findOwnedStore(storeId, userId);

  // The first location a seller creates is their default, whatever they
  // ticked — a store with locations but no default would leave the product
  // form with nothing selected.
  await assertNameFree(storeId, input.name);

  const existing = await Warehouse.countDocuments({ storeId });
  const isDefault = existing === 0 ? true : Boolean(input.isDefault);

  try {
    const warehouse = await Warehouse.create({ ...input, storeId, isDefault });
    if (isDefault) await clearOtherDefaults(storeId, warehouse._id);
    return toResponse(warehouse);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new AppError(409, 'You already have a location with that name', 'WAREHOUSE_NAME_TAKEN');
    }
    throw error;
  }
};

export const updateWarehouse = async (
  storeId: string,
  userId: string,
  warehouseId: string,
  input: UpdateWarehouseInput,
) => {
  const warehouse = await ownedWarehouse(storeId, userId, warehouseId);

  // Turning off the only default would leave the store without one; the way
  // to move a default is to set it on another location.
  if (input.isDefault === false && warehouse.isDefault) {
    throw new AppError(
      400,
      'Set another location as the default instead of removing this one',
      'DEFAULT_WAREHOUSE_REQUIRED',
    );
  }

  if (input.name) await assertNameFree(storeId, input.name, warehouse._id);

  Object.assign(warehouse, input);
  try {
    await warehouse.save();
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new AppError(409, 'You already have a location with that name', 'WAREHOUSE_NAME_TAKEN');
    }
    throw error;
  }
  if (warehouse.isDefault) await clearOtherDefaults(storeId, warehouse._id);
  return toResponse(warehouse);
};

export const deleteWarehouse = async (
  storeId: string,
  userId: string,
  warehouseId: string,
) => {
  const warehouse = await ownedWarehouse(storeId, userId, warehouseId);

  // Deleting a location that still holds stock would leave those products
  // pointing nowhere, and nobody would know where to pick them from. Moving
  // the stock first is the seller's decision, not ours to guess.
  const held = await Product.countDocuments({ warehouseId: warehouse._id });
  if (held > 0) {
    throw new AppError(
      409,
      held === 1
        ? '1 product is still kept here. Move it to another location first.'
        : `${held} products are still kept here. Move them to another location first.`,
      'WAREHOUSE_IN_USE',
    );
  }

  const remaining = await Warehouse.countDocuments({ storeId });
  if (warehouse.isDefault && remaining > 1) {
    throw new AppError(
      400,
      'Make another location the default before deleting this one',
      'DEFAULT_WAREHOUSE_REQUIRED',
    );
  }

  await Warehouse.deleteOne({ _id: warehouse._id });
  return { deleted: true as const };
};
