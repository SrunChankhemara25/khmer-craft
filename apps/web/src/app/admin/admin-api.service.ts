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

// ------------------------------------------------------------ monitoring
export type BillingStatus = 'paying' | 'expiring' | 'lapsed' | 'free';
export type PlanCode = 'STARTER' | 'STANDARD' | 'PREMIUM';

export interface Pagination { page: number; limit: number; total: number; totalPages: number }

/** GET /api/admin/overview — mirrors admin.service.ts#getOverview. */
export interface AdminOverview {
  generatedAt: string;
  sellers: { accounts: number; newThisMonth: number; suspended: number; stores: number; newStoresThisMonth: number; onboarded: number; verified: number };
  buyers: { accounts: number; newThisMonth: number };
  subscriptions: {
    paying: number; expiring: number; lapsed: number; free: number;
    byPlan: { STANDARD: number; PREMIUM: number };
    mrr: number;
    prices: { STANDARD: number; PREMIUM: number };
    labels: { STANDARD: string; PREMIUM: string };
    expiringSoon: { storeId: string; storeName: string; slug: string; plan: PlanCode; expiresAt: string | null }[];
  };
  revenue: { allTime: number; thisMonth: number; pendingPayments: number; failedThisMonth: number };
  requests: { verification: number; slides: number; total: number };
  slides: { live: number; pending: number };
  series: { month: string; label: string; newStores: number; planPayments: number; revenue: number }[];
}

export interface AdminSellerRow {
  storeId: string;
  storeName: string;
  slug: string;
  category: string | null;
  location: string | null;
  createdAt: string | null;
  onboardingStatus: 'PENDING' | 'COMPLETED';
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED';
  productCount: number;
  owner: { id: string; name: string; email: string; status: 'ACTIVE' | 'SUSPENDED'; role: string; joinedAt: string | null } | null;
  billing: {
    status: BillingStatus;
    plan: PlanCode;
    effectivePlan: PlanCode;
    planLabel: string;
    monthlyPrice: number;
    expiresAt: string | null;
    totalPaid: number;
    paidCount: number;
    lastPaidAt: string | null;
    lastAttemptStatus: string | null;
    lastAttemptAt: string | null;
  };
}

export interface AdminSellerList { sellers: AdminSellerRow[]; pagination: Pagination }

