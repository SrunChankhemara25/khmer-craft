import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  apply,
  create,
  flagReviewHandler,
  getMyStores,
  getOrders,
  getProfile,
  getReviews,
  getStore,
  listApplications,
  listStores,
  replyReview,
  reviewApplication,
  updateProfile,
  getCustomersHandler,
  getCustomerDetailHandler,
  createPosOrderHandler,
  getPosOrdersHandler,
  getPosShiftHandler,
  openPosShiftHandler,
  closePosShiftHandler,
  recordCashMovementHandler,
  listPosRegistersHandler,
  createPosRegisterHandler,
  updatePosRegisterHandler,
  listPosShiftsHandler,
  createPosRefundHandler,
  voidPosOrderHandler,
  listPosRefundsHandler,
  getPosReportsHandler,
  getPromotionsHandler,
  createPromotionHandler,
  deletePromotionHandler,
  getSupportCasesHandler,
  createSupportCaseHandler,
  replySupportCaseHandler,
  getFinanceHandler,
  getNotificationsHandler,
  getAnalyticsHandler,
  generatePosKhqrHandler,
  checkPosKhqrHandler,
  simulatePosKhqrHandler,
  getPosKhqrSettingsHandler,
  updatePosKhqrSettingsHandler,
} from './sellers.controller';
import {
  createSellerApplicationSchema,
  createStoreSchema,
  posKhqrSettingsSchema,
  replyToReviewSchema,
  reviewSellerApplicationSchema,
  updateStoreProfileSchema,
} from './sellers.validation';

const router = Router();

// Public — anyone can browse the store directory.
router.get('/stores', listStores);
router.get('/stores/:storeId', getStore);

// Every route below requires a signed-in user. Any authenticated user (not
// just an existing SELLER) may hit these — creating a store is how a BUYER
// becomes a seller in the first place.
router.use(authenticate, authorize('BUYER', 'SELLER', 'ADMIN'));

router.get('/my-stores', getMyStores);
router.post('/my-stores', validate(createStoreSchema), create);
router.get('/my-stores/:storeId', getProfile);
router.put('/my-stores/:storeId/profile', validate(updateStoreProfileSchema), updateProfile);
router.get('/my-stores/:storeId/orders', getOrders);
router.get('/my-stores/:storeId/reviews', getReviews);
router.post('/my-stores/:storeId/reviews/:reviewId/reply', validate(replyToReviewSchema), replyReview);
router.post('/my-stores/:storeId/reviews/:reviewId/flag', flagReviewHandler);

// Customers
router.get('/my-stores/:storeId/customers', getCustomersHandler);
router.get('/my-stores/:storeId/customers/:customerId', getCustomerDetailHandler);

// POS Registers & Configuration
router.get('/my-stores/:storeId/pos/registers', listPosRegistersHandler);
router.post('/my-stores/:storeId/pos/registers', createPosRegisterHandler);
router.patch('/my-stores/:storeId/pos/registers/:registerId', updatePosRegisterHandler);

// POS Shifts & Drawer
router.get('/my-stores/:storeId/pos/shift', getPosShiftHandler);
router.post('/my-stores/:storeId/pos/shift/open', openPosShiftHandler);
router.post('/my-stores/:storeId/pos/shift/close', closePosShiftHandler);
router.post('/my-stores/:storeId/pos/shift/cash-movement', recordCashMovementHandler);
router.get('/my-stores/:storeId/pos/shifts', listPosShiftsHandler);

// POS Checkout, Orders, Returns, Voids & Reports
router.post('/my-stores/:storeId/pos/orders', createPosOrderHandler);
router.get('/my-stores/:storeId/pos/orders', getPosOrdersHandler);
router.post('/my-stores/:storeId/pos/orders/:orderId/refund', createPosRefundHandler);
router.post('/my-stores/:storeId/pos/orders/:orderId/void', voidPosOrderHandler);
router.get('/my-stores/:storeId/pos/refunds', listPosRefundsHandler);
router.get('/my-stores/:storeId/pos/reports', getPosReportsHandler);
router.get('/my-stores/:storeId/pos/khqr/settings', getPosKhqrSettingsHandler);
router.put('/my-stores/:storeId/pos/khqr/settings', validate(posKhqrSettingsSchema), updatePosKhqrSettingsHandler);
router.post('/my-stores/:storeId/pos/khqr/generate', generatePosKhqrHandler);
router.get('/my-stores/:storeId/pos/khqr/check/:tranId', checkPosKhqrHandler);
router.post('/my-stores/:storeId/pos/khqr/simulate/:tranId', simulatePosKhqrHandler);

// Promotions
router.get('/my-stores/:storeId/promotions', getPromotionsHandler);
router.post('/my-stores/:storeId/promotions', createPromotionHandler);
router.delete('/my-stores/:storeId/promotions/:promotionId', deletePromotionHandler);

// Support
router.get('/my-stores/:storeId/support-cases', getSupportCasesHandler);
router.post('/my-stores/:storeId/support-cases', createSupportCaseHandler);
router.post('/my-stores/:storeId/support-cases/:caseId/reply', replySupportCaseHandler);

// Finance, Notifications, Analytics
router.get('/my-stores/:storeId/finance', getFinanceHandler);
router.get('/my-stores/:storeId/notifications', getNotificationsHandler);
router.get('/my-stores/:storeId/analytics', getAnalyticsHandler);

// Applications: any signed-in user can apply; only staff can see the queue
// or decide one.
router.post('/apply', validate(createSellerApplicationSchema), apply);
router.get('/apply', authorize('ADMIN'), listApplications);
router.patch(
  '/apply/:applicationId',
  authorize('ADMIN'),
  validate(reviewSellerApplicationSchema),
  reviewApplication,
);

export default router;
