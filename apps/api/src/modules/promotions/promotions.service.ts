import mongoose from 'mongoose';
import {
  PromotionCampaign,
  PromotionSlide,
  IPromotionSlide,
  SlidePlacement,
  SlideStatus,
} from '../../../models/Promotion';
import Store from '../../../models/Store';
import Product from '../../../models/Product';
import { AppError } from '../../errors/app-error';

// Seed default Pchum Ben campaign if database has none
export const ensureDefaultCampaign = async () => {
  const count = await PromotionCampaign.countDocuments();
  if (count === 0) {
    const now = new Date();
    const future = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    await PromotionCampaign.create({
      title: 'Pchum Ben Festival Special 2026',
      theme: 'pchum-ben',
      kicker: 'PCHUM BEN CELEBRATION',
      description:
        'Celebrate the ancestral holiday with artisanal Cambodian crafts, lotus offerings, and temple gifts. Featured on the marketplace homepage.',
      startDate: now,
      endDate: future,
      isFree: true,
      freeDays: 7,
      dailyRate: 3,
      status: 'ACTIVE',
    });
  } else {
    // Ensure all active free campaigns have freeDays default of 7 and extra day rate
    await PromotionCampaign.updateMany(
      { isFree: true, $or: [{ freeDays: { $exists: false } }, { freeDays: 0 }] },
      { $set: { freeDays: 7, dailyRate: 3 } }
    );
  }
};

const isLive = (slide: IPromotionSlide, now: Date) =>
  slide.status === 'APPROVED' &&
  slide.startDate <= now &&
  slide.endDate >= now &&
  (slide.isHouse || slide.isPaid || slide.totalPrice === 0);

/** Slides created before `placement` existed were all brand-rail slides. */
const placementFilter = (placement: SlidePlacement): Record<string, any> =>
  placement === 'BRAND_ADS'
    ? { $or: [{ placement: 'BRAND_ADS' }, { placement: mongoose.trusted({ $exists: false }) }] }
    : { placement };

/**
 * Slides shoppers see right now for one carousel, in admin-chosen order.
 *
 * HERO has no fallback: when nothing is live the hero slider keeps its own
 * built-in banners. BRAND_ADS keeps its curated defaults so the rail is never
 * empty on a fresh database.
 */
export const listActiveSlides = async (placement: SlidePlacement = 'BRAND_ADS') => {
  await ensureDefaultCampaign();
  const now = new Date();

  const slides = await PromotionSlide.find({
    status: 'APPROVED',
    ...placementFilter(placement),
  }).sort({ sortOrder: 1, createdAt: -1 });

  const active = slides.filter((s) => isLive(s, now));

  if (active.length > 0 || placement === 'HERO') {
    return active.map(toPublicSlide);
  }

  // Curated brand ads slides matching LV, Dior, and premier Cambodian artisans
  return [
    {
      id: 'default-lv',
      theme: 'luxury',
      badge: 'OFFICIAL BRAND',
      title: 'Louis Vuitton',
      subtitle: 'Savoir-Faire & Leather Craftsmanship',
      imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=80',
      targetType: 'STORE',
      targetId: 'louis-vuitton',
      targetUrl: '/stores',
      buttonText: 'Explore Brand',
      storeName: 'Louis Vuitton Maison',
      isDefault: true,
    },
    {
      id: 'default-dior',
      theme: 'luxury',
      badge: 'HAUTE COUTURE',
      title: 'Christian Dior',
      subtitle: 'Artisanal Silk & Haute Couture Collections',
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
      targetType: 'STORE',
      targetId: 'dior',
      targetUrl: '/stores',
      buttonText: 'Visit Collection',
      storeName: 'Dior Paris',
      isDefault: true,
    },
    {
      id: 'default-pchum-ben',
      theme: 'pchum-ben',
      badge: 'PCHUM BEN FESTIVAL',
      title: 'Silk & Stone Atelier',
      subtitle: 'Traditional copper betel sets, hand-beaten silver bowls & lotus silks.',
      imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
      targetType: 'STORE',
      targetId: 'all-stores',
      targetUrl: '/stores',
      buttonText: 'Explore Pchum Ben Crafts',
      storeName: 'Kampong Luong Silversmiths',
      isDefault: true,
    },
    {
      id: 'default-artisans-angkor',
      theme: 'local-pride',
      badge: 'HERITAGE ATELIER',
      title: 'Artisans Angkor',
      subtitle: 'Sacred Sandstone Sculptures & Handwoven Silk Krama',
      imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1200&q=80',
      targetType: 'STORE',
      targetId: 'ceramic-stores',
      targetUrl: '/stores',
      buttonText: 'Discover Brand',
      storeName: 'Artisans Angkor Siem Reap',
      isDefault: true,
    },
    {
      id: 'default-kampot-pottery',
      theme: 'local-pride',
      badge: 'AUTHENTIC STONEWARE',
      title: 'Kampot Pottery Studio',
      subtitle: 'Wood-fired coastal clay tableware & authentic Khmer ceramic crafts.',
      imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80',
      targetType: 'STORE',
      targetId: 'gifts',
      targetUrl: '/stores',
      buttonText: 'Shop Stoneware',
      storeName: 'Kampot Studio',
      isDefault: true,
    },
  ];
};