export interface AdminPlanPayment {
  id: string;
  tranId: string;
  storeId: string;
  storeName: string;
  storeSlug: string | null;
  payerName: string | null;
  payerEmail: string | null;
  plan: PlanCode;
  planLabel: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface AdminPlanPaymentList { payments: AdminPlanPayment[]; pagination: Pagination }

// ---------------------------------------------------------------- slides
export type SlidePlacement = 'HERO' | 'BRAND_ADS';
export type SlideStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PAUSED' | 'REJECTED' | 'EXPIRED';

export interface AdminSlide {
  _id: string;
  id: string;
  isHouse?: boolean;
  placement: SlidePlacement;
  sortOrder?: number;
  storeId?: string;
  storeName: string;
  storeSlug?: string;
  campaignTitle?: string;
  theme: string;
  badge: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  targetType: 'STORE' | 'PRODUCT';
  targetUrl: string;
  buttonText: string;
  startDate: string;
  endDate: string;
  days: number;
  totalPrice: number;
  isPaid: boolean;
  status: SlideStatus;
  rejectionReason?: string;
  isLive: boolean;
  createdAt: string;
}

export interface SlideInput {
  placement: SlidePlacement;
  badge?: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  targetUrl: string;
  buttonText?: string;
  startDate?: string;
  endDate?: string;
  publish?: boolean;
}

// --------------------------------------------------------------- payouts
export interface PayoutRules {
  commissionRate: number;
  payoutSchedule: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  payoutWeekday: number;
  holdDays: number;
  minimumPayout: number;
  nextPayoutDate: string;
}

export interface PayoutAccountRow {
  id: string;
  storeId: string;
  storeName: string;
  storeSlug: string | null;
  method: string;
  bankName: string | null;
  accountName: string;
  accountNumber: string;
  phone: string | null;
  khqrImage: string | null;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  verifiedAt: string | null;
  rejectionReason: string | null;
  updatedAt: string | null;
}

export interface PayoutBalanceRow {
  storeId: string;
  storeName: string;
  slug: string;
  available: number;
  onHold: number;
  readyOrders: number;
  grossSales: number;
  commission: number;
  account: Pick<PayoutAccountRow, 'id' | 'method' | 'bankName' | 'accountName' | 'accountNumber' | 'status'> | null;
  pendingPayout: { id: string; payoutNumber: string; amount: number } | null;
  lastPaidAt: string | null;
  totalPaid: number;
  due: boolean;
  canPay: boolean;
  blockedReason: string | null;
}

export interface PayoutBalances {
  settings: PayoutRules;
  totals: { dueNow: number; dueStores: number; onHold: number; owedBySellers: number; commissionEarned: number; accountsToVerify: number; pendingPayouts: number };
  stores: PayoutBalanceRow[];
}

export interface PayoutRecord {
  id: string;
  payoutNumber: string;
  storeId: string;
  storeName: string;
  amount: number;
  commissionRate: number;
  grossSales: number;
  commissionTotal: number;
  orderCount: number;
  account: { method: string; bankName?: string; accountName: string; accountNumber: string };
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  reference: string | null;
  hasProof: boolean;
  note: string | null;
  paidAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

export interface PayoutDetail extends PayoutRecord {
  proofUrl: string | null;
  lines: { orderId: string; orderNumber: string; collectedBy: 'KHMERCRAFT' | 'SELLER'; gross: number; refunded: number; commission: number; net: number }[];
}

export interface MarkPaidBody { proofUrl: string; reference?: string; note?: string }

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
  readonly badgeSlides = signal<number | null>(null);
  /** Payout accounts to verify + stores due a payout. */
  readonly badgePayouts = signal<number | null>(null);

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
    this.overview().subscribe({
      next: (o) => this.badgeSlides.set(o.requests.slides),
      error: () => this.badgeSlides.set(null),
    });
    this.payoutBalances().subscribe({
      next: (b) => this.badgePayouts.set(b.totals.accountsToVerify + b.totals.dueStores + b.totals.pendingPayouts),
      error: () => this.badgePayouts.set(null),
    });
  }

  // ------------------------------------------------------------ monitoring
  /** ADMIN-only — seller, subscription, revenue and request counts. */
  overview(): Observable<AdminOverview> {
    return this.http.get<AdminOverview>(`${API_URL}/admin/overview`);
  }

  /** ADMIN-only — stores joined with owner account and billing history. */
  sellerAccounts(query: { billing?: BillingStatus | 'all'; q?: string; storeIds?: string[]; page?: number; limit?: number } = {}): Observable<AdminSellerList> {
    const params: Record<string, string> = { page: String(query.page ?? 1), limit: String(query.limit ?? 20) };
    if (query.billing && query.billing !== 'all') params['billing'] = query.billing;
    if (query.q?.trim()) params['q'] = query.q.trim();
    if (query.storeIds?.length) params['storeIds'] = query.storeIds.join(',');
    return this.http.get<AdminSellerList>(`${API_URL}/admin/sellers`, { params });
  }

  planPayments(query: { status?: string; page?: number; limit?: number } = {}): Observable<AdminPlanPaymentList> {
    const params: Record<string, string> = { page: String(query.page ?? 1), limit: String(query.limit ?? 20) };
    if (query.status && query.status !== 'ALL') params['status'] = query.status;
    return this.http.get<AdminPlanPaymentList>(`${API_URL}/admin/subscription-payments`, { params });
  }

