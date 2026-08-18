import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

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

@Injectable({ providedIn: 'root' })
export class SellerService {
  private readonly http = inject(HttpClient);

  getStoreOrders(storeId: string) {
    return this.http.get<OrdersDashboardResponse>(
      `${environment.apiUrl}/sellers/my-stores/${storeId}/orders`
    );
  }

  getStoreProfile(storeId: string) {
    return this.http.get<any>(`${environment.apiUrl}/sellers/my-stores/${storeId}`);
  }

  updateStoreProfile(storeId: string, data: any) {
    return this.http.put<any>(`${environment.apiUrl}/sellers/my-stores/${storeId}/profile`, data);
  }

  getStoreReviews(storeId: string) {
    return this.http.get<any>(`${environment.apiUrl}/sellers/my-stores/${storeId}/reviews`);
  }

  getStoreProducts(storeId: string) {
    return this.http.get<any>(`${environment.apiUrl}/catalog?sellerId=${storeId}`);
  }

  createProduct(data: any) {
    return this.http.post<any>(`${environment.apiUrl}/catalog`, data);
  }
}
