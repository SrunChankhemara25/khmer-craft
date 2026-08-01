import { Injectable } from '@angular/core';
import { CATEGORIES, findCategory } from '../data/categories.data';
import { PRODUCTS } from '../data/products.data';
import { STORES, findStore } from '../data/stores.data';
import { Category, Product, ProductQuery, Store } from './catalog.models';

/**
 * Read side of the catalog. Everything the UI knows about products, categories
 * and stores comes through here, so replacing the mock arrays with HTTP calls
 * is a change to this one file.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  readonly categories: Category[] = CATEGORIES;
  readonly stores: Store[] = STORES;

  allProducts(): Product[] {
    return PRODUCTS;
  }

  productById(id: string): Product | undefined {
    return PRODUCTS.find((product) => product.id === id);
  }

  productsByIds(ids: readonly string[]): Product[] {
    // Preserve the caller's ordering (cart and wishlist rely on it).
    return ids
      .map((id) => this.productById(id))
      .filter((product): product is Product => Boolean(product));
  }

  category(slug: string): Category | undefined {
    return findCategory(slug);
  }

  store(id: string): Store | undefined {
    return findStore(id);
  }

  /** How many products sit in a category — drives the category card counts. */
  countByCategory(slug: string): number {
    return PRODUCTS.filter((product) => product.categorySlug === slug).length;
  }

  countByStore(storeId: string): number {
    return PRODUCTS.filter((product) => product.storeId === storeId).length;
  }

  collection(name: string, limit?: number): Product[] {
    const matches = PRODUCTS.filter((product) =>
      product.collections.includes(name),
    );
    return limit ? matches.slice(0, limit) : matches;
  }

  bestSellers(limit = 4): Product[] {
    return [...PRODUCTS]
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, limit);
  }

  newArrivals(limit = 4): Product[] {
    return [...PRODUCTS]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  /**
   * Single entry point for the Products page. Search matches name, category
   * and seller so "Battambang" or "pottery" both return something sensible.
   */
  search(query: ProductQuery): Product[] {
    let results = [...PRODUCTS];

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

    if (query.collection) {
      results = results.filter((product) =>
        product.collections.includes(query.collection!),
      );
    }

    if (query.storeId) {
      results = results.filter((product) => product.storeId === query.storeId);
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
        // 'featured' — keep in-stock items ahead of sold-out ones.
        results.sort(
          (a, b) =>
            Number(a.status === 'out-of-stock') -
            Number(b.status === 'out-of-stock'),
        );
    }

    return results;
  }

  /** Same category, excluding the product itself. */
  related(product: Product, limit = 4): Product[] {
    return PRODUCTS.filter(
      (candidate) =>
        candidate.id !== product.id &&
        candidate.categorySlug === product.categorySlug,
    ).slice(0, limit);
  }
}
