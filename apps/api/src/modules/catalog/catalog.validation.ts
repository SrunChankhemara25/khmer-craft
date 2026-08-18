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

export const createProductSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    description: z.string().trim().max(4000).optional(),
    price: z.number().positive().max(1_000_000),
    compareAtPrice: z.number().positive().max(1_000_000).optional(),
    category: z.string().trim().min(2).max(80),
    sellerName: z.string().trim().min(2).max(120),
    storeName: z.string().trim().max(120).optional(),
    location: z.string().trim().max(80).optional(),
    image: z.string().trim().max(5_000_000).optional(),
    images: z.array(z.string().trim().max(5_000_000)).max(10).optional(),
    stock: z.number().int().min(0).max(1_000_000).default(0),
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).default('ACTIVE'),
    sellerId: z.string().optional(),
  })
  .strict();

export type CreateProductInput = z.infer<typeof createProductSchema>;