export const listCampaigns = async () => {
  await ensureDefaultCampaign();
  return PromotionCampaign.find().sort({ createdAt: -1 });
};

export const createCampaign = async (input: {
  title: string;
  theme?: 'pchum-ben' | 'water-festival' | 'khmer-new-year' | 'local-pride' | 'general';
  kicker?: string;
  description: string;
  bannerImage?: string;
  startDate: string;
  endDate: string;
  isFree: boolean;
  dailyRate?: number;
}) => {
  return PromotionCampaign.create({
    ...input,
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),
    dailyRate: input.isFree ? 0 : input.dailyRate ?? 3,
  });
};

export const updateCampaign = async (
  id: string,
  input: Partial<{
    title: string;
    theme: any;
    kicker: string;
    description: string;
    status: 'ACTIVE' | 'ARCHIVED' | 'UPCOMING';
    isFree: boolean;
    dailyRate: number;
  }>
) => {
  const campaign = await PromotionCampaign.findByIdAndUpdate(id, input, { new: true });
  if (!campaign) throw new AppError(404, 'Campaign not found', 'NOT_FOUND');
  return campaign;
};

export const applySlide = async (
  userId: string,
  input: {
    storeId: string;
    campaignId?: string;
    badge?: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    targetType: 'STORE' | 'PRODUCT';
    targetId: string;
    buttonText?: string;
    startDate: string;
    days: number;
    isDraft?: boolean;
    status?: 'DRAFT' | 'PENDING_APPROVAL';
  }
) => {
  const store = await Store.findOne({ _id: input.storeId, userId });
  if (!store) {
    throw new AppError(404, 'Store not found or unauthorized', 'NOT_FOUND');
  }

  let theme = 'general';
  let isFree = true;
  let freeDays = 7;
  let dailyRate = 3;
  let campaignTitle: string | undefined;

  if (input.campaignId) {
    const campaign = await PromotionCampaign.findById(input.campaignId);
    if (campaign) {
      theme = campaign.theme;
      isFree = campaign.isFree;
      freeDays = campaign.freeDays ?? (campaign.isFree ? 7 : 0);
      dailyRate = campaign.dailyRate ?? 3;
      campaignTitle = campaign.title;
    }
  }

  const start = new Date(input.startDate || Date.now());
  const days = Math.max(1, Number(input.days) || 7);
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

  // If campaign is free for the initial period (e.g. 7 days / 1 week free):
  // Days within the free allowance are $0. Only extra days are charged!
  const billableDays = isFree ? Math.max(0, days - freeDays) : days;
  const totalPrice = dailyRate > 0 ? billableDays * dailyRate : 0;
  const isPaid = totalPrice === 0;

  let targetUrl = `/stores/${store.slug || store._id}`;
  if (input.targetType === 'PRODUCT' && input.targetId) {
    targetUrl = `/product/${input.targetId}`;
  }

  const status = input.isDraft || input.status === 'DRAFT' ? 'DRAFT' : 'PENDING_APPROVAL';

  const slide = await PromotionSlide.create({
    storeId: store._id,
    storeName: store.storeName,
    storeSlug: store.slug,
    sellerUserId: new mongoose.Types.ObjectId(userId),
    campaignId: input.campaignId ? new mongoose.Types.ObjectId(input.campaignId) : undefined,
    campaignTitle,
    theme,
    badge: input.badge || (theme === 'pchum-ben' ? 'PCHUM BEN' : 'FEATURED'),
    title: input.title || 'Untitled Campaign Draft',
    subtitle: input.subtitle || '',
    imageUrl: input.imageUrl || '',
    targetType: input.targetType || 'STORE',
    targetId: input.targetId || String(store._id),
    targetUrl,
    buttonText: input.buttonText || 'Explore Now',
    startDate: start,
    endDate: end,
    days,
    freeDays,
    billableDays,
    dailyRate,
    totalPrice,
    isPaid,
    paidAt: isPaid ? new Date() : undefined,
    status,
  });

  return slide;
};

