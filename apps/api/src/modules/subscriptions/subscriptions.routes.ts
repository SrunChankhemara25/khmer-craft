import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import {
  createPlanCheckout,
  payments,
  planPaymentStatus,
  subscription,
} from './subscriptions.controller';
import { createPlanCheckoutSchema } from './subscriptions.validation';

const router = Router();

// Every route here is the signed-in seller acting on their own store;
// ownership is checked in the service, not by a role, because a SELLER must
// still not touch another seller's billing.
router.use(authenticate);

router.post('/checkout', validate(createPlanCheckoutSchema), createPlanCheckout);

// Literal paths must precede the ':storeId' route, or they are read as ids.
router.get('/payments/:paymentId/status', planPaymentStatus);

router.get('/:storeId', subscription);
router.get('/:storeId/payments', payments);

export default router;
