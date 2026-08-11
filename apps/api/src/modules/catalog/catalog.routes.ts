import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { create, detail, list } from './catalog.controller';
import { createProductSchema } from './catalog.validation';

const router = Router();

// Public browsing.
router.get('/', list);

// Must stay after any other literal '/...' GET routes, since ':id' matches
// anything. There are none today — keep it last if any are added.
router.get('/:id', detail);

// Sellers and admins only. TODO(seller-branch): once Seller merges, stamp
// sellerId from the authenticated seller instead of trusting sellerName.
router.post(
  '/',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  validate(createProductSchema),
  create,
);

export default router;