export const updateSlide = async (
  userId: string,
  slideId: string,
  input: Partial<{
    title: string;
    subtitle: string;
    imageUrl: string;
    targetType: 'STORE' | 'PRODUCT';
    targetId: string;
    startDate: string;
    days: number;
    status: 'DRAFT' | 'PENDING_APPROVAL';
  }>
) => {
  const slide = await PromotionSlide.findOne({ _id: slideId, sellerUserId: userId });
  if (!slide) throw new AppError(404, 'Advertisement slide not found', 'NOT_FOUND');

  if (slide.status !== 'DRAFT' && slide.status !== 'PENDING_APPROVAL') {
    throw new AppError(400, 'Cannot edit an advertisement that has already been approved or rejected', 'CANNOT_EDIT');
  }

  if (input.title !== undefined) slide.title = input.title;
  if (input.subtitle !== undefined) slide.subtitle = input.subtitle;
  if (input.imageUrl !== undefined) slide.imageUrl = input.imageUrl;
  if (input.targetType !== undefined) slide.targetType = input.targetType;
  if (input.targetId !== undefined) {
    slide.targetId = input.targetId;
    slide.targetUrl = input.targetType === 'PRODUCT' ? `/product/${input.targetId}` : `/stores/${slide.storeSlug}`;
  }
  if (input.startDate !== undefined) slide.startDate = new Date(input.startDate);
  if (input.days !== undefined) {
    slide.days = Math.max(1, Number(input.days));
    slide.endDate = new Date(slide.startDate.getTime() + slide.days * 24 * 60 * 60 * 1000);
    const freeDays = (slide as any).freeDays ?? 7;
    const billableDays = Math.max(0, slide.days - freeDays);
    slide.billableDays = billableDays;
    slide.totalPrice = slide.dailyRate > 0 ? billableDays * slide.dailyRate : 0;
    slide.isPaid = slide.totalPrice === 0;
    if (slide.isPaid && !slide.paidAt) slide.paidAt = new Date();
  }
  if (input.status) slide.status = input.status;

  await slide.save();
  return slide;
};

export const submitDraftSlide = async (userId: string, slideId: string) => {
  const slide = await PromotionSlide.findOne({ _id: slideId, sellerUserId: userId });
  if (!slide) throw new AppError(404, 'Advertisement slide not found', 'NOT_FOUND');

  if (!slide.title || !slide.title.trim()) {
    throw new AppError(400, 'Advertisement title is required before submitting', 'MISSING_TITLE');
  }

  slide.status = 'PENDING_APPROVAL';
  await slide.save();
  return slide;
};

export const deleteSlide = async (userId: string, slideId: string) => {
  const slide = await PromotionSlide.findOneAndDelete({ _id: slideId, sellerUserId: userId });
  if (!slide) throw new AppError(404, 'Advertisement slide not found', 'NOT_FOUND');
  return { success: true };
};

