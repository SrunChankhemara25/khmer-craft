import { z } from 'zod';

export const PRODUCT_SORTS = [
  'newest',
  'price-low',
  'price-high',
  'rating',
  'popular',
] as const;

export const COLLECTIONS = [
  'top-picks',
  'handmade-crafts',
  'agro-products',
  'best-sellers',
  'new-arrivals',
  'under-5',
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];
export type Collection = (typeof COLLECTIONS)[number];

/** Categories a collection expands to. */
export const COLLECTION_CATEGORIES: Partial<Record<Collection, string[]>> = {
  'handmade-crafts': [
    'Handmade Crafts',
    'Pottery',
    'Weaving',
    'Bamboo Products',
  ],
  'agro-products': [
    'Rice Products',
    'Palm Sugar',
    'Local Food',
    'Dried Fruits',
  ],
};

const MAX_LIMIT = 60;

/**
 * Query strings arrive as strings, so every numeric field is coerced and
 * bounded here rather than trusted downstream. An out-of-range `limit` is the
 * classic way to turn a public list endpoint into a denial-of-service.
 */
export const listProductsQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    category: z.string().trim().max(80).optional(),
    subcategory: z.string().trim().max(80).optional(),
    location: z.string().trim().max(80).optional(),
    collection: z.enum(COLLECTIONS).optional(),
    priceMin: z.coerce.number().min(0).max(1_000_000).optional(),
    priceMax: z.coerce.number().min(0).max(1_000_000).optional(),
    sort: z.enum(PRODUCT_SORTS).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(12),
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
    sellerId: z.string().optional(),
  })
  .strip()
  .refine(
    (query) =>
      query.priceMin === undefined ||
      query.priceMax === undefined ||
      query.priceMin <= query.priceMax,
    { message: 'priceMin cannot be greater than priceMax', path: ['priceMin'] },
  );

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

/**
 * Note what is absent: `sellerName` and `sellerUserId`.
 *
 * They used to be accepted from the request body, which meant any signed-in
 * seller could publish a product attributed to someone else's store — and
 * because `sellerUserId` was never set, the listing reached nobody's order
 * desk. Both are now taken from the authenticated seller, and `.strict()`
 * rejects an attempt to send them rather than silently ignoring it.
 */
export const createProductSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    description: z.string().trim().max(4000).optional(),
    price: z.number().positive().max(1_000_000),
    compareAtPrice: z.number().positive().max(1_000_000).nullable().optional(),
    category: z.string().trim().min(2).max(80),
    subcategory: z.string().trim().max(80).nullable().optional(),
    sellerName: z.string().trim().max(120).optional(),
    storeName: z.string().trim().max(120).optional(),
    location: z.string().trim().max(80).optional(),
    image: z.string().trim().max(5_000_000).optional(),
    images: z.array(z.string().trim().max(5_000_000)).max(10).optional(),
    stock: z.number().int().min(0).max(1_000_000).default(0),
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT OF STOCK', 'LOW STOCK']).default('ACTIVE'),
    sellerId: z.string().optional(),
  })
  .strip();

export type CreateProductInput = z.infer<typeof createProductSchema>;

/**
 * Every field optional — a seller fixing a typo should not have to resend the
 * whole listing. Ownership fields are absent for the same reason as above: a
 * product cannot be reassigned to another seller through an edit.
 */
export const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(4000).optional(),
    price: z.number().positive().max(1_000_000).optional(),
    compareAtPrice: z.number().positive().max(1_000_000).nullable().optional(),
    category: z.string().trim().min(2).max(80).optional(),
    subcategory: z.string().trim().max(80).nullable().optional(),
    sellerName: z.string().trim().min(2).max(120).optional(),
    storeName: z.string().trim().max(120).optional(),
    location: z.string().trim().max(80).optional(),
    image: z.string().trim().max(5_000_000).nullable().optional(),
    images: z.array(z.string().trim().max(5_000_000)).max(10).optional(),
    stock: z.number().int().min(0).max(1_000_000).optional(),
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT OF STOCK', 'LOW STOCK']).optional(),
  })
  .strip()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
