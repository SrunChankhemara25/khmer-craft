import { Request, Response, Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { param } from '../../utils/request-params';
import {
  adminBalances,
  adminListAccounts,
  adminListPayouts,
  adminReviewAccount,
  cancelPayout,
  createDuePayouts,
  createPayout,
  getPayoutDetail,
  getSellerSummary,
  getSettings,
  markPaid,
  saveSellerAccount,
  toSettingsView,
  updateSettings,
} from './payouts.service';
import {
  cancelPayoutSchema,
  createPayoutSchema,
  markPaidSchema,
  payoutAccountSchema,
  reviewAccountSchema,
  settingsSchema,
} from './payouts.validation';

/**
 * Seller payouts. Sellers manage their own payout account and see their
 * balance; admins verify accounts, pay stores and record the receipts.
 * Controllers are inline: each is one call into the service.
 */
const router = Router();

router.use(authenticate);

const query = (request: Request, name: string) =>
  typeof request.query[name] === 'string' ? (request.query[name] as string) : undefined;

// ------------------------------------------------------------------ public-ish
// The rules a seller is paid under (commission, schedule) — any signed-in user.
router.get('/settings', async (_request: Request, response: Response) => {
  response.json(toSettingsView(await getSettings()));
});

// -------------------------------------------------------------- store owner
router.get('/my-stores/:storeId', async (request: Request, response: Response) => {
  response.json(await getSellerSummary(param(request, 'storeId'), request.auth!.userId));
});

router.put('/my-stores/:storeId/account', validate(payoutAccountSchema), async (request: Request, response: Response) => {
  response.json(await saveSellerAccount(param(request, 'storeId'), request.auth!.userId, request.body));
});

// ------------------------------------------------------------------- admin
// Literal admin paths are registered before '/:payoutId' so they never read as an id.
router.get('/admin/balances', authorize('ADMIN'), async (_request: Request, response: Response) => {
  response.json(await adminBalances());
});

router.put('/admin/settings', authorize('ADMIN'), validate(settingsSchema), async (request: Request, response: Response) => {
  response.json(await updateSettings(request.auth!.userId, request.body));
});

router.get('/admin/accounts', authorize('ADMIN'), async (request: Request, response: Response) => {
  response.json(await adminListAccounts(query(request, 'status')));
});

router.patch('/admin/accounts/:accountId', authorize('ADMIN'), validate(reviewAccountSchema), async (request: Request, response: Response) => {
  response.json(await adminReviewAccount(request.auth!.userId, param(request, 'accountId'), request.body.status, request.body.reason));
});

router.get('/admin/payouts', authorize('ADMIN'), async (request: Request, response: Response) => {
  response.json(
    await adminListPayouts({
      status: query(request, 'status'),
      storeId: query(request, 'storeId'),
      page: Number(query(request, 'page')) || 1,
      limit: Number(query(request, 'limit')) || 20,
    }),
  );
});

router.post('/admin/payouts', authorize('ADMIN'), validate(createPayoutSchema), async (request: Request, response: Response) => {
  response.status(201).json(await createPayout(request.auth!.userId, request.body.storeId, request.body.paid));
});

router.post('/admin/payouts/run-due', authorize('ADMIN'), async (request: Request, response: Response) => {
  response.json(await createDuePayouts(request.auth!.userId));
});

router.post('/admin/payouts/:payoutId/paid', authorize('ADMIN'), validate(markPaidSchema), async (request: Request, response: Response) => {
  response.json(await markPaid(request.auth!.userId, param(request, 'payoutId'), request.body));
});

router.post('/admin/payouts/:payoutId/cancel', authorize('ADMIN'), validate(cancelPayoutSchema), async (request: Request, response: Response) => {
  response.json(await cancelPayout(param(request, 'payoutId'), request.body.reason));
});

// Owner or admin: one payout with its order lines and receipt.
router.get('/:payoutId', async (request: Request, response: Response) => {
  response.json(await getPayoutDetail(param(request, 'payoutId'), request.auth!));
});

export default router;
