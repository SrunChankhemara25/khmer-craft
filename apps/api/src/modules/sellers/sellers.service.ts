import mongoose, { QueryFilter } from 'mongoose';
import Order, { IOrder } from '../../../models/Order';
import Review, { IReview } from '../../../models/Review';
import Product from '../../../models/Product';
import Store, { IStore } from '../../../models/Store';
import SellerApplication, {
  ISellerApplication,
} from '../../../models/SellerApplication';
import User from '../../../models/User';
import Discount from '../../../models/Discount';
import SupportCase from '../../../models/SupportCase';
import PosShift from '../../../models/PosShift';
import PosRegister from '../../../models/PosRegister';
import PosRefund from '../../../models/PosRefund';
import { PromotionSlide } from '../../../models/Promotion';
import { AppError } from '../../errors/app-error';
import { env } from '../../config/env';
import * as payway from '../payments/payway.gateway';
import { assertEmailConfigured } from '../../utils/email';
import { compressImage } from '../../utils/image';
import { slugify } from '../../utils/slugify';
import {
  CreateSellerApplicationInput,
  CreateStoreInput,
  ListStoresQuery,
  ListStoreOrdersQuery,
  ListStoreReviewsQuery,
  ReplyToReviewInput,
  ReviewSellerApplicationInput,
  UpdateStoreProfileInput,
} from './sellers.validation';

/**
 * Calls through the (mockable) `assertEmailConfigured` rather than reading
 * env vars directly, matching auth.service.ts#isEmailAvailable — so a test
 * that mocks it also changes what this reports, not just the real env.
 */
const isEmailAvailable = (): boolean => {
  try {
    assertEmailConfigured();
    return true;
  } catch {
    return false;
  }
};

/**
 * Public shape of a store — what any shopper browsing the marketplace sees.
 *
 * `isVerified` means exactly one thing: KhmerCraft has reviewed and approved
 * this seller's profile, contact information and store information. It is
 * not a claim of government verification, and nothing here exposes the
 * application's admin notes or documents.
 */
export const toPublicStore = (seller: IStore) => ({
  id: String(seller._id),
  slug: seller.slug,
  name: seller.storeName,
  location: seller.location ?? null,
  rating: seller.rating,
  reviewCount: seller.reviewCount,
  categoryName: seller.category ?? null,
  description: seller.storeDescription ?? null,
  tagline: seller.storeTagline ?? null,
  announcement: seller.announcement ?? null,
  theme: seller.theme ?? 'FOREST',
  appearance: seller.appearance ?? null,
  phoneNumber: seller.showContact ? seller.phoneNumber ?? null : null,
  showContact: seller.showContact ?? false,
  featuredProductIds: (seller.featuredProductIds ?? []).map(String),
  logoUrl: seller.storeAvatarUrl ?? null,
  bannerUrl: seller.storeCoverImages?.[0] ?? null,
  isVerified: seller.verificationStatus === 'VERIFIED',
  verifiedAt: seller.verifiedAt ?? null,
  verificationExplanation:
    seller.verificationStatus === 'VERIFIED'
      ? "KhmerCraft has reviewed and approved this seller's profile, contact information and store information."
      : null,
  subscriptionPlan: seller.subscriptionPlan ?? 'STARTER',
  planExpiresAt: seller.planExpiresAt ? seller.planExpiresAt.toISOString() : null,
  isPaidPlan:
    seller.subscriptionPlan !== 'STARTER' &&
    !!seller.planExpiresAt &&
    seller.planExpiresAt.getTime() > Date.now(),
});

/** Private shape — includes the seller's own operational fields. */
const toOwnerStore = (seller: IStore) => ({
  id: String(seller._id),
  slug: seller.slug,
  storeName: seller.storeName,
  storeDescription: seller.storeDescription ?? null,
  storeTagline: seller.storeTagline ?? null,
  announcement: seller.announcement ?? null,
  theme: seller.theme ?? 'FOREST',
  appearance: seller.appearance ?? null,
  showContact: seller.showContact ?? false,
  featuredProductIds: (seller.featuredProductIds ?? []).map(String),
  location: seller.location ?? null,
  phoneNumber: seller.phoneNumber ?? null,
  logoUrl: seller.storeAvatarUrl ?? null,
  bannerUrl: seller.storeCoverImages?.[0] ?? null,
  subscriptionPlan: seller.subscriptionPlan,
  planExpiresAt: seller.planExpiresAt ? seller.planExpiresAt.toISOString() : null,
  onboardingStatus: seller.onboardingStatus,
  verificationStatus: seller.verificationStatus,
  verifiedAt: seller.verifiedAt ?? null,
  category: seller.category ?? null,
  rating: seller.rating,
  reviewCount: seller.reviewCount,
});

/** Unique slug; suffix on collision so a second "Silk Heritage" is not blocked. */
const uniqueStoreSlug = async (name: string): Promise<string> => {
  const base = slugify(name);
  let slug = base;
  for (let attempt = 2; await Store.exists({ slug }); attempt += 1) {
    slug = `${base}-${attempt}`;
  }
  return slug;
};

export type PublicStore = ReturnType<typeof toPublicStore>;
export type OwnerStore = ReturnType<typeof toOwnerStore>;

