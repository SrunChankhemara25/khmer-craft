import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  create,
  getPublic,
  listOwner,
  listPublic,
  remove,
  update,
} from './store-collections.controller';
import {
  createStoreCollectionSchema,
  updateStoreCollectionSchema,
} from './store-collections.validation';

const router = Router();

// Public routes for storefront shoppers
router.get('/stores/:storeId', listPublic);
router.get('/stores/:storeId/:collectionId', getPublic);

// Authenticated owner routes
router.use(authenticate, authorize('BUYER', 'SELLER', 'ADMIN'));

router.get('/my-stores/:storeId', listOwner);
router.post('/my-stores/:storeId', validate(createStoreCollectionSchema), create);
router.patch('/my-stores/:storeId/:collectionId', validate(updateStoreCollectionSchema), update);
router.delete('/my-stores/:storeId/:collectionId', remove);

export default router;