export const listSellerSlides = async (userId: string) => {
  return PromotionSlide.find({ sellerUserId: userId }).sort({ createdAt: -1 });
};

export const paySlide = async (userId: string, slideId: string) => {
  const slide = await PromotionSlide.findOne({ _id: slideId, sellerUserId: userId });
  if (!slide) throw new AppError(404, 'Promotion slide not found', 'NOT_FOUND');

  slide.isPaid = true;
  slide.paidAt = new Date();
  await slide.save();

  return slide;
};

export const listAdminSlides = async (status?: string, placement?: string) => {
  const filter: Record<string, unknown> = {};
  if (status && status !== 'ALL') {
    filter.status = status;
  }
  if (placement === 'HERO' || placement === 'BRAND_ADS') {
    Object.assign(filter, placementFilter(placement));
  }
  const slides = await PromotionSlide.find(filter).sort({ sortOrder: 1, createdAt: -1 });
  const now = new Date();
  return slides.map((slide) => ({
    ...slide.toObject(),
    id: String(slide._id),
    placement: slide.placement ?? 'BRAND_ADS',
    isLive: isLive(slide, now),
  }));
};

const loadSlide = async (slideId: string) => {
  if (!mongoose.isValidObjectId(slideId)) {
    throw new AppError(404, 'Promotion slide not found', 'NOT_FOUND');
  }
  const slide = await PromotionSlide.findById(slideId);
  if (!slide) throw new AppError(404, 'Promotion slide not found', 'NOT_FOUND');
  return slide;
};

const nextSortOrder = async (placement: SlidePlacement) => {
  const last = await PromotionSlide.findOne(placementFilter(placement))
    .sort({ sortOrder: -1 })
    .select('sortOrder');
  return (last?.sortOrder ?? 0) + 1;
};

export const reviewSlide = async (
  slideId: string,
  status: 'APPROVED' | 'REJECTED',
  rejectionReason?: string
) => {
  const slide = await loadSlide(slideId);
  if (slide.status === 'DRAFT' && !slide.isHouse) {
    throw new AppError(409, 'The seller has not submitted this slide yet', 'SLIDE_NOT_SUBMITTED');
  }

  // A newly approved slide joins the end of its carousel rather than jumping
  // ahead of slides an admin has already arranged.
  if (status === 'APPROVED' && slide.status !== 'APPROVED') {
    slide.sortOrder = await nextSortOrder(slide.placement ?? 'BRAND_ADS');
  }
  slide.status = status;
  slide.rejectionReason = status === 'REJECTED' ? rejectionReason : undefined;
  slide.reviewedAt = new Date();
  await slide.save();

  return slide;
};

export interface AdminSlideInput {
  placement: SlidePlacement;
  badge?: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  targetUrl: string;
  buttonText?: string;
  theme?: string;
  startDate?: string;
  endDate?: string;
  /** Publish immediately, or keep as a draft only admins see. */
  publish?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** A KhmerCraft-owned slide: no store, no billing, live as soon as published. */
export const createHouseSlide = async (input: AdminSlideInput) => {
  const start = input.startDate ? new Date(input.startDate) : new Date();
  const end = input.endDate ? new Date(input.endDate) : new Date(start.getTime() + 365 * DAY_MS);
  if (end <= start) {
    throw new AppError(422, 'End date must be after the start date', 'VALIDATION_ERROR');
  }
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_MS));

  return PromotionSlide.create({
    isHouse: true,
    placement: input.placement,
    sortOrder: await nextSortOrder(input.placement),
    storeName: 'KhmerCraft',
    theme: input.theme || 'general',
    badge: input.badge || 'KHMERCRAFT',
    title: input.title,
    subtitle: input.subtitle ?? '',
    imageUrl: input.imageUrl,
    targetType: 'STORE',
    targetId: 'khmercraft',
    targetUrl: input.targetUrl,
    buttonText: input.buttonText || 'Explore Now',
    startDate: start,
    endDate: end,
    days,
    freeDays: days,
    billableDays: 0,
    dailyRate: 0,
    totalPrice: 0,
    isPaid: true,
    paidAt: new Date(),
    status: input.publish === false ? 'DRAFT' : 'APPROVED',
    reviewedAt: new Date(),
  });
};

