import { Request, Response } from 'express';
import { AppError } from '../../errors/app-error';
import Seller from '../../../models/Seller';

export const getMyStores = async (req: Request, res: Response) => {
  console.log('HIT getMyStores endpoint. Auth userId:', req.auth?.userId);
  const userId = req.auth?.userId;
  let stores = await Seller.find({ userId });
  console.log('Found stores for user:', stores.length);
  
  if (stores.length === 0 && userId) {
    console.log('Creating new store for user', userId);
    try {
      const newStore = await Seller.create({
        userId,
        storeName: 'My Awesome Store',
        subscriptionPlan: 'STARTER',
        onboardingStatus: 'PENDING'
      });
      stores = [newStore];
      console.log('Created new store:', newStore._id);
    } catch (err) {
      console.error('Failed to create store:', err);
    }
  }
  
  res.json(stores);
};

export const getStoreProfile = async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const store = await Seller.findById(storeId);
  if (!store || store.userId.toString() !== req.auth?.userId) {
    throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND');
  }
  
  // Return the mapped fields exactly as the frontend expects
  res.json({
    id: store._id,
    storeName: store.storeName,
    storeDescription: store.storeDescription,
    location: store.location,
    phoneNumber: store.phoneNumber,
    logoUrl: store.storeAvatarUrl,
    bannerUrl: store.storeCoverImages?.[0] || undefined
  });
};

export const updateStoreProfile = async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const store = await Seller.findById(storeId);
  if (!store || store.userId.toString() !== req.auth?.userId) {
    throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND');
  }

  const { storeName, storeDescription, location, phoneNumber, logoUrl, bannerUrl } = req.body;
  
  if (storeName !== undefined) store.storeName = storeName;
  if (storeDescription !== undefined) store.storeDescription = storeDescription;
  if (location !== undefined) store.location = location;
  if (phoneNumber !== undefined) store.phoneNumber = phoneNumber;
  
  if (logoUrl !== undefined) store.storeAvatarUrl = logoUrl;
  
  if (bannerUrl !== undefined) {
    store.storeCoverImages = [bannerUrl];
  }

  await store.save();
  res.json({
    message: 'Profile updated successfully',
    storeName: store.storeName,
    storeDescription: store.storeDescription,
    location: store.location,
    phoneNumber: store.phoneNumber,
    logoUrl: store.storeAvatarUrl,
    bannerUrl: store.storeCoverImages?.[0]
  });
};

export const getStoreOrders = async (req: Request, res: Response) => {
  res.json({
    metrics: { pendingOrders: 0, inTransit: 0, completed30d: 0, revenueMtd: 0 },
    orders: [],
    pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
  });
};

export const getStoreReviews = async (req: Request, res: Response) => {
  res.json({ stats: {}, reviews: [] });
};
