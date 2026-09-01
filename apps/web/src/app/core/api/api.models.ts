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
  name: string;
  location: string | null;
  rating: number;
  reviewCount: number;
  categoryName: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
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
export type PaymentMethod = 'COD' | 'ABA_DEMO' | 'STRIPE_SANDBOX';

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
  orderStatus: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  statusHistory: ApiStatusEvent[];
  createdAt: string;
  updatedAt: string;
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
