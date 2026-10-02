import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL } from './api.config';
import {
  ApiCart,
  ApiCreatedOrder,
  ApiCreateProductInput,
  ApiDeliveryInfo,
  ApiMyProductList,
  ApiOrder,
  ApiOrderList,
  ApiPaymentStatus,
  ApiPaywayCheckoutSession,
  ApiPlanCheckoutSession,
  ApiPlanPaymentStatus,
  ApiSubscription,
  ApiSubscriptionPayments,
  PaidPlan,
  ApiProduct,
  ApiProductDetail,
  ApiProductList,
  ApiSellerOrder,
  ApiStore,
  ApiStoreList,
  OrderStatus,
  PaymentMethod,
} from './api.models';

export interface ProductQuery {
  search?: string;
  category?: string;
  storeId?: string;
  location?: string;
  collection?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

/**
 * Thin HTTP layer over the commerce API.
 *
 * Deliberately does no caching or state-keeping: CartService owns cart state,
 * components own their own page state. This just speaks HTTP, so there is one
 * place to look when a URL or a payload shape changes.
 *
 * The session cookie is attached by authInterceptor (app.config.ts), which
 * sets withCredentials on every outgoing request — so it is not repeated here.
 */
@Injectable({ providedIn: 'root' })
export class CommerceApiService {
  private readonly http = inject(HttpClient);

  // ------------------------------------------------------------- products
  listProducts(query: ProductQuery = {}): Observable<ApiProductList> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<ApiProductList>(`${API_URL}/products`, { params }).pipe(
      // Product photos load independently from the list JSON. This keeps the
      // marketplace responsive even when sellers uploaded large phone photos.
      map((response) => ({
        ...response,
        products: response.products.map((product) => ({
          ...product,
          image: `${API_URL}/products/${encodeURIComponent(product.id)}/image`,
        })),
      })),
    );
  }

  /** Accepts a Mongo id or a slug — the server resolves both. */
  getProduct(idOrSlug: string): Observable<ApiProductDetail> {
    return this.http.get<ApiProductDetail>(
      `${API_URL}/products/${encodeURIComponent(idOrSlug)}`,
    );
  }

  /** SELLER/ADMIN only — the server stamps ownership from the session. */
  createProduct(input: ApiCreateProductInput): Observable<ApiProduct> {
    return this.http.post<ApiProduct>(`${API_URL}/products`, input);
  }

