import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CatalogService } from '../catalog/catalog.service';
import { CartItem, CartLine, Product } from '../catalog/catalog.models';

const STORAGE_KEY = 'khmercraft.cart';
const FREE_SHIPPING_THRESHOLD = 50;
const SHIPPING_FLAT_RATE = 3.5;

/**
 * Cart state, shared app-wide.
 *
 * Holds product *ids* rather than product copies so a price or stock change in
 * the catalog is reflected immediately instead of being frozen at the moment
 * the item was added. Persisted to localStorage so a refresh mid-checkout does
 * not empty the basket.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly catalog = inject(CatalogService);
  private readonly items = signal<CartItem[]>(this.restore());

  /** Cart lines joined with their product, in insertion order. */
  readonly lines = computed<CartLine[]>(() =>
    this.items()
      .map((item) => {
        const product = this.catalog.productById(item.productId);
        return product
          ? {
              product,
              quantity: item.quantity,
              lineTotal: round(product.price * item.quantity),
            }
          : null;
      })
      .filter((line): line is CartLine => line !== null),
  );

  /** Total units, not distinct products — this is what the navbar badge shows. */
  readonly count = computed(() =>
    this.items().reduce((total, item) => total + item.quantity, 0),
  );

  readonly subtotal = computed(() =>
    round(this.lines().reduce((total, line) => total + line.lineTotal, 0)),
  );

  readonly shipping = computed(() => {
    const subtotal = this.subtotal();
    if (subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD) {
      return 0;
    }
    return SHIPPING_FLAT_RATE;
  });

  readonly total = computed(() => round(this.subtotal() + this.shipping()));

  readonly isEmpty = computed(() => this.items().length === 0);

  /** How much more the buyer needs to spend to earn free delivery. */
  readonly freeShippingRemaining = computed(() =>
    this.subtotal() >= FREE_SHIPPING_THRESHOLD
      ? 0
      : round(FREE_SHIPPING_THRESHOLD - this.subtotal()),
  );

  constructor() {
    effect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items())));
  }

  /** Returns false when the product is sold out, so callers can show feedback. */
  add(product: Product, quantity = 1): boolean {
    if (product.status === 'out-of-stock' || quantity < 1) {
      return false;
    }

    this.items.update((items) => {
      const existing = items.find((item) => item.productId === product.id);
      if (!existing) {
        return [...items, { productId: product.id, quantity: clampToStock(quantity, product) }];
      }
      return items.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: clampToStock(item.quantity + quantity, product) }
          : item,
      );
    });
    return true;
  }

  /** Steps a line up or down; dropping to zero removes it. */
  changeQuantity(productId: string, delta: number): void {
    const product = this.catalog.productById(productId);
    this.items.update((items) =>
      items
        .map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: product
                  ? clampToStock(item.quantity + delta, product)
                  : item.quantity + delta,
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  remove(productId: string): void {
    this.items.update((items) =>
      items.filter((item) => item.productId !== productId),
    );
  }

  clear(): void {
    this.items.set([]);
  }

  quantityOf(productId: string): number {
    return (
      this.items().find((item) => item.productId === productId)?.quantity ?? 0
    );
  }

  contains(productId: string): boolean {
    return this.quantityOf(productId) > 0;
  }

  private restore(): CartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      // Ignore anything malformed rather than letting a bad entry break boot.
      return parsed.filter(
        (item): item is CartItem =>
          typeof item?.productId === 'string' &&
          typeof item?.quantity === 'number' &&
          item.quantity > 0,
      );
    } catch {
      return [];
    }
  }
}

const clampToStock = (quantity: number, product: Product) =>
  Math.max(0, Math.min(quantity, product.stock));

/** Money maths in JS drifts; keep totals at two decimals. */
const round = (value: number) => Math.round(value * 100) / 100;
