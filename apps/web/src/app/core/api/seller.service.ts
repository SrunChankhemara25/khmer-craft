import { StoreAppearance } from '../catalog/store-appearance';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { API_URL } from './api.config';

export type SellerPlan = 'STARTER' | 'STANDARD' | 'PREMIUM';

export type WarehouseType = 'SHOP' | 'STORAGE' | 'HOME' | 'PICKUP_POINT';

export interface Warehouse {
  id: string;
  name: string;
  type: WarehouseType;
  province: string;
  district: string;
  commune: string;
  addressLine: string;
  notes: string;
  contactName: string;
  phoneNumber: string;
  openingHours: string;
  isDefault: boolean;
  isActive: boolean;
}

export type WarehousePayload = Partial<Omit<Warehouse, 'id' | 'isActive'>> & { name?: string };

export interface SellerApplication {
  id: string;
  storeName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  status: string;
  createdAt?: string;
}

export interface SellerStore {
  id: string;
  slug: string;
  storeName: string;
  storeDescription?: string;
  appearance?: StoreAppearance;
  storeTagline?: string;
  announcement?: string;
  theme?: StoreTheme;
  showContact?: boolean;
  featuredProductIds?: string[];
  category?: string;
  location?: string;
  phoneNumber?: string;
  subscriptionPlan?: SellerPlan;
  verificationStatus?: string;
}

export type StoreTheme = 'FOREST' | 'CLAY' | 'GOLD' | 'MIDNIGHT';

export interface UpdateStorefrontPayload {
  storeName?: string;
  storeDescription?: string;
  appearance?: StoreAppearance;
  storeTagline?: string;
  announcement?: string;
  theme?: StoreTheme;
  showContact?: boolean;
  featuredProductIds?: string[];
  location?: string;
  phoneNumber?: string;
  logoUrl?: string;
  bannerUrl?: string;
}

export interface CreateStorePayload {
  logoUrl?: string;
  bannerUrl?: string;
  storeName: string;
  storeDescription?: string;
  appearance?: StoreAppearance;
  category?: string;
  location?: string;
  phoneNumber?: string;
  subscriptionPlan: SellerPlan;
  paymentMethod: 'FREE' | 'ABA';
}

export interface DashboardMetrics {
  pendingOrders: number;
  inTransit: number;
  completed30d: number;
  revenueMtd: number;
}

export interface SellerOrderDTO {
  id: string;
  orderNumber: string;
  buyerName: string;
  buyerPhone: string;
  deliveryInfo: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  myItems: any[];
  myTotal: number;
}

