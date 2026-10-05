import mongoose, { Types } from 'mongoose';
import StoreCollection, { IStoreCollection } from '../../../models/StoreCollection';
import Product from '../../../models/Product';
import { AppError } from '../../errors/app-error';
import { findOwnedStore } from '../sellers/sellers.service';
import { slugify } from '../../utils/slugify';
import {
  CreateStoreCollectionInput,
  UpdateStoreCollectionInput,
} from './store-collections.validation';

const toOwnerCollection = (collection: IStoreCollection) => ({
  id: collection._id.toString(),
  storeId: collection.storeId.toString(),
  name: collection.name,
  slug: collection.slug,
  description: collection.description ?? '',
  coverImage: collection.coverImage ?? '',
  productIds: (collection.productIds ?? []).map((p: any) =>
    typeof p === 'object' && p._id ? p._id.toString() : p.toString()
  ),
  products: Array.isArray(collection.productIds) && collection.productIds.length > 0 && typeof (collection.productIds[0] as any) === 'object' && (collection.productIds[0] as any).name
    ? collection.productIds.map((p: any) => ({
        id: p._id.toString(),
        name: p.name,
        price: p.price,
        imageUrl: p.imageUrl || (p.images && p.images[0]) || '',
        category: p.category,
      }))
    : [],
  productCount: collection.productIds ? collection.productIds.length : 0,
  visible: collection.visible,
  sortOrder: collection.sortOrder,
  createdAt: collection.createdAt,
  updatedAt: collection.updatedAt,
});

const toPublicCollection = (collection: IStoreCollection) => ({
  id: collection._id.toString(),
  storeId: collection.storeId.toString(),
  name: collection.name,
  slug: collection.slug,
  description: collection.description ?? '',
  coverImage: collection.coverImage ?? '',
  productIds: (collection.productIds ?? []).map((p: any) =>
    typeof p === 'object' && p._id ? p._id.toString() : p.toString()
  ),
  products: Array.isArray(collection.productIds) && collection.productIds.length > 0 && typeof (collection.productIds[0] as any) === 'object' && (collection.productIds[0] as any).name
    ? collection.productIds.map((p: any) => ({
        id: p._id.toString(),
        name: p.name,
        price: p.price,
        imageUrl: p.imageUrl || (p.images && p.images[0]) || '',
        category: p.category,
        description: p.description,
      }))
    : [],
  productCount: collection.productIds ? collection.productIds.length : 0,
  sortOrder: collection.sortOrder,
});

const uniqueCollectionSlug = async (storeId: Types.ObjectId, name: string): Promise<string> => {
  const base = slugify(name) || 'collection';
  let slug = base;
  for (let attempt = 2; await StoreCollection.exists({ storeId, slug }); attempt += 1) {
    slug = `${base}-${attempt}`;
  }
  return slug;
};

export const listPublic = async (storeId: string) => {
  const collections = await StoreCollection.find({ storeId, visible: true })
    .populate('productIds', 'name price images imageUrl category description')
    .sort({ sortOrder: 1, createdAt: -1 });
  return collections.map(toPublicCollection);
};

export const getPublic = async (storeId: string, collectionIdOrSlug: string) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(collectionIdOrSlug);
  const query: any = { storeId, visible: true };
  if (isObjectId) {
    query.$or = [{ _id: collectionIdOrSlug }, { slug: collectionIdOrSlug }];
  } else {
    query.slug = collectionIdOrSlug;
  }
  const collection = await StoreCollection.findOne(query).populate('productIds');
  if (!collection) {
    throw new AppError(404, 'Collection not found', 'COLLECTION_NOT_FOUND');
  }
  return toPublicCollection(collection);
};

export const listOwner = async (storeId: string, userId: string) => {
  const store = await findOwnedStore(storeId, userId);
  const collections = await StoreCollection.find({ storeId: store._id })
    .populate('productIds', 'name price images imageUrl category')
    .sort({ sortOrder: 1, createdAt: -1 });
  return collections.map(toOwnerCollection);
};

export const create = async (
  storeId: string,
  userId: string,
  input: CreateStoreCollectionInput
) => {
  const store = await findOwnedStore(storeId, userId);
  const slug = await uniqueCollectionSlug(store._id, input.name);
  const count = await StoreCollection.countDocuments({ storeId: store._id });

  const validProductIds = (input.productIds || [])
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const collection = await StoreCollection.create({
    storeId: store._id,
    name: input.name,
    slug,
    description: input.description,
    coverImage: input.coverImage,
    productIds: validProductIds,
    visible: input.visible !== undefined ? input.visible : true,
    sortOrder: count,
  });

  await collection.populate('productIds', 'name price images imageUrl category');
  return toOwnerCollection(collection);
};

export const update = async (
  storeId: string,
  collectionId: string,
  userId: string,
  input: UpdateStoreCollectionInput
) => {
  const store = await findOwnedStore(storeId, userId);
  const collection = await StoreCollection.findOne({ _id: collectionId, storeId: store._id });
  if (!collection) {
    throw new AppError(404, 'Collection not found', 'COLLECTION_NOT_FOUND');
  }

  if (input.name !== undefined && input.name !== collection.name) {
    collection.name = input.name;
    collection.slug = await uniqueCollectionSlug(store._id, input.name);
  }
  if (input.description !== undefined) {
    collection.description = input.description || '';
  }
  if (input.coverImage !== undefined) {
    collection.coverImage = input.coverImage || '';
  }
  if (input.productIds !== undefined) {
    collection.productIds = (input.productIds || [])
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
  }
  if (input.visible !== undefined) {
    collection.visible = input.visible;
  }
  if (input.sortOrder !== undefined) {
    collection.sortOrder = input.sortOrder;
  }

  await collection.save();
  await collection.populate('productIds', 'name price images imageUrl category');
  return toOwnerCollection(collection);
};

export const remove = async (storeId: string, collectionId: string, userId: string) => {
  const store = await findOwnedStore(storeId, userId);
  const collection = await StoreCollection.findOne({ _id: collectionId, storeId: store._id });
  if (!collection) {
    throw new AppError(404, 'Collection not found', 'COLLECTION_NOT_FOUND');
  }
  await StoreCollection.deleteOne({ _id: collection._id });
  return { deleted: true, id: collectionId };
};