  /** Enforced server-side: a suspended user is signed out everywhere. */
  setUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED', reason?: string) {
    return this.http.patch<{ id: string; status: 'ACTIVE' | 'SUSPENDED' }>(
      `${API_URL}/admin/users/${userId}/status`,
      reason ? { status, reason } : { status },
    );
  }

  // --------------------------------------------------------------- payouts
  payoutBalances(): Observable<PayoutBalances> {
    return this.http.get<PayoutBalances>(`${API_URL}/payouts/admin/balances`);
  }

  payoutAccounts(status = 'ALL'): Observable<PayoutAccountRow[]> {
    return this.http.get<PayoutAccountRow[]>(`${API_URL}/payouts/admin/accounts`, { params: status === 'ALL' ? {} : { status } });
  }

  reviewPayoutAccount(id: string, status: 'VERIFIED' | 'REJECTED', reason?: string) {
    return this.http.patch<PayoutAccountRow>(`${API_URL}/payouts/admin/accounts/${id}`, reason ? { status, reason } : { status });
  }

  payouts(query: { status?: string; storeId?: string; page?: number } = {}) {
    const params: Record<string, string> = { page: String(query.page ?? 1) };
    if (query.status && query.status !== 'ALL') params['status'] = query.status;
    if (query.storeId) params['storeId'] = query.storeId;
    return this.http.get<{ payouts: PayoutRecord[]; paidAllTime: number; pagination: Pagination }>(`${API_URL}/payouts/admin/payouts`, { params });
  }

  payoutDetail(id: string): Observable<PayoutDetail> {
    return this.http.get<PayoutDetail>(`${API_URL}/payouts/${id}`);
  }

  /** One click: lock the store's ready balance and record it paid with the receipt. */
  payStore(storeId: string, paid: MarkPaidBody): Observable<PayoutRecord> {
    return this.http.post<PayoutRecord>(`${API_URL}/payouts/admin/payouts`, { storeId, paid });
  }

  markPayoutPaid(id: string, paid: MarkPaidBody): Observable<PayoutRecord> {
    return this.http.post<PayoutRecord>(`${API_URL}/payouts/admin/payouts/${id}/paid`, paid);
  }

  cancelPayout(id: string, reason: string) {
    return this.http.post<PayoutRecord>(`${API_URL}/payouts/admin/payouts/${id}/cancel`, { reason });
  }

  runDuePayouts() {
    return this.http.post<{ created: PayoutRecord[]; skipped: { storeId: string; storeName: string; reason: string }[] }>(
      `${API_URL}/payouts/admin/payouts/run-due`, {},
    );
  }

  savePayoutRules(rules: Omit<PayoutRules, 'nextPayoutDate'>) {
    return this.http.put<PayoutRules>(`${API_URL}/payouts/admin/settings`, rules);
  }

  // ---------------------------------------------------------------- slides
  slides(status = 'ALL', placement: SlidePlacement | 'ALL' = 'ALL'): Observable<AdminSlide[]> {
    const params: Record<string, string> = {};
    if (status !== 'ALL') params['status'] = status;
    if (placement !== 'ALL') params['placement'] = placement;
    return this.http.get<AdminSlide[]>(`${API_URL}/promotions/admin/slides`, { params });
  }

  createSlide(input: SlideInput): Observable<AdminSlide> {
    return this.http.post<AdminSlide>(`${API_URL}/promotions/admin/slides`, input);
  }

  updateSlide(id: string, input: Partial<SlideInput>): Observable<AdminSlide> {
    return this.http.patch<AdminSlide>(`${API_URL}/promotions/admin/slides/${id}`, input);
  }

  setSlideStatus(id: string, status: 'APPROVED' | 'PAUSED' | 'DRAFT'): Observable<AdminSlide> {
    return this.http.patch<AdminSlide>(`${API_URL}/promotions/admin/slides/${id}/status`, { status });
  }

  deleteSlide(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${API_URL}/promotions/admin/slides/${id}`);
  }

  reorderSlides(placement: SlidePlacement, ids: string[]): Observable<AdminSlide[]> {
    return this.http.put<AdminSlide[]>(`${API_URL}/promotions/admin/slides/reorder`, { placement, ids });
  }

  // ------------------------------------------------------------- Promotions
  getPromotionCampaigns(): Observable<any[]> {
    return this.http.get<any[]>(`${API_URL}/promotions/campaigns`);
  }

  createPromotionCampaign(payload: any): Observable<any> {
    return this.http.post<any>(`${API_URL}/promotions/campaigns`, payload);
  }

  updatePromotionCampaign(id: string, payload: any): Observable<any> {
    return this.http.patch<any>(`${API_URL}/promotions/campaigns/${id}`, payload);
  }


  reviewPromotionSlide(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string): Observable<any> {
    return this.http.patch<any>(`${API_URL}/promotions/admin/slides/${id}/review`, {
      status,
      rejectionReason,
    });
  }
}