/**
 * Admin edit of any slide. Content fields are only editable on house slides —
 * a seller's slide is their creative, and an admin who disagrees with it
 * rejects or pauses it rather than rewriting it under their name. Placement
 * and schedule are marketplace decisions, so those stay editable on both.
 */
export const adminUpdateSlide = async (slideId: string, input: Partial<AdminSlideInput>) => {
  const slide = await loadSlide(slideId);

  if (slide.isHouse) {
    if (input.title !== undefined) slide.title = input.title;
    if (input.subtitle !== undefined) slide.subtitle = input.subtitle;
    if (input.badge !== undefined) slide.badge = input.badge;
    if (input.imageUrl !== undefined) slide.imageUrl = input.imageUrl;
    if (input.targetUrl !== undefined) slide.targetUrl = input.targetUrl;
    if (input.buttonText !== undefined) slide.buttonText = input.buttonText;
    if (input.theme !== undefined) slide.theme = input.theme;
  }
  if (input.placement !== undefined && input.placement !== (slide.placement ?? 'BRAND_ADS')) {
    slide.placement = input.placement;
    slide.sortOrder = await nextSortOrder(input.placement);
  }
  if (input.startDate !== undefined) slide.startDate = new Date(input.startDate);
  if (input.endDate !== undefined) slide.endDate = new Date(input.endDate);
  if (slide.endDate <= slide.startDate) {
    throw new AppError(422, 'End date must be after the start date', 'VALIDATION_ERROR');
  }

  await slide.save();
  return slide;
};

type AdminSettableStatus = Extract<SlideStatus, 'APPROVED' | 'PAUSED' | 'DRAFT'>;

/** Pause takes a live slide off the homepage without losing its approval. */
export const setSlideStatus = async (slideId: string, status: AdminSettableStatus) => {
  const slide = await loadSlide(slideId);
  const allowedFrom: Record<AdminSettableStatus, SlideStatus[]> = {
    PAUSED: ['APPROVED'],
    APPROVED: slide.isHouse ? ['PAUSED', 'DRAFT'] : ['PAUSED'],
    DRAFT: slide.isHouse ? ['APPROVED', 'PAUSED'] : [],
  };
  if (!allowedFrom[status].includes(slide.status)) {
    throw new AppError(
      409,
      `A ${slide.status.toLowerCase().replace('_', ' ')} slide cannot be set to ${status.toLowerCase()}`,
      'INVALID_SLIDE_TRANSITION',
    );
  }
  slide.status = status;
  await slide.save();
  return slide;
};

export const adminDeleteSlide = async (slideId: string) => {
  const slide = await loadSlide(slideId);
  await slide.deleteOne();
  return { success: true };
};

/** Persist a carousel's order: `ids` is the full new sequence, first shown first. */
export const reorderSlides = async (placement: SlidePlacement, ids: string[]) => {
  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    throw new AppError(422, 'Unknown slide id in order', 'VALIDATION_ERROR');
  }
  await PromotionSlide.bulkWrite(
    ids.map((id, index) => ({
      updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index + 1, placement } } },
    })),
  );
  return listAdminSlides('ALL', placement);
};

const toPublicSlide = (slide: IPromotionSlide) => ({
  id: String(slide._id),
  placement: slide.placement ?? 'BRAND_ADS',
  theme: slide.theme,
  badge: slide.badge,
  title: slide.title,
  subtitle: slide.subtitle,
  imageUrl: slide.imageUrl,
  targetType: slide.targetType,
  targetId: slide.targetId,
  targetUrl: slide.targetUrl,
  buttonText: slide.buttonText,
  storeName: slide.storeName,
  storeSlug: slide.storeSlug,
  isDefault: false,
});
