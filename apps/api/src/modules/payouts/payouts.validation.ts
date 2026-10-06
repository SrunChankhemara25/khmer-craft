import { z } from 'zod';
import { PAYOUT_METHODS } from '../../../models/PayoutAccount';
import { PAYOUT_SCHEDULES } from '../../../models/PlatformSetting';

/** Uploaded image as a data URL — there is no separate file host in this deployment. */
const imageData = z
  .string()
  .max(5_000_000, 'That file is too large (5 MB max)')
  .regex(/^data:image\/(png|jpe?g|webp);base64,/i, 'Upload a PNG, JPG or WebP image');

/** A transfer receipt: an image or a PDF exported from the banking app. */
const receiptData = z
  .string()
  .max(5_000_000, 'That file is too large (5 MB max)')
  .regex(/^data:(image\/(png|jpe?g|webp)|application\/pdf);base64,/i, 'Upload the receipt as an image or PDF');

export const payoutAccountSchema = z.object({
  method: z.enum(PAYOUT_METHODS),
  bankName: z.string().trim().max(80).optional(),
  accountName: z.string().trim().min(2, 'Enter the name on the account').max(120),
  accountNumber: z
    .string()
    .trim()
    .min(4, 'Enter the account number')
    .max(40)
    .regex(/^[0-9 -]+$/, 'Use digits only'),
  phone: z.string().trim().max(30).optional(),
  khqrImage: imageData.nullable().optional(),
});

export const settingsSchema = z
  .object({
    commissionRate: z.number().min(0).max(50),
    payoutSchedule: z.enum(PAYOUT_SCHEDULES),
    payoutWeekday: z.number().int().min(0).max(6),
    holdDays: z.number().int().min(0).max(60),
    minimumPayout: z.number().min(0).max(10_000),
  })
  .partial();

export const reviewAccountSchema = z
  .object({
    status: z.enum(['VERIFIED', 'REJECTED']),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((body) => body.status !== 'REJECTED' || !!body.reason, {
    message: 'Tell the seller what to fix',
    path: ['reason'],
  });

export const markPaidSchema = z.object({
  reference: z.string().trim().max(120).optional(),
  proofUrl: receiptData,
  note: z.string().trim().max(500).optional(),
});

export const createPayoutSchema = z.object({
  storeId: z.string().min(1),
  /** Present = the transfer was already sent; record it as paid now. */
  paid: markPaidSchema.optional(),
});

export const cancelPayoutSchema = z.object({
  reason: z.string().trim().min(3, 'Give a reason').max(500),
});
