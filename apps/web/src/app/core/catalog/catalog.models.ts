/**
 * Catalog domain types.
 *
 * These mirror the shape the API is expected to return, so swapping the mock
 * data in `core/data/*` for real HTTP calls should not require touching any
 * component. Keep `id` a string for that reason — Mongo returns `_id` strings.
 */

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export interface Product {
  id: string;
  name: string;
  slug: string;
  /** Null until real imagery exists; the UI renders a labelled placeholder. */
  image: string | null;
  price: number;
  /** Original price when the item is discounted. */
  compareAtPrice?: number;
  categorySlug: string;
  categoryName: string;
  sellerName: string;
  storeId: string;
  rating: number;
  reviewCount: number;
  stock: number;
  status: StockStatus;
  description: string;
  /** Drives the Best Sellers section. */
  soldCount: number;
  /** ISO date; drives the New Arrivals section. */
  createdAt: string;
  /** Marketing groupings used by the homepage collection rows. */
  collections: string[];
}

export interface Category {
  slug: string;
  name: string;
  description: string;
  /** Icon name understood by `shared/icon.component`. */
  icon: string;
}

export interface Store {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviewCount: number;
  categoryName: string;
  description: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

/** A cart line joined with its product, ready to render. */
export interface CartLine {
  product: Product;
  quantity: number;
  lineTotal: number;
}

export type ProductSort =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'rating'
  | 'newest';

export interface ProductQuery {
  search?: string;
  category?: string;
  collection?: string;
  storeId?: string;
  sort?: ProductSort;
}