export const listPublicStores = async (query: ListStoresQuery) => {
  const skip = (query.page - 1) * query.limit;
  const [sellers, total] = await Promise.all([
    Store.find({ onboardingStatus: 'COMPLETED' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Store.countDocuments({ onboardingStatus: 'COMPLETED' }),
  ]);

  return {
    stores: sellers.map(toPublicStore),
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
};

/** Looks up by Mongo id or by slug, so `/stores/:storeId` works for both. */
export const getPublicStore = async (idOrSlug: string) => {
  const seller = mongoose.isValidObjectId(idOrSlug)
    ? await Store.findById(idOrSlug)
    : await Store.findOne({ slug: idOrSlug });

  if (!seller || seller.onboardingStatus !== 'COMPLETED') {
    throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND');
  }
  return toPublicStore(seller);
};

/** Every store owned by the signed-in user. Read-only — creating one is a separate action. */
export const listMyStores = async (userId: string) => {
  const sellers = await Store.find({ userId });
  return sellers.map(toOwnerStore);
};

/**
 * A user becomes a seller by creating their first store — there is no
 * separate "upgrade my account" step, this call is the whole onboarding
 * flow. It both finishes the store (subscriptionPlan/paymentMethod are the
 * plan-selection step of the same form) and promotes the account to SELLER.
 *
 * Promoting the role changes what the user's *next* access token must say,
 * but the token already presented for *this* request was signed with the
 * old role — the caller (controller) is responsible for reissuing the
 * session cookies with `roleChanged` in the response, exactly like login
 * does, or the very next request fails `authenticate`'s role check.
 */
export const createStore = async (userId: string, input: CreateStoreInput) => {
  const owner = await User.findById(userId);
  if (!owner || owner.status !== 'ACTIVE') {
    throw new AppError(403, 'This account is not active.', 'ACCOUNT_INACTIVE');
  }
  // Only enforced once a real email provider exists to have verified them
  // with in the first place — see isEmailAvailable above and the same
  // reasoning in auth.service.ts#register.
  if (isEmailAvailable() && !owner.email_verified) {
    throw new AppError(403, 'Verify your email before creating a store.', 'EMAIL_NOT_VERIFIED');
  }
  // If KhmerCraft already approved this seller's application before they
  // finished setting up a store, the store opens already verified — the
  // approval, not the order the two steps happened in, is what matters.
  const approvedApplication = await SellerApplication.findOne({
    userId,
    status: 'APPROVED',
  }).sort({ reviewedAt: -1 });

  const seller = await Store.create({
    userId,
    storeName: input.storeName,
    slug: await uniqueStoreSlug(input.storeName),
    storeDescription: input.storeDescription,
    appearance: input.appearance,
    storeAvatarUrl: input.logoUrl ? await compressImage(input.logoUrl, 320) : undefined,
    storeCoverImages: input.bannerUrl ? [(await compressImage(input.bannerUrl, 1280)) ?? input.bannerUrl] : [],
    location: input.location,
    phoneNumber: input.phoneNumber,
    category: input.category,
    // Always STARTER, whatever plan onboarding asked for. A paid plan is
    // granted by `subscriptions.service.ts` once ABA confirms the money
    // arrived — taking the seller's word for it here is how a $12 plan ends
    // up costing nothing. The requested plan is echoed back as
    // `pendingPlan` so the web app can send them straight to its QR.
    subscriptionPlan: 'STARTER',
    paymentMethod: input.paymentMethod,
    onboardingStatus: 'COMPLETED',
    verificationStatus: approvedApplication ? 'VERIFIED' : 'UNVERIFIED',
    verifiedAt: approvedApplication ? new Date() : null,
  });

  let roleChanged = false;
  if (input.subscriptionPlan || input.paymentMethod) {
    // Only the "finish onboarding" call (the one that actually picks a plan)
    // promotes the account — creating a second store from an existing
    // seller's dashboard must not touch their role at all.
    const user = await User.findById(userId);
    if (user && user.role === 'BUYER') {
      user.role = 'SELLER';
      await user.save();
      roleChanged = true;
    }
  }

  // What they asked for but have not paid for yet, so the web app can send
  // them straight to its QR. Null for STARTER, which costs nothing.
  const pendingPlan =
    input.subscriptionPlan && input.subscriptionPlan !== 'STARTER'
      ? input.subscriptionPlan
      : null;

  return { store: toOwnerStore(seller), roleChanged, pendingPlan };
};

/**
 * Load a store and confirm the caller owns it — every new owner-gated
 * resource (store categories, collections, storefront config) reuses this
 * exact check rather than duplicating it. Deliberately 404, not 403: a
 * non-owner should not be able to tell a store id exists at all.
 */
export const findOwnedStore = async (storeId: string, userId: string): Promise<IStore> => {
  const seller = await Store.findById(storeId);
  if (!seller || String(seller.userId) !== userId) {
    throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND');
  }
  return seller;
};

export const getStoreProfile = async (storeId: string, userId: string) => {
  const seller = await findOwnedStore(storeId, userId);
  return toOwnerStore(seller);
};

export const updateStoreProfile = async (
  storeId: string,
  userId: string,
  input: UpdateStoreProfileInput,
) => {
  const seller = await findOwnedStore(storeId, userId);

  if (input.storeName !== undefined) seller.storeName = input.storeName;
  if (input.storeDescription !== undefined) seller.storeDescription = input.storeDescription;
  if (input.storeTagline !== undefined) seller.storeTagline = input.storeTagline;
  if (input.announcement !== undefined) seller.announcement = input.announcement;
  if (input.theme !== undefined) seller.theme = input.theme;
  if (input.category !== undefined) seller.category = input.category;
  if (input.appearance !== undefined) {
    seller.appearance = {
      style: input.appearance.style ?? seller.appearance?.style ?? 'clean',
      font: input.appearance.font ?? seller.appearance?.font ?? 'sans',
      brandColor: input.appearance.brandColor ?? seller.appearance?.brandColor ?? '#275643',
      shade: input.appearance.shade ?? seller.appearance?.shade ?? 0,
    };
  }
  if (input.showContact !== undefined) seller.showContact = input.showContact;
  if (input.location !== undefined) seller.location = input.location;
  if (input.phoneNumber !== undefined) seller.phoneNumber = input.phoneNumber;
  // See utils/image.ts — a logo/banner otherwise rides along on every
  // public store listing forever, not just this store's own page.
  if (input.logoUrl !== undefined)
    seller.storeAvatarUrl = await compressImage(input.logoUrl, 320);
  if (input.bannerUrl !== undefined) {
    const banner = await compressImage(input.bannerUrl, 1280);
    seller.storeCoverImages = banner ? [banner] : [];
  }
  if (input.featuredProductIds !== undefined) {
    const uniqueIds = [...new Set(input.featuredProductIds)];
    const ownedCount = await Product.countDocuments({
      _id: { $in: uniqueIds },
      sellerId: seller._id,
      sellerUserId: seller.userId,
    });
    if (ownedCount !== uniqueIds.length) {
      throw new AppError(422, 'Featured products must belong to this store', 'INVALID_FEATURED_PRODUCTS');
    }
    seller.featuredProductIds = uniqueIds.map((id) => new mongoose.Types.ObjectId(id));
  }

  await seller.save();

  const productPatch: Record<string, string> = {};
  if (input.storeName !== undefined) productPatch.storeName = input.storeName;
  if (input.location !== undefined) productPatch.location = input.location;
  if (Object.keys(productPatch).length) {
    await Product.updateMany({ sellerId: seller._id }, { $set: productPatch });
  }
  return toOwnerStore(seller);
};

// ------------------------------------------------------------------ orders

const DATE_RANGE_TO_SINCE: Record<string, () => Date> = {
  '7d': () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  '30d': () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  month: () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  },
};

export const getStoreOrders = async (
  storeId: string,
  userId: string,
  query: ListStoreOrdersQuery,
) => {
  const store = await findOwnedStore(storeId, userId);
  const storeObjectId = store._id;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [pendingCount, inTransitCount, completed30dCount, revenueResult] = await Promise.all([
    Order.countDocuments({ 'items.sellerId': storeObjectId, orderStatus: 'PENDING' }),
    Order.countDocuments({ 'items.sellerId': storeObjectId, orderStatus: 'SHIPPED' }),
    Order.countDocuments({
      'items.sellerId': storeObjectId,
      orderStatus: 'DELIVERED',
      createdAt: { $gte: thirtyDaysAgo },
    }),
    Order.aggregate([
      { $match: { 'items.sellerId': storeObjectId, paymentStatus: 'PAID', createdAt: { $gte: firstDayOfMonth } } },
      { $unwind: '$items' },
      { $match: { 'items.sellerId': storeObjectId } },
      { $group: { _id: null, totalRevenue: { $sum: '$items.subtotal' } } },
    ]),
  ]);

  const filter: QueryFilter<IOrder> = { 'items.sellerId': storeObjectId };
  if (query.status) {
    filter.orderStatus = query.status;
  }
  if (query.search) {
    const searchRegex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ orderNumber: searchRegex }, { buyerName: searchRegex }];
  }
  if (query.dateRange) {
    filter.createdAt = mongoose.trusted({ $gte: DATE_RANGE_TO_SINCE[query.dateRange]() });
  }

  const skip = (query.page - 1) * query.limit;
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Order.countDocuments(filter),
  ]);

  const formattedOrders = orders.map((order) => {
    const myItems = order.items.filter((item) => String(item.sellerId) === String(storeObjectId));
    const myTotal = myItems.reduce((sum, item) => sum + item.subtotal, 0);
    return {
      id: String(order._id),
      orderNumber: order.orderNumber,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      deliveryInfo: order.deliveryInfo,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      createdAt: order.createdAt,
      myItems,
      myTotal,
    };
  });

  return {
    metrics: {
      pendingOrders: pendingCount,
      inTransit: inTransitCount,
      completed30d: completed30dCount,
      revenueMtd: revenueResult[0]?.totalRevenue ?? 0,
    },
    orders: formattedOrders,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
};

// ----------------------------------------------------------------- reviews

const toReviewResponse = (review: IReview) => ({
  id: String(review._id),
  buyerName: review.buyerName,
  productId: String(review.productId),
  productName: review.productName,
  rating: review.rating,
  comment: review.comment,
  sellerResponse: review.sellerResponse ?? null,
  isFlagged: review.isFlagged,
  createdAt: review.createdAt,
});

export const getStoreReviews = async (
  storeId: string,
  userId: string,
  query: ListStoreReviewsQuery,
) => {
  const store = await findOwnedStore(storeId, userId);

  const [statsResult] = await Review.aggregate([
    { $match: { sellerId: store._id } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        stars5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        stars4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        stars3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        stars2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        stars1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
      },
    },
    { $project: { _id: 0 } },
  ]);

  const filter: QueryFilter<IReview> = { sellerId: store._id };
  if (query.rating) {
    filter.rating = query.rating;
  }

  const reviews = await Review.find(filter)
    .sort({ createdAt: query.sort === 'oldest' ? 1 : -1 })
    .limit(50);

  return {
    stats: statsResult ?? {
      averageRating: 0,
      totalReviews: 0,
      stars5: 0,
      stars4: 0,
      stars3: 0,
      stars2: 0,
      stars1: 0,
    },
    reviews: reviews.map(toReviewResponse),
  };
};