  /** The signed-in seller's own listings, drafts and archived included. */
  myProducts(page = 1, limit = 20, storeId?: string): Observable<ApiMyProductList> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (storeId) params = params.set('storeId', storeId);
    return this.http.get<ApiMyProductList>(`${API_URL}/products/mine`, {
      params,
    });
  }

  // -------------------------------------------------------------- stores
  listStores(page = 1, limit = 20): Observable<ApiStoreList> {
    return this.http.get<ApiStoreList>(`${API_URL}/sellers/stores`, {
      params: new HttpParams().set('page', page).set('limit', limit),
    });
  }

  getStore(storeId: string): Observable<ApiStore> {
    return this.http.get<ApiStore>(
      `${API_URL}/sellers/stores/${encodeURIComponent(storeId)}`,
    );
  }

  // ----------------------------------------------------------------- cart
  getCart(): Observable<ApiCart> {
    return this.http.get<ApiCart>(`${API_URL}/cart`);
  }

  addToCart(productId: string, quantity = 1): Observable<ApiCart> {
    return this.http.post<ApiCart>(
      `${API_URL}/cart/items`,
      { productId, quantity },
    );
  }

  updateCartItem(itemId: string, quantity: number): Observable<ApiCart> {
    return this.http.patch<ApiCart>(
      `${API_URL}/cart/items/${itemId}`,
      { quantity },
    );
  }

  removeCartItem(itemId: string): Observable<ApiCart> {
    return this.http.delete<ApiCart>(
      `${API_URL}/cart/items/${itemId}`,
    );
  }

  clearCart(): Observable<ApiCart> {
    return this.http.delete<ApiCart>(`${API_URL}/cart/clear`);
  }

  // --------------------------------------------------------------- orders
  createOrder(
    deliveryInfo: ApiDeliveryInfo,
    paymentMethod: PaymentMethod,
  ): Observable<ApiCreatedOrder> {
    // No totals are sent: the server recomputes them and rejects any attempt
    // to supply one.
    return this.http.post<ApiCreatedOrder>(
      `${API_URL}/orders`,
      { deliveryInfo, paymentMethod },
    );
  }

  myOrders(page = 1, limit = 10): Observable<ApiOrderList> {
    return this.http.get<ApiOrderList>(`${API_URL}/orders/my-orders`, {
      params: new HttpParams().set('page', page).set('limit', limit),
    });
  }

  getOrder(idOrNumber: string): Observable<ApiOrder> {
    return this.http.get<ApiOrder>(
      `${API_URL}/orders/${encodeURIComponent(idOrNumber)}`,
    );
  }

  // -------------------------------------------------------------- payments
  /** Opens an ABA transaction and returns the KHQR the buyer pays. */
  createPaywayCheckout(orderId: string): Observable<ApiPaywayCheckoutSession> {
    return this.http.post<ApiPaywayCheckoutSession>(
      `${API_URL}/payments/aba-payway/checkout`,
      { orderId },
    );
  }

  /**
   * Whether the order is paid. Not a cached read — the server asks ABA about
   * the transaction and settles the order on the way through, so this is the
   * authority on whether money actually moved, not the browser returning
   * from the ABA app.
   */
  paywayStatus(orderId: string): Observable<ApiPaymentStatus> {
    return this.http.get<ApiPaymentStatus>(
      `${API_URL}/payments/aba-payway/status/${encodeURIComponent(orderId)}`,
    );
  }

  // --------------------------------------------------- seller plan billing
  /** A store's current plan, its expiry, and the published prices. */
  subscription(storeId: string): Observable<ApiSubscription> {
    return this.http.get<ApiSubscription>(
      `${API_URL}/subscriptions/${encodeURIComponent(storeId)}`,
    );
  }

  /**
   * Opens an ABA transaction for a plan and returns the KHQR that buys it.
   * The plan is not granted here — only a confirmed payment does that.
   */
  createPlanCheckout(
    storeId: string,
    plan: PaidPlan,
  ): Observable<ApiPlanCheckoutSession> {
    return this.http.post<ApiPlanCheckoutSession>(
      `${API_URL}/subscriptions/checkout`,
      { storeId, plan },
    );
  }

  /**
   * Whether a plan payment cleared. Not a cached read — the server asks ABA
   * and activates the plan on the way through.
   */
  planPaymentStatus(paymentId: string): Observable<ApiPlanPaymentStatus> {
    return this.http.get<ApiPlanPaymentStatus>(
      `${API_URL}/subscriptions/payments/${encodeURIComponent(paymentId)}/status`,
    );
  }

  subscriptionPayments(storeId: string): Observable<ApiSubscriptionPayments> {
    return this.http.get<ApiSubscriptionPayments>(
      `${API_URL}/subscriptions/${encodeURIComponent(storeId)}/payments`,
    );
  }

  // ---------------------------------------------------------- seller desk
  sellerOrders(
    page = 1,
    limit = 20,
    status?: OrderStatus,
  ): Observable<ApiOrderList<ApiSellerOrder>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<ApiOrderList<ApiSellerOrder>>(
      `${API_URL}/orders/seller`,
      { params },
    );
  }

  /** Accept, reject, ship, deliver and cancel all go through here. */
  setOrderStatus(
    orderId: string,
    status: OrderStatus,
    note?: string,
  ): Observable<ApiOrder> {
    return this.http.patch<ApiOrder>(
      `${API_URL}/orders/${orderId}/status`,
      note ? { status, note } : { status },
    );
  }
}
