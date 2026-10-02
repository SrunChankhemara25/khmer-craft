import { z } from 'zod';

export const createPlanCheckoutSchema = z
  .object({
    storeId: z.string().trim().min(1),
    // STARTER is deliberately absent: it is free, so there is nothing to pay
    // for, and accepting it here would mint a $0 transaction ABA would reject.
    plan: z.enum(['STANDARD', 'PREMIUM']),
  })
  .strict();

export type CreatePlanCheckoutInput = z.infer<typeof createPlanCheckoutSchema>;