const findOwnedReview = async (storeId: string, userId: string, reviewId: string) => {
  const store = await findOwnedStore(storeId, userId);
  const review = await Review.findOne({ _id: reviewId, sellerId: store._id });
  if (!review) {
    throw new AppError(404, 'Review not found', 'REVIEW_NOT_FOUND');
  }
  return review;
};

export const replyToReview = async (
  storeId: string,
  userId: string,
  reviewId: string,
  input: ReplyToReviewInput,
) => {
  const review = await findOwnedReview(storeId, userId, reviewId);
  review.sellerResponse = input.response;
  await review.save();
  return toReviewResponse(review);
};

export const flagReview = async (storeId: string, userId: string, reviewId: string) => {
  const review = await findOwnedReview(storeId, userId, reviewId);
  review.isFlagged = true;
  await review.save();
  return toReviewResponse(review);
};

// ------------------------------------------------------------ applications

/**
 * The application form asks for a name/phone/province/category even though
 * the account already has some of that — sellers commonly apply with
 * different contact details than their buyer profile, so nothing here is
 * pre-filled from the User document.
 */
export const applyToBecomeSeller = async (userId: string, input: CreateSellerApplicationInput) => {
  const application = await SellerApplication.create({ userId, ...input });
  return {
    id: String(application._id),
    status: application.status,
    createdAt: application.createdAt,
  };
};

/**
 * Which decisions make sense from which starting status.
 *
 * SUSPENDED only ever follows APPROVED — you cannot suspend an application
 * that was never approved in the first place. REJECTED and APPROVED are
 * terminal outside of that one path.
 */
const ALLOWED_APPLICATION_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['SUSPENDED'],
};

/** ADMIN-only: every application, newest first — see sellers.routes.ts for the role gate. */
export const listSellerApplications = async () => {
  const applications = await SellerApplication.find({}).sort({ createdAt: -1 });
  return applications.map((application) => ({
    id: String(application._id),
    userId: String(application.userId),
    firstName: application.firstName,
    lastName: application.lastName,
    phoneNumber: application.phoneNumber,
    province: application.province,
    primaryCategory: application.primaryCategory,
    status: application.status,
    submittedAt: application.submittedAt,
    reviewedBy: application.reviewedBy ? String(application.reviewedBy) : null,
    reviewedAt: application.reviewedAt ?? null,
    rejectionReason: application.rejectionReason ?? null,
    createdAt: application.createdAt,
  }));
};

/**
 * ADMIN-only: move an application through its review lifecycle.
 *
 * Approving stamps the applicant's Store as verified immediately if one
 * already exists (a seller can apply before or after finishing onboarding);
 * if there is no store yet, `createStore` checks for the approved
 * application itself and verifies the new store right away — see there.
 * Suspending an already-approved seller removes the verified badge but does
 * not (yet) unpublish their products or block sign-in; that enforcement is
 * deferred to the seller-lifecycle phase.
 */
export const reviewSellerApplication = async (
  adminUserId: string,
  applicationId: string,
  input: ReviewSellerApplicationInput,
) => {
  if (!mongoose.isValidObjectId(applicationId)) {
    throw new AppError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  }

  const application = await SellerApplication.findById(applicationId);
  if (!application) {
    throw new AppError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  }

  const allowed = ALLOWED_APPLICATION_TRANSITIONS[application.status] ?? [];
  if (!allowed.includes(input.decision)) {
    throw new AppError(
      409,
      `Cannot move an application from ${application.status} to ${input.decision}`,
      'ILLEGAL_TRANSITION',
      { from: application.status, to: input.decision, allowed },
    );
  }

  application.status = input.decision;
  application.reviewedBy = new mongoose.Types.ObjectId(adminUserId);
  application.reviewedAt = new Date();
  if (input.rejectionReason !== undefined) application.rejectionReason = input.rejectionReason;
  if (input.adminNotes !== undefined) application.adminNotes = input.adminNotes;
  await application.save();

  if (input.decision === 'APPROVED') {
    await Store.updateOne(
      { userId: application.userId },
      { $set: { verificationStatus: 'VERIFIED', verifiedAt: new Date() } },
    );
  } else if (input.decision === 'SUSPENDED') {
    await Store.updateOne(
      { userId: application.userId },
      { $set: { verificationStatus: 'UNVERIFIED', verifiedAt: null } },
    );
  }

  return {
    id: String(application._id),
    status: application.status,
    reviewedBy: String(application.reviewedBy),
    reviewedAt: application.reviewedAt,
    rejectionReason: application.rejectionReason ?? null,
  };
};

// =========================================================================
// CUSTOMERS (Store-isolated customers from historical orders)
// =========================================================================

export const getStoreCustomers = async (storeId: string, userId: string, search?: string) => {
  const store = await findOwnedStore(storeId, userId);
  const storeObjectId = store._id;

  const orders = await Order.find({ 'items.sellerId': storeObjectId }).sort({ createdAt: -1 });

  // Group orders by buyer (phone or name)
  const customerMap = new Map<string, any>();

  for (const order of orders) {
    const myItems = order.items.filter((item) => String(item.sellerId) === String(storeObjectId));
    const mySubtotal = myItems.reduce((sum, item) => sum + item.subtotal, 0);
    const key = order.buyerPhone?.trim() || String(order.buyerId) || order.buyerName;

    if (!customerMap.has(key)) {
      customerMap.set(key, {
        id: key,
        name: order.buyerName || 'Valued Customer',
        phone: order.buyerPhone || 'N/A',
        email: `${order.buyerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@buyer.khmercraft.com`,
        ordersCount: 1,
        totalSpent: mySubtotal,
        firstOrderDate: order.createdAt,
        lastOrderDate: order.createdAt,
        lastAddress: [order.deliveryInfo?.address, order.deliveryInfo?.city, order.deliveryInfo?.province]
          .filter(Boolean)
          .join(', ') || 'Cambodia',
        recentProducts: myItems.map((i) => i.productName),
      });
    } else {
      const existing = customerMap.get(key);
      existing.ordersCount += 1;
      existing.totalSpent += mySubtotal;
      if (new Date(order.createdAt) < new Date(existing.firstOrderDate)) {
        existing.firstOrderDate = order.createdAt;
      }
      myItems.forEach((i) => {
        if (!existing.recentProducts.includes(i.productName)) {
          existing.recentProducts.push(i.productName);
        }
      });
    }
  }

  let customers = Array.from(customerMap.values()).map((c) => {
    let status: 'VIP' | 'REPEAT' | 'NEW' = 'NEW';
    if (c.totalSpent >= 200 || c.ordersCount >= 5) status = 'VIP';
    else if (c.ordersCount > 1) status = 'REPEAT';

    return {
      ...c,
      status,
      totalSpentFormatted: `$${c.totalSpent.toFixed(2)}`,
    };
  });

  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    customers = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }

  return { customers, total: customers.length };
};

export const getStoreCustomerDetail = async (storeId: string, userId: string, customerId: string) => {
  const store = await findOwnedStore(storeId, userId);
  const storeObjectId = store._id;

  const orders = await Order.find({ 'items.sellerId': storeObjectId }).sort({ createdAt: -1 });

  const matchingOrders = orders.filter((order) => {
    const key = order.buyerPhone?.trim() || String(order.buyerId) || order.buyerName;
    return key === customerId;
  });

  if (matchingOrders.length === 0) {
    throw new AppError(404, 'Customer not found for this store', 'NOT_FOUND');
  }

  const latest = matchingOrders[0];
  let totalSpent = 0;
  const productsPurchased: any[] = [];

  const formattedOrders = matchingOrders.map((order) => {
    const myItems = order.items.filter((item) => String(item.sellerId) === String(storeObjectId));
    const subtotal = myItems.reduce((sum, item) => sum + item.subtotal, 0);
    totalSpent += subtotal;

    myItems.forEach((item) => {
      productsPurchased.push({
        name: item.productName,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
        orderDate: order.createdAt,
      });
    });

    return {
      id: String(order._id),
      orderNumber: order.orderNumber,
      date: order.createdAt,
      total: `$${subtotal.toFixed(2)}`,
      status: order.orderStatus,
      paymentMethod: order.paymentMethod,
      itemsCount: myItems.length,
    };
  });

  return {
    id: customerId,
    name: latest.buyerName,
    phone: latest.buyerPhone,
    email: `${latest.buyerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@buyer.khmercraft.com`,
    address: [latest.deliveryInfo?.address, latest.deliveryInfo?.city, latest.deliveryInfo?.province]
      .filter(Boolean)
      .join(', ') || 'Phnom Penh, Cambodia',
    totalSpent: `$${totalSpent.toFixed(2)}`,
    ordersCount: matchingOrders.length,
    firstOrderDate: matchingOrders[matchingOrders.length - 1].createdAt,
    lastOrderDate: latest.createdAt,
    orders: formattedOrders,
    productsPurchased,
  };
};

