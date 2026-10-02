import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import {
  createPaywayCheckout,
  paywayCallback,
  paywayStatus,
} from './payments.controller';
import { createPaywayCheckoutSchema } from './payments.validation';

const router = Router();

router.post(
  '/aba-payway/checkout',
  authenticate,
  validate(createPaywayCheckoutSchema),
  createPaywayCheckout,
);

// The payment page polls this every few seconds while a QR is on screen.
router.get('/aba-payway/status/:orderId', authenticate, paywayStatus);

// PayWay calls this directly — no cookie, so no `authenticate` here.
router.post('/aba-payway/callback', paywayCallback);

export default router;
