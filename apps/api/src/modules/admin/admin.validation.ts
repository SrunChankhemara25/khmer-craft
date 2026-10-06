import { z } from 'zod';

export const setUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  reason: z.string().trim().max(500).optional(),
});