// =========================================================================
// POS (Point of Sale with canonical products, inventory, shifts, & registers)
// =========================================================================

// --- Registers ---
export const listPosRegisters = async (storeId: string, userId: string) => {
  const store = await findOwnedStore(storeId, userId);
  let registers = await PosRegister.find({ storeId: store._id }).sort({ createdAt: 1 });
  if (registers.length === 0) {
    // Auto-provision initial register for store
    const defaultReg = await PosRegister.create({
      storeId: store._id,
      name: 'Main Register',
      registerNumber: 'REG-01',
      location: store.location || 'Front Counter',
      status: 'ACTIVE',
      settings: {
        receiptHeader: `Welcome to ${store.storeName}!`,
        receiptFooter: 'Thank you for supporting Cambodian artisans! Handcrafted with pride.',
        defaultTaxRate: 0,
        allowCash: true,
        allowKhqr: true,
        autoPrintReceipt: false,
        requireCustomer: false,
      },
    });
    registers = [defaultReg];
  }
  return registers;
};

export const createPosRegister = async (
  storeId: string,
  userId: string,
  data: { name: string; registerNumber?: string; location?: string; settings?: any }
) => {
  const store = await findOwnedStore(storeId, userId);
  const count = await PosRegister.countDocuments({ storeId: store._id });
  const regNumber = data.registerNumber?.trim() || `REG-${String(count + 1).padStart(2, '0')}`;

  const register = await PosRegister.create({
    storeId: store._id,
    name: data.name.trim(),
    registerNumber: regNumber,
    location: data.location?.trim() || 'Front Counter',
    status: 'ACTIVE',
    settings: {
      receiptHeader: data.settings?.receiptHeader || `Welcome to ${store.storeName}!`,
      receiptFooter: data.settings?.receiptFooter || 'Thank you for supporting Cambodian artisans!',
      defaultTaxRate: data.settings?.defaultTaxRate ?? 0,
      allowCash: data.settings?.allowCash ?? true,
      allowKhqr: data.settings?.allowKhqr ?? true,
      autoPrintReceipt: data.settings?.autoPrintReceipt ?? false,
      requireCustomer: data.settings?.requireCustomer ?? false,
    },
  });

  return register;
};

