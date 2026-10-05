import { z } from 'zod';

export const createStoreCollectionSchema = z
  .object({
    name: z.string().trim().min(1, 'Collection name is required').max(100),
    description: z.string().trim().max(1000).optional(),
    coverImage: z.string().trim().optional(),
    productIds: z.array(z.string().trim()).optional().default([]),
    visible: z.boolean().optional().default(true),
  })
  .strict();

export type CreateStoreCollectionInput = z.infer<typeof createStoreCollectionSchema>;

export const updateStoreCollectionSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    coverImage: z.string().trim().optional().nullable(),
    productIds: z.array(z.string().trim()).optional(),
    visible: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict();

export type UpdateStoreCollectionInput = z.infer<typeof updateStoreCollectionSchema>;
