import { z } from 'zod';
import { WAREHOUSE_TYPES } from '../../../models/Warehouse';

const text = (max: number) => z.string().trim().max(max);

export const createWarehouseSchema = z
  .object({
    name: z.string().trim().min(2, 'Give this location a name').max(80),
    type: z.enum(WAREHOUSE_TYPES).optional(),
    province: z.string().trim().min(2, 'Province is required').max(80),
    district: text(80).optional(),
    commune: text(80).optional(),
    addressLine: text(200).optional(),
    notes: text(300).optional(),
    contactName: text(100).optional(),
    phoneNumber: text(30).optional(),
    openingHours: text(120).optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

/** Every field optional — renaming a location shouldn't resend the address. */
export const updateWarehouseSchema = createWarehouseSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  });

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