export const updatePosRegister = async (
  storeId: string,
  registerId: string,
  userId: string,
  data: { name?: string; location?: string; status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'; settings?: any }
) => {
  const store = await findOwnedStore(storeId, userId);
  const register = await PosRegister.findOne({ _id: registerId, storeId: store._id });
  if (!register) throw new AppError(404, 'POS Register not found', 'NOT_FOUND');

  if (data.name) register.name = data.name.trim();
  if (data.location) register.location = data.location.trim();
  if (data.status) register.status = data.status;
  if (data.settings) {
    register.settings = {
      ...register.settings,
      ...data.settings,
    };
  }

  await register.save();
  return register;
};

// --- Shifts ---
export const getPosCurrentShift = async (storeId: string, userId: string, registerId?: string) => {
  const store = await findOwnedStore(storeId, userId);
  const query: any = { storeId: store._id, status: 'OPEN' };
  if (registerId && mongoose.isValidObjectId(registerId)) {
    query.registerId = registerId;
  }
  return PosShift.findOne(query).sort({ openedAt: -1 });
};

export const openPosShift = async (
  storeId: string,
  userId: string,
  data: { startingCash: number; registerId?: string; notes?: string }
) => {
  const store = await findOwnedStore(storeId, userId);
  const sellerUser = await User.findById(userId);
  if (!sellerUser) throw new AppError(404, 'User not found', 'NOT_FOUND');

  let register: any = null;
  if (data.registerId && mongoose.isValidObjectId(data.registerId)) {
    register = await PosRegister.findOne({ _id: data.registerId, storeId: store._id });
  }
  if (!register) {
    const registers = await listPosRegisters(storeId, userId);
    register = registers[0];
  }

  // Check if register already has an open shift
  const existing = await PosShift.findOne({
    storeId: store._id,
    registerId: register._id,
    status: 'OPEN',
  });
  if (existing) {
    throw new AppError(400, `A shift is already open for register ${register.name}`, 'SHIFT_ALREADY_OPEN');
  }

  const startingCash = Math.max(0, Number(data.startingCash) || 0);
  const shift = await PosShift.create({
    storeId: store._id,
    sellerUserId: sellerUser._id,
    registerId: register._id,
    registerName: register.name,
    cashierId: sellerUser._id,
    cashierName: sellerUser.name,
    status: 'OPEN',
    openedAt: new Date(),
    startingCash,
    expectedCash: startingCash,
    cashSales: 0,
    khqrSales: 0,
    totalSales: 0,
    cashIn: 0,
    cashOut: 0,
    refundsTotal: 0,
    returnsCount: 0,
    voidsCount: 0,
    notes: data.notes,
    cashMovements: [
      {
        type: 'IN',
        amount: startingCash,
        reason: 'Opening float',
        timestamp: new Date(),
        cashierName: sellerUser.name,
      },
    ],
  });

  register.currentShiftId = shift._id;
  register.currentCashierId = sellerUser._id;
  await register.save();

  return shift;
};

export const closePosShift = async (
  storeId: string,
  userId: string,
  data: { actualCash: number; notes?: string }
) => {
  const store = await findOwnedStore(storeId, userId);
  const shift = await PosShift.findOne({ storeId: store._id, status: 'OPEN' }).sort({ openedAt: -1 });
  if (!shift) {
    throw new AppError(404, 'No open register shift found to close', 'NOT_FOUND');
  }

  const actualCash = Math.max(0, Number(data.actualCash) || 0);
  const variance = actualCash - shift.expectedCash;

  shift.status = 'CLOSED';
  shift.closedAt = new Date();
  shift.actualCash = actualCash;
  shift.variance = variance;
  if (data.notes) {
    shift.notes = (shift.notes ? shift.notes + ' | ' : '') + data.notes;
  }
  await shift.save();

  if (shift.registerId) {
    await PosRegister.updateOne(
      { _id: shift.registerId },
      { $unset: { currentShiftId: '', currentCashierId: '' } }
    );
  }

  return shift;
};

export const recordPosCashMovement = async (
  storeId: string,
  userId: string,
  data: { type: 'IN' | 'OUT' | 'ADJUSTMENT'; amount: number; reason: string }
) => {
  const store = await findOwnedStore(storeId, userId);
  const sellerUser = await User.findById(userId);
  const shift = await PosShift.findOne({ storeId: store._id, status: 'OPEN' }).sort({ openedAt: -1 });
  if (!shift) {
    throw new AppError(404, 'No active shift found. Open a shift first.', 'NOT_FOUND');
  }

  const amount = Math.max(0, Number(data.amount) || 0);
  if (amount <= 0) {
    throw new AppError(400, 'Cash movement amount must be greater than zero.', 'INVALID_AMOUNT');
  }

  if (data.type === 'IN') {
    shift.cashIn += amount;
    shift.expectedCash += amount;
  } else if (data.type === 'OUT') {
    shift.cashOut += amount;
    shift.expectedCash -= amount;
  } else {
    // ADJUSTMENT
    shift.expectedCash = shift.startingCash + shift.cashSales + shift.cashIn - shift.cashOut - shift.refundsTotal + amount;
  }

  shift.cashMovements.push({
    type: data.type,
    amount,
    reason: data.reason || `Cash ${data.type}`,
    timestamp: new Date(),
    cashierName: sellerUser?.name,
  });

  await shift.save();
  return shift;
};

export const listPosShifts = async (storeId: string, userId: string, limit = 20, page = 1) => {
  const store = await findOwnedStore(storeId, userId);
  const skip = (page - 1) * limit;
  const [shifts, total] = await Promise.all([
    PosShift.find({ storeId: store._id }).sort({ openedAt: -1 }).skip(skip).limit(limit),
    PosShift.countDocuments({ storeId: store._id }),
  ]);

  return { shifts, total, page, totalPages: Math.ceil(total / limit) };
};

// --- POS Orders & Checkout ---
export const createPosOrder = async (
  storeId: string,
  userId: string,
  input: {
    items: Array<{ productId: string; quantity: number; price?: number; variant?: string }>;
    paymentMethod: 'POS_CASH' | 'POS_KHQR' | 'CASH' | 'KHQR';
    paymentTranId?: string;
    cashReceived?: number;
    discountAmount?: number;
    discountCode?: string;
    taxAmount?: number;
    customerName?: string;
    customerPhone?: string;
    customerId?: string;
    registerId?: string;
    notes?: string;
  }
) => {
  const store = await findOwnedStore(storeId, userId);
  const sellerUser = await User.findById(userId);
  if (!sellerUser) throw new AppError(404, 'User not found', 'NOT_FOUND');

  if (!input.items || input.items.length === 0) {
    throw new AppError(400, 'POS Cart is empty', 'CART_EMPTY');
  }

  // Find or default register & shift
  const currentShift = await PosShift.findOne({ storeId: store._id, status: 'OPEN' }).sort({ openedAt: -1 });
  let registerId = input.registerId || (currentShift?.registerId ? String(currentShift.registerId) : undefined);
  let registerName = currentShift?.registerName || 'Main Register';

  if (!registerId) {
    const registers = await listPosRegisters(storeId, userId);
    registerId = String(registers[0]._id);
    registerName = registers[0].name;
  }

  // Atomically check and reserve stock for canonical products
  const reservedLines: Array<{ product: any; quantity: number; price: number; subtotal: number; variant?: string }> = [];

  for (const line of input.items) {
    if (!mongoose.isValidObjectId(line.productId)) {
      throw new AppError(400, 'Invalid product ID', 'INVALID_ID');
    }

    const reserved = await Product.findOneAndUpdate(
      {
        _id: line.productId,
        status: 'ACTIVE',
        stock: { $gte: line.quantity },
      },
      {
        $inc: { stock: -line.quantity, soldCount: line.quantity },
      },
      { new: true }
    );

    if (!reserved) {
      // Rollback already reserved lines
      for (const res of reservedLines) {
        await Product.updateOne(
          { _id: res.product._id },
          { $inc: { stock: res.quantity, soldCount: -res.quantity } }
        );
      }
      const existing = await Product.findById(line.productId);
      const name = existing ? existing.name : 'Item';
      const available = existing ? existing.stock : 0;
      throw new AppError(
        409,
        `Insufficient stock for "${name}". Only ${available} available in inventory.`,
        'INSUFFICIENT_STOCK'
      );
    }

    const price = line.price !== undefined ? Number(line.price) : reserved.price;
    reservedLines.push({
      product: reserved,
      quantity: line.quantity,
      price,
      subtotal: price * line.quantity,
      variant: line.variant,
    });
  }

  const itemsSubtotal = reservedLines.reduce((sum, line) => sum + line.subtotal, 0);
  const discountAmount = Math.max(0, Number(input.discountAmount) || 0);
  const taxAmount = Math.max(0, Number(input.taxAmount) || 0);
  const totalAmount = Math.max(0, itemsSubtotal - discountAmount + taxAmount);

  const isCash = input.paymentMethod === 'POS_CASH' || input.paymentMethod === 'CASH';
  const cashReceived = isCash ? (Number(input.cashReceived) || totalAmount) : totalAmount;
  const changeGiven = isCash ? Math.max(0, cashReceived - totalAmount) : 0;

  const now = new Date();
  const dateStr = [
    String(now.getUTCFullYear()).slice(2),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
  ].join('');
  const randomStr = Math.random().toString(36).slice(2, 7).toUpperCase();
  const orderNumber = `KC-POS-${dateStr}-${randomStr}`;

  const orderItems = reservedLines.map((line) => ({
    productId: line.product._id,
    productName: line.variant ? `${line.product.name} (${line.variant})` : line.product.name,
    productImage: line.product.image || (line.product.images && line.product.images[0]),
    sellerId: store._id,
    sellerUserId: new mongoose.Types.ObjectId(userId),
    sellerName: sellerUser.name,
    storeName: store.storeName,
    price: line.price,
    quantity: line.quantity,
    subtotal: line.subtotal,
  }));

  const order = await Order.create({
    orderNumber,
    buyerId: input.customerId && mongoose.isValidObjectId(input.customerId) ? new mongoose.Types.ObjectId(input.customerId) : sellerUser._id,
    buyerName: input.customerName?.trim() || 'Walk-in Customer',
    buyerPhone: input.customerPhone?.trim() || store.phoneNumber || 'In-store',
    items: orderItems,
    deliveryInfo: {
      fullName: input.customerName?.trim() || 'Walk-in Customer',
      phone: input.customerPhone?.trim() || 'In-store',
      province: store.location || 'Phnom Penh',
      city: 'In-store POS',
      address: 'Counter Pickup',
      note: input.notes || 'In-store POS Transaction',
    },
    channel: 'POS',
    registerId: registerId ? new mongoose.Types.ObjectId(registerId) : undefined,
    shiftId: currentShift?._id,
    cashierId: sellerUser._id,
    cashierName: sellerUser.name,
    paymentMethod: isCash ? 'POS_CASH' : 'POS_KHQR',
    paymentStatus: 'PAID',
    paymentTranId: input.paymentTranId || undefined,
    orderStatus: 'DELIVERED',
    subtotal: itemsSubtotal - discountAmount,
    deliveryFee: 0,
    totalAmount,
    cashReceived: isCash ? cashReceived : undefined,
    changeGiven: isCash ? changeGiven : undefined,
    discountAmount,
    taxAmount,
    isVoided: false,
    refundStatus: 'NONE',
    refundedAmount: 0,
    statusHistory: [
      {
        status: 'DELIVERED',
        at: now,
        by: 'SELLER',
        note: `POS sale completed at ${registerName} via ${isCash ? 'CASH' : 'KHQR'}. Received: $${cashReceived.toFixed(2)}, Change: $${changeGiven.toFixed(2)}`,
      },
    ],
  });

  // Update current shift if open
  if (currentShift) {
    currentShift.orderIds.push(order._id as any);
    if (isCash) {
      currentShift.cashSales += totalAmount;
    } else {
      currentShift.khqrSales += totalAmount;
    }
    currentShift.totalSales += totalAmount;
    currentShift.expectedCash =
      currentShift.startingCash +
      currentShift.cashIn -
      currentShift.cashOut +
      currentShift.cashSales -
      (currentShift.refundsTotal || 0);
    await currentShift.save();
  }

  // Update discount usage count if discount code was used
  if (input.discountCode) {
    await Discount.updateOne({ storeId: store._id, code: input.discountCode.toUpperCase() }, { $inc: { usageCount: 1 } });
  }

  return {
    order: {
      id: String(order._id),
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
    },
    receipt: {
      receiptNumber: order.orderNumber,
      storeName: store.storeName,
      storeTagline: store.storeTagline,
      storeAddress: store.location,
      storePhone: store.phoneNumber,
      date: order.createdAt,
      cashier: sellerUser.name,
      registerName,
      customerName: input.customerName || 'Walk-in Customer',
      customerPhone: input.customerPhone,
      paymentMethod: isCash ? 'CASH' : 'KHQR',
      items: reservedLines.map((l) => ({
        name: l.variant ? `${l.product.name} (${l.variant})` : l.product.name,
        qty: l.quantity,
        price: l.price,
        subtotal: l.subtotal,
      })),
      subtotal: itemsSubtotal,
      discount: discountAmount,
      tax: taxAmount,
      total: totalAmount,
      cashReceived,
      change: changeGiven,
    },
  };
};

export const getPosOrders = async (
  storeId: string,
  userId: string,
  query?: { search?: string; status?: string; shiftId?: string; limit?: number; page?: number }
) => {
  const store = await findOwnedStore(storeId, userId);
  const filter: any = {
    'items.sellerId': store._id,
    $or: [{ channel: 'POS' }, { orderNumber: new RegExp('^KC-POS-') }],
  };

  if (query?.shiftId && mongoose.isValidObjectId(query.shiftId)) {
    filter.shiftId = query.shiftId;
  }
  if (query?.search) {
    const q = query.search.trim();
    filter.$and = [
      {
        $or: [
          { orderNumber: new RegExp(q, 'i') },
          { buyerName: new RegExp(q, 'i') },
          { buyerPhone: new RegExp(q, 'i') },
        ],
      },
    ];
  }

  const limit = Math.min(100, Math.max(1, Number(query?.limit) || 30));
  const page = Math.max(1, Number(query?.page) || 1);
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  return {
    orders: orders.map((order) => {
      const myItems = order.items.filter((item) => String(item.sellerId) === String(store._id));
      return {
        id: String(order._id),
        orderNumber: order.orderNumber,
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        date: order.createdAt,
        total: `$${order.totalAmount.toFixed(2)}`,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod?.includes('KHQR') ? 'KHQR' : 'CASH',
        orderStatus: order.orderStatus,
        refundStatus: order.refundStatus || 'NONE',
        refundedAmount: order.refundedAmount || 0,
        isVoided: Boolean(order.isVoided),
        cashierName: order.cashierName || 'Cashier',
        itemsCount: myItems.length,
        items: myItems,
      };
    }),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

// --- Returns & Refunds ---
export const createPosRefund = async (
  storeId: string,
  userId: string,
  orderId: string,
  input: {
    items: Array<{ productId: string; quantity: number; refundAmount: number; returnToInventory?: boolean }>;
    reason: string;
    refundMethod?: 'CASH' | 'KHQR' | 'STORE_CREDIT';
  }
) => {
  const store = await findOwnedStore(storeId, userId);
  const sellerUser = await User.findById(userId);
  if (!sellerUser) throw new AppError(404, 'User not found', 'NOT_FOUND');

  const order = await Order.findOne({ _id: orderId, 'items.sellerId': store._id });
  if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');
  if (order.isVoided) throw new AppError(400, 'Cannot refund a voided order', 'ORDER_VOIDED');

  const totalRefundAmount = input.items.reduce((sum, item) => sum + (Number(item.refundAmount) || 0), 0);
  if (totalRefundAmount <= 0) {
    throw new AppError(400, 'Refund amount must be greater than zero', 'INVALID_AMOUNT');
  }

  const remainingRefundable = order.totalAmount - (order.refundedAmount || 0);
  if (totalRefundAmount > remainingRefundable + 0.01) {
    throw new AppError(400, `Cannot refund more than remaining balance of $${remainingRefundable.toFixed(2)}`, 'REFUND_LIMIT_EXCEEDED');
  }

  // Restore canonical inventory for returned items if returnToInventory
  const refundItems: any[] = [];
  for (const item of input.items) {
    const orderLine = order.items.find((line) => String(line.productId) === String(item.productId));
    const productName = orderLine ? orderLine.productName : 'Item';

    if (item.returnToInventory !== false) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity, soldCount: -item.quantity } }
      );
    }

    refundItems.push({
      productId: new mongoose.Types.ObjectId(item.productId),
      productName,
      quantity: item.quantity,
      refundAmount: item.refundAmount,
      returnToInventory: item.returnToInventory !== false,
    });
  }

  const refundNumber = `KC-RF-${Date.now().toString(36).toUpperCase()}`;
  const refundMethod = input.refundMethod || (order.paymentMethod?.includes('KHQR') ? 'KHQR' : 'CASH');

  // Resolve shift
  const currentShift = await PosShift.findOne({ storeId: store._id, status: 'OPEN' }).sort({ openedAt: -1 });

  const refund = await PosRefund.create({
    storeId: store._id,
    orderId: order._id,
    orderNumber: order.orderNumber,
    refundNumber,
    registerId: order.registerId,
    shiftId: currentShift?._id,
    cashierId: sellerUser._id,
    cashierName: sellerUser.name,
    items: refundItems,
    totalRefundAmount,
    reason: input.reason.trim(),
    refundMethod,
    status: 'COMPLETED',
  });

  // Update order refund tracking
  order.refundedAmount = (order.refundedAmount || 0) + totalRefundAmount;
  order.refundStatus = order.refundedAmount >= order.totalAmount - 0.01 ? 'FULL' : 'PARTIAL';
  order.statusHistory.push({
    status: order.orderStatus,
    at: new Date(),
    by: 'SELLER',
    note: `Refund issued: $${totalRefundAmount.toFixed(2)} via ${refundMethod}. Reason: ${input.reason}`,
  });
  await order.save();

  // Deduct from shift if open
  if (currentShift) {
    currentShift.refundsTotal = (currentShift.refundsTotal || 0) + totalRefundAmount;
    currentShift.returnsCount = (currentShift.returnsCount || 0) + 1;
    if (refundMethod === 'CASH') {
      currentShift.expectedCash = Math.max(0, currentShift.expectedCash - totalRefundAmount);
    }
    await currentShift.save();
  }

  return refund;
};