export interface OrdersDashboardResponse {
  metrics: DashboardMetrics;
  orders: SellerOrderDTO[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface StoreSubcategoryDTO {
  id: string;
  name: string;
  slug: string;
  visible: boolean;
  sortOrder: number;
}

export interface StoreCategoryDTO {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  visible: boolean;
  sortOrder: number;
  subcategories: StoreSubcategoryDTO[];
}

@Injectable({ providedIn: 'root' })
export class SellerService {
  private readonly http = inject(HttpClient);

  /**
   * Seller applications awaiting review. ADMIN-only on the server
   * (sellers.routes.ts), so a non-admin calling this gets a 403.
   */
  listSellerApplications() {
    return this.http.get<SellerApplication[]>(`${API_URL}/sellers/apply`);
  }

  // --- stock locations -----------------------------------------------------
  // Owner-only on the server; there is no public view of where a seller keeps
  // stock, so none of these are reachable without the seller's own session.

  listWarehouses(storeId: string) {
    return this.http.get<{ warehouses: Warehouse[] }>(`${API_URL}/warehouses/my-stores/${storeId}`);
  }

  createWarehouse(storeId: string, data: WarehousePayload) {
    return this.http.post<Warehouse>(`${API_URL}/warehouses/my-stores/${storeId}`, data);
  }

  updateWarehouse(storeId: string, warehouseId: string, data: WarehousePayload) {
    return this.http.patch<Warehouse>(
      `${API_URL}/warehouses/my-stores/${storeId}/${warehouseId}`,
      data,
    );
  }

  deleteWarehouse(storeId: string, warehouseId: string) {
    return this.http.delete<{ deleted: true }>(
      `${API_URL}/warehouses/my-stores/${storeId}/${warehouseId}`,
    );
  }

  getMyStores() {
    return this.http.get<SellerStore[]>(`${API_URL}/sellers/my-stores`);
  }

  createStore(data: CreateStorePayload) {
    return this.http.post<SellerStore>(`${API_URL}/sellers/my-stores`, data);
  }

  getStoreOrders(storeId: string) {
    return this.http.get<OrdersDashboardResponse>(
      `${API_URL}/sellers/my-stores/${storeId}/orders`
    );
  }

  getStoreProfile(storeId: string) {
    return this.http.get<any>(`${API_URL}/sellers/my-stores/${storeId}`);
  }

  updateStoreProfile(storeId: string, data: UpdateStorefrontPayload) {
    return this.http.put<SellerStore>(`${API_URL}/sellers/my-stores/${storeId}/profile`, data);
  }

  getStoreReviews(storeId: string) {
    return this.http.get<any>(`${API_URL}/sellers/my-stores/${storeId}/reviews`);
  }

  getStoreProducts(storeId: string) {
    // The authenticated endpoint enforces ownership and also returns drafts
    // and archived listings. A public sellerId query can never safely power
    // a seller's management dashboard. Product records deliberately omit
    // base64 photos here, so point each row at the lightweight image route
    // instead of rendering an empty thumbnail after a save refresh.
    return this.http.get<any>(`${API_URL}/products/mine`, { params: { storeId } }).pipe(
      map((response) => ({
        ...response,
        products: (response.products ?? []).map((product: { id: string }) => ({
          ...product,
          image: `${API_URL}/products/${encodeURIComponent(product.id)}/image`,
        })),
      })),
    );
  }

  createProduct(data: any) {
    return this.http.post<any>(`${API_URL}/products`, data);
  }

  updateProduct(productId: string, data: any) {
    return this.http.patch<any>(`${API_URL}/products/${productId}`, data);
  }

  deleteProduct(productId: string) {
    return this.http.delete<any>(`${API_URL}/products/${productId}`);
  }

  // ------------------------------------------------------- store categories

  getStoreCategories(storeId: string) {
    return this.http
      .get<{ categories: StoreCategoryDTO[] }>(`${API_URL}/store-categories/my-stores/${storeId}`)
      .pipe(map((response) => response.categories));
  }

  createStoreCategory(storeId: string, data: { name: string; description?: string; imageUrl?: string }) {
    return this.http.post<StoreCategoryDTO>(`${API_URL}/store-categories/my-stores/${storeId}`, data);
  }

  updateStoreCategory(
    storeId: string,
    categoryId: string,
    data: Partial<{ name: string; description: string | null; imageUrl: string | null; visible: boolean }>,
  ) {
    return this.http.patch<StoreCategoryDTO>(
      `${API_URL}/store-categories/my-stores/${storeId}/${categoryId}`,
      data,
    );
  }

  reorderStoreCategories(storeId: string, orderedIds: string[]) {
    return this.http
      .patch<{ categories: StoreCategoryDTO[] }>(
        `${API_URL}/store-categories/my-stores/${storeId}/reorder`,
        { orderedIds },
      )
      .pipe(map((response) => response.categories));
  }

  deleteStoreCategory(storeId: string, categoryId: string) {
    return this.http.delete<void>(`${API_URL}/store-categories/my-stores/${storeId}/${categoryId}`);
  }

  addStoreSubcategory(storeId: string, categoryId: string, name: string) {
    return this.http.post<StoreCategoryDTO>(
      `${API_URL}/store-categories/my-stores/${storeId}/${categoryId}/subcategories`,
      { name },
    );
  }

  updateStoreSubcategory(
    storeId: string,
    categoryId: string,
    subcategoryId: string,
    data: Partial<{ name: string; visible: boolean }>,
  ) {
    return this.http.patch<StoreCategoryDTO>(
      `${API_URL}/store-categories/my-stores/${storeId}/${categoryId}/subcategories/${subcategoryId}`,
      data,
    );
  }

  reorderStoreSubcategories(storeId: string, categoryId: string, orderedIds: string[]) {
    return this.http.patch<StoreCategoryDTO>(
      `${API_URL}/store-categories/my-stores/${storeId}/${categoryId}/subcategories/reorder`,
      { orderedIds },
    );
  }

  deleteStoreSubcategory(storeId: string, categoryId: string, subcategoryId: string) {
    return this.http.delete<StoreCategoryDTO>(
      `${API_URL}/store-categories/my-stores/${storeId}/${categoryId}/subcategories/${subcategoryId}`,
    );
  }

  // ------------------------------------------------------------- Advertisements (Marketplace Hero & Big Cards)
  getPromotionCampaigns() {
    return this.http.get<any[]>(`${API_URL}/promotions/campaigns`);
  }

  getMyPromotionSlides() {
    return this.http.get<any[]>(`${API_URL}/promotions/slides/my`);
  }

  applyPromotionSlide(payload: any) {
    return this.http.post<any>(`${API_URL}/promotions/slides/apply`, payload);
  }

  updatePromotionSlide(slideId: string, payload: any) {
    return this.http.patch<any>(`${API_URL}/promotions/slides/${slideId}`, payload);
  }

  submitDraftPromotionSlide(slideId: string) {
    return this.http.post<any>(`${API_URL}/promotions/slides/${slideId}/submit`, {});
  }

  deletePromotionSlide(slideId: string) {
    return this.http.delete<any>(`${API_URL}/promotions/slides/${slideId}`);
  }

  payPromotionSlide(slideId: string) {
    return this.http.post<any>(`${API_URL}/promotions/slides/${slideId}/pay`, {});
  }

  // ------------------------------------------------------------- Customers
  getStoreCustomers(storeId: string, search?: string) {
    return this.http.get<{ customers: any[]; total: number }>(
      `${API_URL}/sellers/my-stores/${storeId}/customers`,
      { params: search ? { search } : {} }
    );
  }

  getStoreCustomerDetail(storeId: string, customerId: string) {
    return this.http.get<any>(
      `${API_URL}/sellers/my-stores/${storeId}/customers/${encodeURIComponent(customerId)}`
    );
  }

  // ------------------------------------------------------------- POS
  listPosRegisters(storeId: string) {
    return this.http.get<any[]>(`${API_URL}/sellers/my-stores/${storeId}/pos/registers`);
  }

  createPosRegister(storeId: string, data: { name: string; registerNumber?: string; location?: string; settings?: any }) {
    return this.http.post<any>(`${API_URL}/sellers/my-stores/${storeId}/pos/registers`, data);
  }

  updatePosRegister(storeId: string, registerId: string, data: any) {
    return this.http.patch<any>(`${API_URL}/sellers/my-stores/${storeId}/pos/registers/${registerId}`, data);
  }

  getPosCurrentShift(storeId: string, registerId?: string) {
    return this.http.get<any>(`${API_URL}/sellers/my-stores/${storeId}/pos/shift`, {
      params: registerId ? { registerId } : {},
    });
  }

  openPosShift(storeId: string, data: { startingCash: number; registerId?: string; notes?: string } | number) {
    const payload = typeof data === 'number' ? { startingCash: data } : data;
    return this.http.post<any>(`${API_URL}/sellers/my-stores/${storeId}/pos/shift/open`, payload);
  }

  closePosShift(storeId: string, actualCash: number, notes?: string) {
    return this.http.post<any>(`${API_URL}/sellers/my-stores/${storeId}/pos/shift/close`, {
      actualCash,
      notes,
    });
  }

  recordPosCashMovement(storeId: string, type: 'IN' | 'OUT' | 'ADJUSTMENT', amount: number, reason?: string) {
    return this.http.post<any>(
      `${API_URL}/sellers/my-stores/${storeId}/pos/shift/cash-movement`,
      { type, amount, reason }
    );
  }

  listPosShifts(storeId: string, limit = 20, page = 1) {
    return this.http.get<{ shifts: any[]; total: number; page: number; totalPages: number }>(
      `${API_URL}/sellers/my-stores/${storeId}/pos/shifts`,
      { params: { limit, page } }
    );
  }

  createPosOrder(storeId: string, payload: any) {
    return this.http.post<{ order: any; receipt: any }>(
      `${API_URL}/sellers/my-stores/${storeId}/pos/orders`,
      payload
    );
  }

  getPosOrders(storeId: string, query?: any) {
    return this.http.get<{ orders: any[]; total: number; page: number; totalPages: number }>(
      `${API_URL}/sellers/my-stores/${storeId}/pos/orders`,
      { params: query || {} }
    );
  }

  createPosRefund(storeId: string, orderId: string, payload: { items: any[]; reason: string; refundMethod?: string }) {
    return this.http.post<any>(
      `${API_URL}/sellers/my-stores/${storeId}/pos/orders/${orderId}/refund`,
      payload
    );
  }

  voidPosOrder(storeId: string, orderId: string, reason?: string) {
    return this.http.post<any>(
      `${API_URL}/sellers/my-stores/${storeId}/pos/orders/${orderId}/void`,
      { reason: reason || 'Manager Void' }
    );
  }

  listPosRefunds(storeId: string) {
    return this.http.get<any[]>(`${API_URL}/sellers/my-stores/${storeId}/pos/refunds`);
  }

  getPosReports(storeId: string, params?: { startDate?: string; endDate?: string }) {
    return this.http.get<any>(`${API_URL}/sellers/my-stores/${storeId}/pos/reports`, {
      params: params || {},
    });
  }

  generatePosKhqr(storeId: string, payload: { amount: number; items?: any[]; customerName?: string; customerPhone?: string }) {
    return this.http.post<any>(
      `${API_URL}/sellers/my-stores/${storeId}/pos/khqr/generate`,
      payload
    );
  }

  checkPosKhqr(storeId: string, tranId: string) {
    return this.http.get<{ tranId: string; status: string; paid: boolean }>(
      `${API_URL}/sellers/my-stores/${storeId}/pos/khqr/check/${encodeURIComponent(tranId)}`
    );
  }

  simulatePosKhqr(storeId: string, tranId: string) {
    return this.http.post<{ tranId: string; status: string; paid: boolean; simulated: boolean }>(
      `${API_URL}/sellers/my-stores/${storeId}/pos/khqr/simulate/${encodeURIComponent(tranId)}`,
      {}
    );
  }

  updateOrderStatus(orderId: string, status: string) {
    return this.http.patch<any>(`${API_URL}/orders/${orderId}/status`, { status });
  }

  // ------------------------------------------------------------- Store Promotions / Discounts
  getStorePromotions(storeId: string) {
    return this.http.get<any[]>(`${API_URL}/sellers/my-stores/${storeId}/promotions`);
  }

  createStorePromotion(storeId: string, payload: any) {
    return this.http.post<any>(`${API_URL}/sellers/my-stores/${storeId}/promotions`, payload);
  }

  deleteStorePromotion(storeId: string, promoId: string) {
    return this.http.delete<any>(
      `${API_URL}/sellers/my-stores/${storeId}/promotions/${promoId}`
    );
  }

  // ------------------------------------------------------------- Support Cases
  getStoreSupportCases(storeId: string) {
    return this.http.get<any[]>(`${API_URL}/sellers/my-stores/${storeId}/support-cases`);
  }

  createStoreSupportCase(storeId: string, payload: any) {
    return this.http.post<any>(
      `${API_URL}/sellers/my-stores/${storeId}/support-cases`,
      payload
    );
  }

  replyStoreSupportCase(storeId: string, caseId: string, text: string) {
    return this.http.post<any>(
      `${API_URL}/sellers/my-stores/${storeId}/support-cases/${caseId}/reply`,
      { text }
    );
  }

  // ------------------------------------------------------------- Finance, Notifications, Analytics
  getStoreFinance(storeId: string) {
    return this.http.get<any>(`${API_URL}/sellers/my-stores/${storeId}/finance`);
  }

  getStoreNotifications(storeId: string) {
    return this.http.get<any[]>(`${API_URL}/sellers/my-stores/${storeId}/notifications`);
  }

  getStoreAnalytics(storeId: string, period: 'today' | '7d' | '30d' | 'all' = '30d') {
    return this.http.get<any>(`${API_URL}/sellers/my-stores/${storeId}/analytics`, {
      params: { period },
    });
  }
}
