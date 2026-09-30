import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../core/api/api.config';
import { CommerceApiService, ProductQuery } from '../core/api/commerce-api.service';
import { ApiProduct, ApiProductList } from '../core/api/api.models';

/** A product row mapped from the live marketplace API into admin-friendly shape. */
export interface LiveProduct {
  id: string;
  name: string;
  slug: string;
  seller: string;
  category: string;
  price: number;
  stock: number;
  sold: number;
  image: string | null;
  status: 'active' | 'pending' | 'hidden';
  description: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_MAP: Record<string, LiveProduct['status']> = {
  ACTIVE: 'active',
  DRAFT: 'pending',
  ARCHIVED: 'hidden',
};

/** Mirrors SellerApplication.ts on the API. */
export type ApplicationStatus =
  | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type ApplicationDecision = 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface SellerApplication {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  province: string;
  primaryCategory: string;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

/** Fields the API accepts on PATCH /api/products/:id (admin included). */
export interface LiveProductPatch {
  name?: string;
  description?: string;
  price?: number;
  compareAtPrice?: number | null;
  category?: string;
  subcategory?: string | null;
  location?: string;
  image?: string | null;
  images?: string[];
  stock?: number;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
}

/**
 * The admin's bridge to the REAL commerce API.
 *
 * Reads (products, stores) are public. Writes go through endpoints that
 * already authorise ADMIN server-side: product moderation (ownership is
 * bypassed for admins in catalog.service.ts#loadOwned) and the seller
 * application queue (authorize('ADMIN') in sellers.routes.ts). Anything
 * without a server endpoint stays out of this service on purpose.
 */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(CommerceApiService);

  /** Sidebar badges: real pending counts, null when not authorised. */
  readonly badgeApps = signal<number | null>(null);
  readonly badgeDrafts = signal<number | null>(null);

  products(query: ProductQuery = {}) {
    return this.api.listProducts(query);
  }

  stores(page = 1, limit = 20) {
    return this.api.listStores(page, limit);
  }

  toLive(p: ApiProduct): LiveProduct {
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      seller: p.storeName ?? p.sellerName,
      category: p.subcategory ? `${p.category} · ${p.subcategory}` : p.category,
      price: p.price,
      stock: p.stock,
      sold: p.soldCount,
      image: p.image,
      status: STATUS_MAP[p.status] ?? 'active',
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  // ---------------------------------------------------------- applications
  /** ADMIN-only queue — GET /api/sellers/apply. */
  applications(): Observable<SellerApplication[]> {
    return this.http.get<SellerApplication[]>(`${API_URL}/sellers/apply`);
  }

  /** ADMIN-only decision — reject without a reason is a 422 server-side. */
  reviewApplication(id: string, decision: ApplicationDecision, rejectionReason?: string): Observable<SellerApplication> {
    return this.http.patch<SellerApplication>(
      `${API_URL}/sellers/apply/${id}`,
      rejectionReason ? { decision, rejectionReason } : { decision },
    );
  }

  // ------------------------------------------------------- product moderation
  /** Admin bypasses ownership server-side — real moderation write. */
  updateProduct(id: string, patch: LiveProductPatch): Observable<ApiProduct> {
    return this.http.patch<ApiProduct>(`${API_URL}/products/${id}`, patch);
  }

  /** The API's "delete" is an archive — past orders keep resolving. */
  archiveProduct(id: string): Observable<ApiProduct> {
    return this.http.delete<ApiProduct>(`${API_URL}/products/${id}`);
  }

  /** Public status filter: how many DRAFT listings await moderation. */
  draftCount(): Observable<number> {
    return new Observable<number>((subscriber) => {
      this.http
        .get<ApiProductList>(`${API_URL}/products`, { params: { status: 'DRAFT', limit: '1' } })
        .subscribe({
          next: (res) => { subscriber.next(res.total); subscriber.complete(); },
          error: (e) => subscriber.error(e),
        });
    });
  }

  /** Refresh both sidebar badges; call after any moderation/decision write. */
  refreshBadges(): void {
    this.applications().subscribe({
      next: (list) =>
        this.badgeApps.set(list.filter((a) => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length),
      error: () => this.badgeApps.set(null),
    });
    this.draftCount().subscribe({
      next: (n) => this.badgeDrafts.set(n),
      error: () => this.badgeDrafts.set(null),
    });
  }
}