// --- Voids ---
export const voidPosOrder = async (storeId: string, userId: string, orderId: string, reason: string) => {
  const store = await findOwnedStore(storeId, userId);
  const sellerUser = await User.findById(userId);
  if (!sellerUser) throw new AppError(404, 'User not found', 'NOT_FOUND');

  const order = await Order.findOne({ _id: orderId, 'items.sellerId': store._id });
  if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');
  if (order.isVoided) throw new AppError(400, 'Order is already voided', 'ALREADY_VOIDED');
  if (order.refundStatus === 'FULL') throw new AppError(400, 'Cannot void fully refunded order', 'ORDER_REFUNDED');

  // Restore inventory for all items in order
  for (const line of order.items) {
    if (String(line.sellerId) === String(store._id)) {
      await Product.updateOne(
        { _id: line.productId },
        { $inc: { stock: line.quantity, soldCount: -line.quantity } }
      );
    }
  }

  order.isVoided = true;
  order.voidReason = reason || 'Manager Void';
  order.orderStatus = 'CANCELLED';
  order.paymentStatus = 'REFUNDED';
  order.statusHistory.push({
    status: 'CANCELLED',
    at: new Date(),
    by: 'SELLER',
    note: `POS sale voided by ${sellerUser.name}. Reason: ${reason}`,
  });
  await order.save();

  // Reverse shift sales if shift is still open
  if (order.shiftId) {
    const shift = await PosShift.findById(order.shiftId);
    if (shift && shift.status === 'OPEN') {
      shift.voidsCount = (shift.voidsCount || 0) + 1;
      const isCash = order.paymentMethod?.includes('CASH');
      if (isCash) {
        shift.cashSales = Math.max(0, shift.cashSales - order.totalAmount);
        shift.expectedCash = Math.max(0, shift.expectedCash - order.totalAmount);
      } else {
        shift.khqrSales = Math.max(0, shift.khqrSales - order.totalAmount);
      }
      shift.totalSales = Math.max(0, shift.totalSales - order.totalAmount);
      await shift.save();
    }
  }

  return { success: true, orderId: order._id, orderNumber: order.orderNumber };
};

export const listPosRefunds = async (storeId: string, userId: string) => {
  const store = await findOwnedStore(storeId, userId);
  return PosRefund.find({ storeId: store._id }).sort({ createdAt: -1 }).limit(50);
};

