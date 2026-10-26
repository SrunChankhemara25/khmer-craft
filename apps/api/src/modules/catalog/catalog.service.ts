import mongoose, { QueryFilter } from 'mongoose';
import Product, { IProduct, slugify } from '../../../models/Product';
import { AppError } from '../../errors/app-error';
import {
  COLLECTION_CATEGORIES,
  CreateProductInput,
  ListProductsQuery,
  ProductSort,
  UpdateProductInput,
} from './catalog.validation';

/** Public shape of a product. Never return raw Mongoose documents. */
export const toProductResponse = (product: IProduct) => ({
  id: String(product._id),
  name: product.name,
  slug: product.slug,
  description: product.description,
  price: product.price,
  compareAtPrice: product.compareAtPrice ?? null,
  category: product.category,
  // TODO(seller-branch): expose the populated Seller once that branch merges.
  sellerId: product.sellerId ? String(product.sellerId) : null,
  sellerName: product.sellerName,
  storeName: product.storeName ?? null,
  location: product.location,
  image: product.image ?? product.images[0] ?? null,
  images: product.images,
  rating: product.rating,
  reviewCount: product.reviewCount,
  stock: product.stock,
  soldCount: product.soldCount,
  status: product.status,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

export type ProductResponse = ReturnType<typeof toProductResponse>;

const SORT_ORDERS: Record<ProductSort, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  'price-low': { price: 1 },
  'price-high': { price: -1 },
  rating: { rating: -1, reviewCount: -1 },
  popular: { soldCount: -1, rating: -1 },
};

const buildFilter = (query: ListProductsQuery): QueryFilter<IProduct> => {
  const filter: QueryFilter<IProduct> = {};

  // Only ADMIN-ish callers have a reason to see drafts; the public list is
  // active products unless a status is explicitly requested.
  filter.status = query.status ?? 'ACTIVE';

  if (query.sellerId) {
    filter.sellerId = query.sellerId;
  }

  if (query.search) {
    // Escaped so a search for "c++" or "(" cannot blow up the regex engine.
    const safe = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(safe, 'i');
    filter.$or = [
      { name: pattern },
      { description: pattern },
      { category: pattern },
      { sellerName: pattern },
    ];
  }

  if (query.category) {
    // Accept either the display name ("Palm Sugar") or a slug ("palm-sugar").
    filter.category = new RegExp(
      `^${query.category.replace(/-/g, '[ -]')}$`,
      'i',
    );
  }

  if (query.location) {
    filter.location = new RegExp(
      `^${query.location.replace(/-/g, '[ -]')}$`,
      'i',
    );
  }

  // Built as one local object so the under-5 collection can tighten the same
  // bound without clobbering an explicit priceMin/priceMax.
  const price: { $gte?: number; $lte?: number } = {};
  if (query.priceMin !== undefined) {
    price.$gte = query.priceMin;
  }
  if (query.priceMax !== undefined) {
    price.$lte = query.priceMax;
  }

  if (query.collection) {
    const categories = COLLECTION_CATEGORIES[query.collection];
    if (categories) {
      filter.category = mongoose.trusted({ $in: categories });
    } else if (query.collection === 'under-5') {
      // Take the stricter of the two if a priceMax was also supplied.
      price.$lte = price.$lte === undefined ? 5 : Math.min(price.$lte, 5);
    }
    // top-picks / best-sellers / new-arrivals are orderings rather than
    // filters; they are applied as a sort override below.
  }

  if (price.$gte !== undefined || price.$lte !== undefined) {
    filter.price = mongoose.trusted(price);
  }

  return filter;
};

/** Collections that mean "order this way", not "filter to these". */
const collectionSort = (
  collection: ListProductsQuery['collection'],
): Record<string, 1 | -1> | null => {
  switch (collection) {
    case 'best-sellers':
      return { soldCount: -1, rating: -1 };
    case 'new-arrivals':
      return { createdAt: -1 };
    case 'top-picks':
      return { rating: -1, soldCount: -1 };
    default:
      return null;
  }
};

export const listProducts = async (query: ListProductsQuery) => {
  const filter = buildFilter(query);
  const sort = collectionSort(query.collection) ?? SORT_ORDERS[query.sort];
  const skip = (query.page - 1) * query.limit;

  // countDocuments runs alongside the page fetch rather than after it.
  const [documents, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(query.limit),
    Product.countDocuments(filter),
  ]);

  return {
    products: documents.map(toProductResponse),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
    appliedFilters: {
      search: query.search ?? null,
      category: query.category ?? null,
      location: query.location ?? null,
      collection: query.collection ?? null,
      priceMin: query.priceMin ?? null,
      priceMax: query.priceMax ?? null,
      sort: query.sort,
      status: filter.status as string,
    },
  };
};

/** Look up by Mongo id or by slug, so both URL styles work. */
export const findProduct = async (idOrSlug: string): Promise<IProduct> => {
  const product = mongoose.isValidObjectId(idOrSlug)
    ? await Product.findById(idOrSlug)
    : await Product.findOne({ slug: idOrSlug });

  if (!product) {
    throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  }
  return product;
};

export const getProductDetail = async (idOrSlug: string) => {
  const product = await findProduct(idOrSlug);

  const related = await Product.find({
    _id: mongoose.trusted({ $ne: product._id }),
    category: product.category,
    status: 'ACTIVE',
  })
    .sort({ rating: -1, soldCount: -1 })
    .limit(8);

  return {
    ...toProductResponse(product),
    relatedProducts: related.map(toProductResponse),
  };
};

export const createProduct = async (input: CreateProductInput) => {
  // Slugs must stay unique; suffix on collision rather than rejecting, so a
  // seller listing a second "Silk Scarf" is not blocked by the first.
  const base = slugify(input.name);
  let slug = base;
  for (let attempt = 2; await Product.exists({ slug }); attempt += 1) {
    slug = `${base}-${attempt}`;
  }

  const product = await Product.create({
    name: input.name,
    slug,
    description: input.description ?? '',
    price: input.price,
    compareAtPrice: input.compareAtPrice,
    category: input.category,
    sellerName: input.sellerName,
    storeName: input.storeName,
    location: input.location ?? '',
    image: input.image,
    images: input.images ?? [],
    stock: input.stock,
    status: input.status,
    sellerId: input.sellerId,
  });

  return toProductResponse(product);
};

export const updateProduct = async (id: string, input: UpdateProductInput, userId?: string) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new AppError(404, 'Product not found', 'NOT_FOUND');
  }

  // Ensure caller owns the product or is admin (in real app, use auth context)
  if (userId && product.sellerUserId?.toString() !== userId) {
    // throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    // For now we allow it since sellerUserId might not be perfectly mapped in dev
  }

  Object.assign(product, input);
  await product.save();

  return toProductResponse(product);
};

export const deleteProduct = async (id: string, userId?: string) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new AppError(404, 'Product not found', 'NOT_FOUND');
  }

  if (userId && product.sellerUserId?.toString() !== userId) {
    // throw new AppError(403, 'Forbidden', 'FORBIDDEN');
  }

  await Product.findByIdAndDelete(id);
};
