import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommerceApiService } from '../api/commerce-api.service';
import { ApiProduct } from '../api/api.models';
import {
  CATEGORIES,
  classifyCategory,
  findCategory,
} from '../data/categories.data';
import { PRODUCTS as FALLBACK_PRODUCTS } from '../data/products.data';
import { STORES, findStore } from '../data/stores.data';
import { Category, Product, ProductQuery, Store } from './catalog.models';

/**
 * The catalog the UI reads.
 *
 * Products come from the API and are held in a signal, so every derived view
 * (homepage rails, the products grid, related items) recomputes when they
 * load. The identifiers therefore match the server's, which is what makes
 * add-to-cart work — the previous mock ids would have 404'd.
 *
 * If the API cannot be reached the bundled fixtures are used instead, so the
 * storefront still renders something during a backend outage. That is a
 * display-only fallback: those ids are not real, so cart actions against them
 * will fail, and `usingFallback` is exposed so the UI can say so.
 *
 * TODO(api): categories and stores are still local fixtures — there are no
 * endpoints for them yet.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(CommerceApiService);

  private readonly products = signal<Product[]>([]);
  readonly loaded = signal(false);
  readonly usingFallback = signal(false);

  readonly categories: Category[] = CATEGORIES;
  readonly stores = signal<Store[]>(STORES);

  constructor() {
    void this.load();
  }

  /** Fetch the whole catalog once. It is small; pagination is a UI concern. */
  async load(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.api.listProducts({ limit: 60 }),
      );
      const apiProducts = response.products.map(toProduct);
      const showcaseProducts = FALLBACK_PRODUCTS.filter(
        (product) => product.storeId === 's006' || product.storeId === 's007',
      );
      this.products.set([...apiProducts, ...showcaseProducts]);
      
      try {
        const stores = await firstValueFrom(this.api.listStores());
        this.stores.set(stores.map(s => ({
          id: s._id,
          name: s.storeName || 'Unknown Store',
          description: s.storeDescription || '',
          location: s.location || 'Cambodia',
          rating: s.rating || 5.0,
          reviewCount: s.reviewCount || 0,
          logoUrl: s.storeAvatarUrl,
          categoryName: s.category || 'Various Crafts',
        })));
      } catch (err) {
        console.warn('Failed to load stores from API, using fallback');
      }

      this.usingFallback.set(false);
    } catch {
      this.products.set(FALLBACK_PRODUCTS);
      this.usingFallback.set(true);
    } finally {
      this.loaded.set(true);
    }
  }

  allProducts(): Product[] {
    return this.products();
  }

  productById(id: string): Product | undefined {
    return this.products().find(
      (product) => product.id === id || product.slug === id,
    );
  }

  productsByIds(ids: readonly string[]): Product[] {
    return ids
      .map((id) => this.productById(id))
      .filter((product): product is Product => Boolean(product));
  }

  category(slug: string): Category | undefined {
    return findCategory(slug);
  }

  store(id: string): Store | undefined {
    return this.stores().find((store) => store.id === id);
  }

  countByCategory(slug: string): number {
    return this.products().filter((product) => product.categorySlug === slug)
      .length;
  }

  /** Product count for a sub-category, used by the chips and filter list. */
  countBySubcategory(categorySlug: string, subSlug: string): number {
    return this.products().filter(
      (product) =>
        product.categorySlug === categorySlug &&
        product.subcategorySlug === subSlug,
    ).length;
  }

  countByStore(storeId: string): number {
    return this.products().filter((product) => product.storeId === storeId)
      .length;
  }

  collection(name: string, limit?: number): Product[] {
    const matches = this.products().filter((product) =>
      product.collections.includes(name),
    );
    return limit ? matches.slice(0, limit) : matches;
  }

  bestSellers(limit = 4): Product[] {
    return [...this.products()]
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, limit);
  }

  newArrivals(limit = 4): Product[] {
    return [...this.products()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  search(query: ProductQuery): Product[] {
    let results = [...this.products()];

    const term = query.search?.trim().toLowerCase();
    if (term) {
      results = results.filter((product) =>
        [
          product.name,
          product.categoryName,
          product.sellerName,
          product.description,
        ]
          .join(' ')
          .toLowerCase()
          .includes(term),
      );
    }

    if (query.category) {
      results = results.filter(
        (product) => product.categorySlug === query.category,
      );
    }

    if (query.subcategory) {
      results = results.filter(
        (product) => product.subcategorySlug === query.subcategory,
      );
    }

    if (query.collection) {
      results = results.filter((product) =>
        product.collections.includes(query.collection!),
      );
    }

    if (query.storeId) {
      results = results.filter((product) => product.storeId === query.storeId);
    }

    if (query.priceMin !== undefined) {
      results = results.filter((product) => product.price >= query.priceMin!);
    }

    if (query.priceMax !== undefined) {
      results = results.filter((product) => product.price <= query.priceMax!);
    }

    if (query.minRating !== undefined) {
      results = results.filter((product) => product.rating >= query.minRating!);
    }

    if (query.inStockOnly) {
      results = results.filter((product) => product.status !== 'out-of-stock');
    }

    if (query.onSaleOnly) {
      results = results.filter(
        (product) =>
          product.compareAtPrice !== undefined &&
          product.compareAtPrice > product.price,
      );
    }

    switch (query.sort) {
      case 'price-asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      default:
        results.sort(
          (a, b) =>
            Number(a.status === 'out-of-stock') -
            Number(b.status === 'out-of-stock'),
        );
    }

    return results;
  }

  /**
   * How many products a filter would return *given the rest of the filters*.
   *
   * Counting against the full catalogue would show a number the user cannot
   * reach — clicking a "12" and landing on 3 results reads as a bug. This
   * applies every other active filter first, so the count is what they will
   * actually get.
   */
  countWith(base: ProductQuery, override: Partial<ProductQuery>): number {
    return this.search({ ...base, ...override }).length;
  }

  /** Cheapest and dearest in a set, for the price slider bounds. */
  priceRange(query: ProductQuery): { min: number; max: number } {
    const prices = this.search(query).map((product) => product.price);
    if (!prices.length) {
      return { min: 0, max: 0 };
    }
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }

  related(product: Product, limit = 4): Product[] {
    return this.products()
      .filter(
        (candidate) =>
          candidate.id !== product.id &&
          candidate.categorySlug === product.categorySlug,
      )
      .slice(0, limit);
  }
}

/**
 * Map a server product onto the shape the UI renders.
 *
 * The category slug is derived from the display name because the API stores
 * categories as free text ("Palm Sugar") while the UI routes on slugs.
 */
const toProduct = (api: ApiProduct): Product => {
  const classification = classifyCategory(api.category);

  // We no longer rely on STORES; we just use the ID from the API directly
  // The UI will match it against the stores() signal when rendering store details

  return {
    id: api.id,
    name: api.name,
    slug: api.slug,
    image: api.image,
    price: api.price,
    compareAtPrice: api.compareAtPrice ?? undefined,
    ...classification,
    sellerName: api.sellerName,
    storeId: api.sellerId ?? '',
    rating: api.rating,
    reviewCount: api.reviewCount,
    stock: api.stock,
    status:
      api.stock === 0 ? 'out-of-stock' : api.stock <= 5 ? 'low-stock' : 'in-stock',
    description: api.description,
    soldCount: api.soldCount,
    createdAt: api.createdAt,
    collections: collectionsFor(api),
  };
};

/**
 * Collections are computed client-side from the category and sales figures,
 * matching the server's own collection rules in catalog.validation.ts.
 */
const collectionsFor = (api: ApiProduct): string[] => {
  const collections: string[] = [];
  const handmade = ['Handmade Crafts', 'Pottery', 'Weaving', 'Bamboo Products'];
  const agro = ['Rice Products', 'Palm Sugar', 'Local Food', 'Dried Fruits'];

  if (handmade.includes(api.category)) {
    collections.push('handmade-crafts');
  }
  if (agro.includes(api.category)) {
    collections.push('agro-products');
  }
  if (api.rating >= 4.6) {
    collections.push('top-picks');
  }
  if (api.soldCount >= 400) {
    collections.push('best-sellers');
  }
  if (api.price <= 5) {
    collections.push('under-5');
  }
  if (api.rating >= 4.4 && api.soldCount < 400) {
    collections.push('recommended');
  }
  return collections;
};
