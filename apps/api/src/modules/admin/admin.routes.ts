import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { overview, sellers, subscriptionPayments, userStatus } from './admin.controller';
import { setUserStatusSchema } from './admin.validation';

/**
 * Marketplace-wide monitoring and account control. Every route is ADMIN-only;
 * per-store data a seller can see about themselves lives in their own modules.
 */
const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/overview', overview);
router.get('/sellers', sellers);
router.get('/subscription-payments', subscriptionPayments);
router.patch('/users/:userId/status', validate(setUserStatusSchema), userStatus);

export default router;
