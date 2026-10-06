import mongoose, { QueryFilter } from 'mongoose';
import Product, { IProduct } from '../../../models/Product';
import Store from '../../../models/Store';
import { env } from '../../config/env';

/**
 * Everything a link preview needs, built ONLY from what is stored in the
 * database. Nothing from the request ends up in the preview text, so a share
 * link cannot be crafted to show a misleading title under our domain.
 */
export interface SharePreview {
  kind: 'product' | 'store';
  title: string;
  description: string;
  imageUrl: string | null;
  /** The share link itself — what og:url points at. */
  canonicalUrl: string;
  /** Where a person lands. Built from WEB_URL + validated ids, never from input. */
  targetUrl: string;
  price?: number;
}

const apiBase = () => env.apiPublicUrl.replace(/\/+$/, '');
const webBase = () => env.webUrl.replace(/\/+$/, '');

const clip = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
};

const HAS_PHOTO: QueryFilter<IProduct>[] = [
  { thumbnail: { $type: 'string', $ne: '' } },
  { image: { $type: 'string', $ne: '' } },
  { 'images.0': { $exists: true } },
];

const photoUrl = (productId: unknown) => `${apiBase()}/api/products/${String(productId)}/image`;

/** Only live listings can be shared — drafts and archived products look like they do not exist. */
export const getProductSharePreview = async (id: string): Promise<SharePreview | null> => {
  if (!mongoose.isValidObjectId(id)) return null;

  const product = await Product.findOne({ _id: id, status: 'ACTIVE' })
    .select('name description price storeName sellerName')
    .lean();
  if (!product) return null;

  const hasPhoto = await Product.exists({ _id: product._id, $or: HAS_PHOTO });
  const seller = product.storeName || product.sellerName;
  const price = `$${Number(product.price).toFixed(2)}`;
  const about = product.description ? clip(product.description, 160) : 'Handmade in Cambodia.';

  return {
    kind: 'product',
    title: product.name,
    description: seller ? `${price} · ${seller} — ${about}` : `${price} — ${about}`,
    imageUrl: hasPhoto ? photoUrl(product._id) : null,
    canonicalUrl: `${apiBase()}/api/share/product/${product._id}`,
    targetUrl: `${webBase()}/product/${product._id}`,
    price: Number(product.price),
  };
};

const sameText = (a: string | undefined, b: string) =>
  !!a && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * A store, or one category of it ("T-shirts"). The category and sub-category
 * must match something this store really sells — anything else is ignored,
 * which keeps arbitrary text out of the preview and out of the redirect.
 */
export const getStoreSharePreview = async (
  idOrSlug: string,
  category?: string,
  subcategory?: string,
): Promise<SharePreview | null> => {
  const store = mongoose.isValidObjectId(idOrSlug)
    ? await Store.findById(idOrSlug).lean()
    : await Store.findOne({ slug: idOrSlug.slice(0, 120) }).lean();
  // A store that has not finished setup has no public page to land on.
  if (!store || store.onboardingStatus !== 'COMPLETED') return null;

  const products = await Product.find({ sellerId: store._id, status: 'ACTIVE' })
    .select('_id category subcategory')
    .lean();

  const matchedCategory = category
    ? products.find((product) => sameText(product.category, category))?.category
    : undefined;
  const matchedSub =
    matchedCategory && subcategory
      ? products.find(
          (product) =>
            sameText(product.category, matchedCategory) && sameText(product.subcategory, subcategory),
        )?.subcategory
      : undefined;

  const scoped = products.filter(
    (product) =>
      (!matchedCategory || product.category === matchedCategory) &&
      (!matchedSub || product.subcategory === matchedSub),
  );

  const cover = scoped.length
    ? await Product.findOne({ _id: { $in: scoped.map((product) => product._id) }, $or: HAS_PHOTO })
        .select('_id')
        .lean()
    : null;

  const label = matchedSub ?? matchedCategory;
  const count = `${scoped.length} product${scoped.length === 1 ? '' : 's'}`;
  const blurb = store.storeTagline || (store.storeDescription ? clip(store.storeDescription, 140) : '');

  const query = new URLSearchParams();
  if (matchedCategory) query.set('category', matchedCategory);
  if (matchedSub) query.set('sub', matchedSub);
  const qs = query.toString();

  return {
    kind: 'store',
    title: label ? `${label} at ${store.storeName}` : store.storeName,
    description: blurb ? `${count} · ${blurb}` : `${count} from ${store.storeName} on KhmerCraft.`,
    imageUrl: cover ? photoUrl(cover._id) : null,
    canonicalUrl: `${apiBase()}/api/share/store/${store._id}${qs ? `?${qs}` : ''}`,
    targetUrl: `${webBase()}/stores/${store._id}${qs ? `?${qs}` : ''}`,
  };
};