// --- POS Analytics & Reports ---
export const getPosReports = async (
  storeId: string,
  userId: string,
  params?: { startDate?: string; endDate?: string }
) => {
  const store = await findOwnedStore(storeId, userId);

  const query: any = {
    'items.sellerId': store._id,
    channel: 'POS',
    isVoided: false,
  };

  if (params?.startDate || params?.endDate) {
    query.createdAt = {};
    if (params.startDate) query.createdAt.$gte = new Date(params.startDate);
    if (params.endDate) query.createdAt.$lte = new Date(params.endDate);
  }

  const [orders, refunds, shifts] = await Promise.all([
    Order.find(query),
    PosRefund.find({ storeId: store._id }),
    PosShift.find({ storeId: store._id }).sort({ openedAt: -1 }).limit(10),
  ]);

  let totalGross = 0;
  let cashVolume = 0;
  let khqrVolume = 0;
  let totalDiscounts = 0;
  let totalTax = 0;
  const productSalesMap: Record<string, { name: string; units: number; revenue: number }> = {};

  for (const o of orders) {
    totalGross += o.totalAmount;
    if (o.paymentMethod?.includes('CASH')) {
      cashVolume += o.totalAmount;
    } else {
      khqrVolume += o.totalAmount;
    }
    totalDiscounts += o.discountAmount || 0;
    totalTax += o.taxAmount || 0;

    for (const item of o.items) {
      const pid = String(item.productId);
      if (!productSalesMap[pid]) {
        productSalesMap[pid] = { name: item.productName, units: 0, revenue: 0 };
      }
      productSalesMap[pid].units += item.quantity;
      productSalesMap[pid].revenue += item.subtotal;
    }
  }

  const totalRefundAmount = refunds.reduce((sum, r) => sum + r.totalRefundAmount, 0);
  const netSales = Math.max(0, totalGross - totalRefundAmount);

  const topProducts = Object.values(productSalesMap).sort((a, b) => b.units - a.units).slice(0, 10);

  return {
    totalOrders: orders.length,
    grossSales: totalGross,
    netSales,
    totalRefunds: totalRefundAmount,
    refundsCount: refunds.length,
    cashVolume,
    khqrVolume,
    totalDiscounts,
    totalTax,
    topProducts,
    recentShifts: shifts.map((s) => ({
      id: String(s._id),
      registerName: s.registerName,
      cashierName: s.cashierName,
      openedAt: s.openedAt,
      closedAt: s.closedAt,
      startingCash: s.startingCash,
      totalSales: s.totalSales,
      expectedCash: s.expectedCash,
      actualCash: s.actualCash,
      variance: s.variance,
      status: s.status,
    })),
  };
};

// =========================================================================
// PROMOTIONS & DISCOUNTS (Store-level and product-level promotional rules)
// =========================================================================

export const getStorePromotions = async (storeId: string, userId: string) => {
  const store = await findOwnedStore(storeId, userId);
  const now = new Date();

  const discounts = await Discount.find({ storeId: store._id }).sort({ createdAt: -1 });

  return discounts.map((d) => {
    let computedStatus = d.status;
    if (new Date(d.endDate) < now) computedStatus = 'EXPIRED';
    else if (new Date(d.startDate) > now) computedStatus = 'SCHEDULED';
    else computedStatus = 'ACTIVE';

    return {
      id: String(d._id),
      name: d.name,
      code: d.code,
      type: d.type,
      value: d.value,
      appliesTo: d.appliesTo,
      productIds: d.productIds,
      startDate: d.startDate,
      endDate: d.endDate,
      status: computedStatus,
      usageCount: d.usageCount,
    };
  });
};

