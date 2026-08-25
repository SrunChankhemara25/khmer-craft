import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  getMyStores,
  getStoreProfile,
  updateStoreProfile,
  getStoreOrders,
  getStoreReviews,
  getPublicStores,
  getPublicStoreProfile
} from './sellers.controller';

const router = Router();

// Public routes
router.get('/stores', getPublicStores);
router.get('/stores/:storeId', getPublicStoreProfile);

router.use(authenticate, authorize('BUYER', 'SELLER', 'ADMIN'));

router.get('/my-stores', getMyStores);
router.get('/my-stores/:storeId', getStoreProfile);
router.put('/my-stores/:storeId/profile', updateStoreProfile);
router.get('/my-stores/:storeId/orders', getStoreOrders);
router.get('/my-stores/:storeId/reviews', getStoreReviews);

export default router;
