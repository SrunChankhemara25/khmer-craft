import { StoreAppearance } from '../catalog/store-appearance';
/**
 * Wire types for the commerce API.
 *
 * These mirror the server's response shapes exactly. Components should keep
 * using the domain types in core/catalog/catalog.models where possible; these
 * exist so the mapping happens in one place instead of being guessed at each
 * call site.
 */

export type ApiStockStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  category: string;
  subcategory: string | null;
  sellerId: string | null;
  sellerName: string;
  storeName: string | null;
  location: string;
  image: string | null;
  images: string[];
  variants?: { label: string; image: string }[];
  rating: number;
  reviewCount: number;
  stock: number;
  soldCount: number;
  status: ApiStockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApiStore {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  rating: number;
  reviewCount: number;
  categoryName: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  tagline: string | null;
  announcement: string | null;
  appearance?: StoreAppearance | null;
  theme: 'FOREST' | 'CLAY' | 'GOLD' | 'MIDNIGHT';
  phoneNumber: string | null;
  showContact: boolean;
  featuredProductIds: string[];
}

export interface ApiStoreList {
  stores: ApiStore[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiProductDetail extends ApiProduct {
  relatedProducts: ApiProduct[];
}

export interface ApiProductList {
  products: ApiProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  appliedFilters: Record<string, string | number | null>;
}

/** GET /api/products/mine has no filter echo — it's always "everything I own". */
export interface ApiMyProductList {
  products: ApiProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Mirrors createProductSchema on the server. Ownership fields (sellerName,
 * sellerUserId) are deliberately absent — the server stamps those from the
 * session, and rejects a payload that tries to send them.
 */
export interface ApiCreateProductInput {
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  subcategory?: string;
  location?: string;
  image?: string;
  images?: string[];
  stock: number;
  status: ApiStockStatus;
  storeId?: string;
}

export interface ApiCartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  sellerId: string | null;
  sellerName: string;
  storeName: string | null;
  price: number;
  quantity: number;
  subtotal: number;
  stock: number;
  status: ApiStockStatus;
}

export interface ApiCart {
  id: string;
  userId: string;
  items: ApiCartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'COD' | 'ABA_PAYWAY' | 'ABA_DEMO' | 'STRIPE_SANDBOX';

export interface ApiDeliveryInfo {
  fullName: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  note?: string;
}

export interface ApiOrderItem {
  productId: string;
  productName: string;
  productImage: string | null;
  sellerId: string | null;
  sellerUserId: string | null;
  sellerName: string;
  storeName: string | null;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface ApiStatusEvent {
  status: OrderStatus;
  at: string;
  by: 'BUYER' | 'SELLER' | 'ADMIN' | 'SYSTEM';
  note: string | null;
}

export interface ApiOrder {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  items: ApiOrderItem[];
  deliveryInfo: ApiDeliveryInfo;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  hasPaymentTranId: boolean;
  orderStatus: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  statusHistory: ApiStatusEvent[];
  createdAt: string;
  updatedAt: string;
}

/**
 * A live ABA PayWay transaction, whatever it pays for.
 *
 * There is no redirect to a hosted ABA page: the merchant account is KHQR, so
 * PayWay answers the server with a QR and KhmerCraft shows it itself.
 */
export interface ApiPaywayQr {
  tranId: string;
  amount: number;
  currency: string;
  /** `data:image/png;base64,…`, ready for an <img src>. */
  qrImage: string;
  /** The EMVCo payload behind the QR, for copy-to-clipboard. */
  qrString: string;
  /** `abamobilebank://…` — opens the ABA app on this payment. */
  deeplink?: string;
  appStore?: string;
  playStore?: string;
  expiresAt: string;
}

/** Paying for an order. */
export interface ApiPaywayCheckoutSession extends ApiPaywayQr {
  orderNumber: string;
}

/** The answer to "has this order actually been paid?", checked with ABA. */
export interface ApiPaymentStatus {
  orderNumber: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  paid: boolean;
}

// ------------------------------------------------------------ seller plans
export type PaidPlan = 'STANDARD' | 'PREMIUM';
export type SellerPlan = 'STARTER' | PaidPlan;
export type SubscriptionPaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED';

/**
 * A store's plan standing.
 *
 * `plan` is what was bought and `effectivePlan` is what the store is actually
 * entitled to today — they differ the moment a paid plan lapses, and feature
 * gates must read `effectivePlan`.
 */
export interface ApiSubscription {
  storeId: string;
  storeName: string;
  plan: SellerPlan;
  effectivePlan: SellerPlan;
  expiresAt: string | null;
  active: boolean;
  prices: Record<PaidPlan, number>;
  periodDays: number;
}

/** Paying for a seller plan. */
export interface ApiPlanCheckoutSession extends ApiPaywayQr {
  paymentId: string;
  storeId: string;
  plan: PaidPlan;
  planLabel: string;
  periodDays: number;
}

export interface ApiPlanPaymentStatus {
  paymentId: string;
  plan: PaidPlan;
  status: SubscriptionPaymentStatus;
  paid: boolean;
  expiresAt: string | null;
  subscription: ApiSubscription;
}

export interface ApiSubscriptionPayment {
  id: string;
  plan: PaidPlan;
  planLabel: string;
  amount: number;
  currency: string;
  status: SubscriptionPaymentStatus;
  paidAt: string | null;
  periodEnd: string | null;
  createdAt: string;
}

export interface ApiSubscriptionPayments {
  subscription: ApiSubscription;
  payments: ApiSubscriptionPayment[];
}

/** A seller's view adds their own share of a possibly multi-seller order. */
export interface ApiSellerOrder extends ApiOrder {
  myItems: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
  myTotal: number;
  availableActions: OrderStatus[];
}

export interface ApiOrderList<T = ApiOrder> {
  orders: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiCreatedOrder {
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  createdAt: string;
  message: string;
  order: ApiOrder;
}
