import { z } from 'zod';
import { SLIDE_PLACEMENTS } from '../../../models/Promotion';

/** Hosted URL, site path, or an uploaded data URL — same rule as store images. */
const imageValue = z
  .string()
  .trim()
  .min(1, 'A slide needs an image')
  .max(5_000_000)
  .refine(
    (value) => /^https?:\/\//i.test(value) || /^\//.test(value) || /^data:image\/[a-z0-9.+-]+;base64,/i.test(value),
    'Use an image URL or an uploaded image',
  );

/**
 * A path on this site. Both homepage carousels navigate with the Angular
 * router, so an external URL would not work — and refusing it also keeps a
 * slide from becoming an off-site redirect. `//host` is protocol-relative,
 * so it is refused along with javascript: and friends.
 */
const linkValue = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => /^\/(?!\/)/.test(value), 'Use a path on this site, like /stores or /products?category=Textiles');

const dateValue = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date');

export const createHouseSlideSchema = z.object({
  placement: z.enum(SLIDE_PLACEMENTS),
  badge: z.string().trim().max(40).optional(),
  title: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(240).optional(),
  imageUrl: imageValue,
  targetUrl: linkValue,
  buttonText: z.string().trim().max(40).optional(),
  theme: z.string().trim().max(40).optional(),
  startDate: dateValue.optional(),
  endDate: dateValue.optional(),
  publish: z.boolean().optional(),
});

export const updateSlideSchema = createHouseSlideSchema.omit({ publish: true }).partial();

export const reviewSlideSchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED']),
    rejectionReason: z.string().trim().max(500).optional(),
  })
  .refine((body) => body.status !== 'REJECTED' || !!body.rejectionReason, {
    message: 'A rejection needs a reason the seller can act on',
    path: ['rejectionReason'],
  });

export const setSlideStatusSchema = z.object({
  status: z.enum(['APPROVED', 'PAUSED', 'DRAFT']),
});

export const reorderSlidesSchema = z.object({
  placement: z.enum(SLIDE_PLACEMENTS),
  ids: z.array(z.string()).min(1).max(100),
});