export const createStorePromotion = async (
  storeId: string,
  userId: string,
  input: {
    name: string;
    code?: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    appliesTo: 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS';
    productIds?: string[];
    startDate: string;
    endDate: string;
  }
) => {
  const store = await findOwnedStore(storeId, userId);

  const start = new Date(input.startDate || Date.now());
  const end = new Date(input.endDate || Date.now() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  let status: 'ACTIVE' | 'SCHEDULED' = 'ACTIVE';
  if (start > now) status = 'SCHEDULED';

  const discount = await Discount.create({
    storeId: store._id,
    sellerUserId: new mongoose.Types.ObjectId(userId),
    name: input.name,
    code: input.code ? input.code.toUpperCase().trim() : undefined,
    type: input.type || 'PERCENTAGE',
    value: Number(input.value) || 10,
    appliesTo: input.appliesTo || 'ALL_PRODUCTS',
    productIds: input.productIds ? input.productIds.map((id) => new mongoose.Types.ObjectId(id)) : [],
    startDate: start,
    endDate: end,
    status,
  });

  return discount;
};

export const deleteStorePromotion = async (storeId: string, userId: string, promoId: string) => {
  const store = await findOwnedStore(storeId, userId);
  const deleted = await Discount.findOneAndDelete({ _id: promoId, storeId: store._id });
  if (!deleted) throw new AppError(404, 'Promotion not found', 'NOT_FOUND');
  return { success: true };
};

// =========================================================================
// SUPPORT CASES (Merchant help tickets)
// =========================================================================

export const getStoreSupportCases = async (storeId: string, userId: string) => {
  const store = await findOwnedStore(storeId, userId);
  return SupportCase.find({ storeId: store._id }).sort({ updatedAt: -1 });
};

export const createStoreSupportCase = async (
  storeId: string,
  userId: string,
  input: {
    subject: string;
    category: 'ORDER' | 'MODERATION' | 'BILLING' | 'ADVERTISEMENT' | 'TECHNICAL' | 'OTHER';
    description: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  }
) => {
  const store = await findOwnedStore(storeId, userId);
  const user = await User.findById(userId);

  const count = await SupportCase.countDocuments();
  const caseNumber = `CASE-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  const newCase = await SupportCase.create({
    storeId: store._id,
    sellerUserId: new mongoose.Types.ObjectId(userId),
    caseNumber,
    subject: input.subject,
    category: input.category || 'OTHER',
    description: input.description,
    priority: input.priority || 'MEDIUM',
    status: 'OPEN',
    messages: [
      {
        senderRole: 'SELLER',
        senderName: user ? user.name : 'Store Owner',
        text: input.description,
        createdAt: new Date(),
      },
    ],
  });

  return newCase;
};

export const replyStoreSupportCase = async (
  storeId: string,
  userId: string,
  caseId: string,
  text: string
) => {
  const store = await findOwnedStore(storeId, userId);
  const user = await User.findById(userId);

  const c = await SupportCase.findOne({ _id: caseId, storeId: store._id });
  if (!c) throw new AppError(404, 'Support case not found', 'NOT_FOUND');

  c.messages.push({
    senderRole: 'SELLER',
    senderName: user ? user.name : 'Store Owner',
    text,
    createdAt: new Date(),
  });
  c.status = 'IN_PROGRESS';
  await c.save();

  return c;
};

// =========================================================================
// FINANCE (Sales, Payments, Payouts, Transactions)
// =========================================================================

export const getStoreFinance = async (storeId: string, userId: string) => {
  const store = await findOwnedStore(storeId, userId);
  const orders = await Order.find({ 'items.sellerId': store._id }).sort({ createdAt: -1 });

  let grossSales = 0;
  let codPayments = 0;
  let onlinePayments = 0;
  let cashPayments = 0;
  let paidCount = 0;
  let pendingCount = 0;

  const transactions = orders.map((order) => {
    const myItems = order.items.filter((item) => String(item.sellerId) === String(store._id));
    const amount = myItems.reduce((sum, item) => sum + item.subtotal, 0);
    grossSales += amount;

    if (order.paymentStatus === 'PAID') {
      paidCount++;
      if (order.paymentMethod === 'COD') codPayments += amount;
      else onlinePayments += amount;
    } else {
      pendingCount++;
    }

    let methodLabel = 'Cash on Delivery';
    if (order.orderNumber?.startsWith('KC-POS-')) {
      methodLabel = order.statusHistory?.[0]?.note?.includes('KHQR') ? 'POS KHQR' : 'POS Cash';
      cashPayments += amount;
    } else if (order.paymentMethod === 'ABA_PAYWAY' || order.paymentMethod === 'ABA_DEMO') {
      methodLabel = 'ABA KHQR / PayWay';
    }

    return {
      id: String(order._id),
      orderNumber: order.orderNumber,
      date: order.createdAt,
      amount: `$${amount.toFixed(2)}`,
      rawAmount: amount,
      paymentMethod: methodLabel,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
    };
  });

  const commission = grossSales * 0.1;
  const netEarnings = grossSales - commission;
  const availableForPayout = grossSales * 0.9;

  return {
    summary: {
      grossSales: `$${grossSales.toFixed(2)}`,
      netEarnings: `$${netEarnings.toFixed(2)}`,
      platformCommission: `$${commission.toFixed(2)}`,
      availableForPayout: `$${availableForPayout.toFixed(2)}`,
      payoutThreshold: '$1,000.00',
      nextPayoutDay: 'Every Friday',
      payoutAccount: store.phoneNumber ? `ABA Bank · ${store.phoneNumber}` : 'Not linked',
    },
    paymentMethods: [
      { method: 'ABA KHQR & PayWay', amount: `$${onlinePayments.toFixed(2)}`, count: paidCount },
      { method: 'Cash on Delivery', amount: `$${codPayments.toFixed(2)}`, count: pendingCount },
      { method: 'In-Store POS', amount: `$${cashPayments.toFixed(2)}`, count: transactions.filter((t) => t.orderNumber.startsWith('KC-POS-')).length },
    ],
    transactions,
  };
};

// =========================================================================
// NOTIFICATIONS STREAM
// =========================================================================

export const getStoreNotifications = async (storeId: string, userId: string) => {
  const store = await findOwnedStore(storeId, userId);
  const now = new Date();

  // 1. Recent orders
  const recentOrders = await Order.find({ 'items.sellerId': store._id }).sort({ createdAt: -1 }).limit(5);

  // 2. Low stock products
  const lowStock = await Product.find({
    sellerUserId: userId,
    status: 'ACTIVE',
    stock: { $lte: 5 },
  }).limit(5);

  // 3. Promotion slides status
  const promoSlides = await PromotionSlide.find({ storeId: store._id }).sort({ updatedAt: -1 }).limit(3);

  const notifications: any[] = [];

  recentOrders.forEach((o) => {
    notifications.push({
      id: `ord-${o._id}`,
      type: 'ORDER',
      icon: 'cart',
      title: `New Order Received (${o.orderNumber})`,
      message: `Buyer ${o.buyerName} placed an order for $${o.totalAmount.toFixed(2)}. Status: ${o.orderStatus}`,
      date: o.createdAt,
      read: false,
    });
  });

  lowStock.forEach((p) => {
    notifications.push({
      id: `stk-${p._id}`,
      type: 'INVENTORY',
      icon: 'alert',
      title: `Low Stock Alert: ${p.name}`,
      message: `Only ${p.stock} units remaining. Consider restocking soon.`,
      date: p.updatedAt || now,
      read: false,
    });
  });

  promoSlides.forEach((s) => {
    notifications.push({
      id: `adv-${s._id}`,
      type: 'ADVERTISEMENT',
      icon: 'sparkles',
      title: `Slide Moderation: ${s.title}`,
      message: `Your promotional slide application is ${s.status}. ${s.rejectionReason ? 'Note: ' + s.rejectionReason : ''}`,
      date: s.updatedAt || now,
      read: true,
    });
  });

  return notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// =========================================================================
// ANALYTICS
// =========================================================================

export const getStoreAnalytics = async (
  storeId: string,
  userId: string,
  period: 'today' | '7d' | '30d' | 'all' = '30d'
) => {
  const store = await findOwnedStore(storeId, userId);
  const now = new Date();
  let since = new Date(0);

  if (period === 'today') {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === '7d') {
    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === '30d') {
    since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const orders = await Order.find({
    'items.sellerId': store._id,
    createdAt: { $gte: since },
  }).sort({ createdAt: -1 });

  let totalSales = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;
  let posSales = 0;
  let marketplaceSales = 0;

  const productPerformanceMap = new Map<string, { name: string; units: number; revenue: number }>();
  const buyersSet = new Set<string>();

  orders.forEach((order) => {
    const myItems = order.items.filter((item) => String(item.sellerId) === String(store._id));
    const subtotal = myItems.reduce((sum, item) => sum + item.subtotal, 0);

    totalSales += subtotal;
    if (order.orderStatus === 'DELIVERED') completedOrders++;
    if (order.orderStatus === 'CANCELLED') cancelledOrders++;

    if (order.orderNumber.startsWith('KC-POS-')) {
      posSales += subtotal;
    } else {
      marketplaceSales += subtotal;
    }

    if (order.buyerPhone) buyersSet.add(order.buyerPhone);

    myItems.forEach((item) => {
      const pid = String(item.productId);
      if (!productPerformanceMap.has(pid)) {
        productPerformanceMap.set(pid, {
          name: item.productName,
          units: item.quantity,
          revenue: item.subtotal,
        });
      } else {
        const perf = productPerformanceMap.get(pid)!;
        perf.units += item.quantity;
        perf.revenue += item.subtotal;
      }
    });
  });

  const topProducts = Array.from(productPerformanceMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const aov = orders.length > 0 ? totalSales / orders.length : 0;

  return {
    period,
    totalSales: `$${totalSales.toFixed(2)}`,
    rawTotalSales: totalSales,
    ordersCount: orders.length,
    aov: `$${aov.toFixed(2)}`,
    completedOrders,
    cancelledOrders,
    channels: {
      marketplace: `$${marketplaceSales.toFixed(2)}`,
      pos: `$${posSales.toFixed(2)}`,
    },
    topProducts,
    uniqueCustomers: buyersSet.size,
  };
};

export const generatePosKhqr = async (
  storeId: string,
  userId: string,
  input: {
    amount: number;
    items?: Array<{ name: string; quantity: number; price: number }>;
    customerName?: string;
    customerPhone?: string;
  }
) => {
  const store = await findOwnedStore(storeId, userId);
  const amount = Number(input.amount);
  if (!amount || amount <= 0) {
    throw new AppError(400, 'Invalid amount for POS KHQR payment', 'INVALID_AMOUNT');
  }

  const sellerUser = await User.findById(userId);
  if (!sellerUser) throw new AppError(401, 'User not found', 'UNAUTHORIZED');

  const now = new Date();
  const dateStr = [
    String(now.getUTCFullYear()).slice(2),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
  ].join('');
  const randomStr = Math.random().toString(36).slice(2, 7).toUpperCase();
  const tranId = `KC-POS-${dateStr}-${randomStr}`;

  const items =
    input.items && input.items.length > 0
      ? input.items.map((i) => ({
          name: (i.name || 'Store Item').slice(0, 50),
          quantity: Math.max(1, Number(i.quantity) || 1),
          price: Number(i.price) || amount,
        }))
      : [{ name: 'In-Store POS Sale', quantity: 1, price: amount }];

  const transaction = await payway.createTransaction({
    tranId,
    amount,
    items,
    firstName: input.customerName?.trim() || 'POS Customer',
    phone: input.customerPhone?.trim() || store.phoneNumber || '012345678',
    returnParams: `POS_${store._id}_${tranId}`,
    successUrl: `${env.webUrl}/seller/dashboard?view=pos&paid=1&tranId=${tranId}`,
    cancelUrl: `${env.webUrl}/seller/dashboard?view=pos&cancelled=1&tranId=${tranId}`,
  });

  return {
    ...transaction,
    storeId: String(store._id),
    storeName: store.storeName,
  };
};

export const checkPosKhqr = async (
  storeId: string,
  userId: string,
  tranId: string
) => {
  await findOwnedStore(storeId, userId);
  if (!tranId) throw new AppError(400, 'Transaction ID is required', 'INVALID_TRAN_ID');

  const status = await payway.checkTransaction(tranId);
  return {
    tranId,
    status,
    paid: status === 'PAID',
  };
};

export const simulatePosKhqrPayment = async (
  storeId: string,
  userId: string,
  tranId: string
) => {
  await findOwnedStore(storeId, userId);
  if (!tranId) throw new AppError(400, 'Transaction ID is required', 'INVALID_TRAN_ID');

  return {
    tranId,
    status: 'PAID',
    paid: true,
    simulated: true,
  };
};

