import { Request, Response } from 'express';
import { AppError } from '../../errors/app-error';
import { param } from '../../utils/request-params';
import { AUTH_COOKIE_NAME, authCookieOptions, signAccessToken } from '../../utils/jwt';
import {
  applyToBecomeSeller,
  createStore,
  flagReview,
  getPublicStore,
  getStoreOrders,
  getStoreProfile,
  getStoreReviews,
  listMyStores,
  listPublicStores,
  listSellerApplications,
  replyToReview,
  reviewSellerApplication,
  updateStoreProfile,
  getStoreCustomers,
  getStoreCustomerDetail,
  createPosOrder,
  getPosOrders,
  getPosCurrentShift,
  openPosShift,
  closePosShift,
  recordPosCashMovement,
  listPosRegisters,
  createPosRegister,
  updatePosRegister,
  listPosShifts,
  createPosRefund,
  voidPosOrder,
  listPosRefunds,
  getPosReports,
  getStorePromotions,
  createStorePromotion,
  deleteStorePromotion,
  getStoreSupportCases,
  createStoreSupportCase,
  replyStoreSupportCase,
  getStoreFinance,
  getStoreNotifications,
  getStoreAnalytics,
  generatePosKhqr,
  checkPosKhqr,
  simulatePosKhqrPayment,
  getPosKhqrSettings,
  updatePosKhqrSettings,
} from './sellers.service';
import {
  CreateSellerApplicationInput,
  CreateStoreInput,
  ReplyToReviewInput,
  ReviewSellerApplicationInput,
  UpdateStoreProfileInput,
  listStoreOrdersQuerySchema,
  listStoreReviewsQuerySchema,
  listStoresQuerySchema,
} from './sellers.validation';

const parseQuery = <T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: any } }, query: unknown): T => {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    throw new AppError(422, 'Invalid query parameters', 'VALIDATION_ERROR', parsed.error!.flatten().fieldErrors);
  }
  return parsed.data!;
};

// ------------------------------------------------------------------ public

export const listStores = async (request: Request, response: Response) => {
  response.json(await listPublicStores(parseQuery(listStoresQuerySchema, request.query)));
};

export const getStore = async (request: Request, response: Response) => {
  response.json(await getPublicStore(param(request, 'storeId')));
};

// ------------------------------------------------------------------- owner

export const getMyStores = async (request: Request, response: Response) => {
  response.json(await listMyStores(request.auth!.userId));
};

/**
 * Creating a store is how a signed-in user becomes a seller. When that
 * promotes their role, the access token already on the request was signed
 * with the old one — reissue it here, exactly like login does, or the next
 * request fails `authenticate`'s role check.
 */
export const create = async (request: Request, response: Response) => {
  const { store, roleChanged, pendingPlan } = await createStore(
    request.auth!.userId,
    request.body as CreateStoreInput,
  );

  if (roleChanged) {
    const user = request.auth!.user;
    const token = signAccessToken(String(user._id), 'SELLER', user.token_version);
    response.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
  }

  // `pendingPlan` rides alongside the store's own fields rather than nesting
  // it, so every existing caller that reads the store straight off the body
  // keeps working. Null unless a paid plan was chosen and still owes payment.
  response.status(201).json({ ...store, pendingPlan });
};

export const getProfile = async (request: Request, response: Response) => {
  response.json(await getStoreProfile(param(request, 'storeId'), request.auth!.userId));
};

export const updateProfile = async (request: Request, response: Response) => {
  response.json(
    await updateStoreProfile(
      param(request, 'storeId'),
      request.auth!.userId,
      request.body as UpdateStoreProfileInput,
    ),
  );
};

export const getOrders = async (request: Request, response: Response) => {
  const query = parseQuery(listStoreOrdersQuerySchema, request.query);
  response.json(await getStoreOrders(param(request, 'storeId'), request.auth!.userId, query));
};

export const getReviews = async (request: Request, response: Response) => {
  const query = parseQuery(listStoreReviewsQuerySchema, request.query);
  response.json(await getStoreReviews(param(request, 'storeId'), request.auth!.userId, query));
};

export const replyReview = async (request: Request, response: Response) => {
  response.json(
    await replyToReview(
      param(request, 'storeId'),
      request.auth!.userId,
      param(request, 'reviewId'),
      request.body as ReplyToReviewInput,
    ),
  );
};

export const flagReviewHandler = async (request: Request, response: Response) => {
  response.json(
    await flagReview(param(request, 'storeId'), request.auth!.userId, param(request, 'reviewId')),
  );
};

// ------------------------------------------------------------ applications

export const apply = async (request: Request, response: Response) => {
  response
    .status(201)
    .json(await applyToBecomeSeller(request.auth!.userId, request.body as CreateSellerApplicationInput));
};

/** ADMIN-only — see the `authorize('ADMIN')` gate in sellers.routes.ts. */
export const listApplications = async (_request: Request, response: Response) => {
  response.json(await listSellerApplications());
};

/** ADMIN-only — approve, reject, start reviewing, or suspend an application. */
export const reviewApplication = async (request: Request, response: Response) => {
  response.json(
    await reviewSellerApplication(
      request.auth!.userId,
      param(request, 'applicationId'),
      request.body as ReviewSellerApplicationInput,
    ),
  );
};

// --------------------------------------------------- merchant dashboard features

export const getCustomersHandler = async (request: Request, response: Response) => {
  const search = request.query.search as string | undefined;
  response.json(await getStoreCustomers(param(request, 'storeId'), request.auth!.userId, search));
};

export const getCustomerDetailHandler = async (request: Request, response: Response) => {
  response.json(
    await getStoreCustomerDetail(
      param(request, 'storeId'),
      request.auth!.userId,
      param(request, 'customerId')
    )
  );
};

export const createPosOrderHandler = async (request: Request, response: Response) => {
  response
    .status(201)
    .json(await createPosOrder(param(request, 'storeId'), request.auth!.userId, request.body));
};

export const getPosOrdersHandler = async (request: Request, response: Response) => {
  response.json(await getPosOrders(param(request, 'storeId'), request.auth!.userId));
};

// --- POS Registers ---
export const listPosRegistersHandler = async (request: Request, response: Response) => {
  response.json(await listPosRegisters(param(request, 'storeId'), request.auth!.userId));
};

export const createPosRegisterHandler = async (request: Request, response: Response) => {
  response
    .status(201)
    .json(await createPosRegister(param(request, 'storeId'), request.auth!.userId, request.body));
};

export const updatePosRegisterHandler = async (request: Request, response: Response) => {
  response.json(
    await updatePosRegister(
      param(request, 'storeId'),
      param(request, 'registerId'),
      request.auth!.userId,
      request.body
    )
  );
};

// --- POS Shifts ---
export const getPosShiftHandler = async (request: Request, response: Response) => {
  response.json(await getPosCurrentShift(param(request, 'storeId'), request.auth!.userId, request.query.registerId as string));
};

export const openPosShiftHandler = async (request: Request, response: Response) => {
  response
    .status(201)
    .json(await openPosShift(param(request, 'storeId'), request.auth!.userId, request.body));
};

export const closePosShiftHandler = async (request: Request, response: Response) => {
  response.json(
    await closePosShift(
      param(request, 'storeId'),
      request.auth!.userId,
      request.body
    )
  );
};

export const recordCashMovementHandler = async (request: Request, response: Response) => {
  response.json(
    await recordPosCashMovement(
      param(request, 'storeId'),
      request.auth!.userId,
      request.body
    )
  );
};

export const listPosShiftsHandler = async (request: Request, response: Response) => {
  const limit = Number(request.query.limit) || 20;
  const page = Number(request.query.page) || 1;
  response.json(await listPosShifts(param(request, 'storeId'), request.auth!.userId, limit, page));
};

// --- POS Returns, Voids & Reports ---
export const createPosRefundHandler = async (request: Request, response: Response) => {
  response
    .status(201)
    .json(
      await createPosRefund(
        param(request, 'storeId'),
        request.auth!.userId,
        param(request, 'orderId'),
        request.body
      )
    );
};

export const voidPosOrderHandler = async (request: Request, response: Response) => {
  response.json(
    await voidPosOrder(
      param(request, 'storeId'),
      request.auth!.userId,
      param(request, 'orderId'),
      request.body.reason
    )
  );
};

export const listPosRefundsHandler = async (request: Request, response: Response) => {
  response.json(await listPosRefunds(param(request, 'storeId'), request.auth!.userId));
};

export const getPosReportsHandler = async (request: Request, response: Response) => {
  response.json(
    await getPosReports(param(request, 'storeId'), request.auth!.userId, {
      startDate: request.query.startDate as string,
      endDate: request.query.endDate as string,
    })
  );
};

export const getPromotionsHandler = async (request: Request, response: Response) => {
  response.json(await getStorePromotions(param(request, 'storeId'), request.auth!.userId));
};

export const createPromotionHandler = async (request: Request, response: Response) => {
  response
    .status(201)
    .json(await createStorePromotion(param(request, 'storeId'), request.auth!.userId, request.body));
};

export const deletePromotionHandler = async (request: Request, response: Response) => {
  response.json(
    await deleteStorePromotion(
      param(request, 'storeId'),
      request.auth!.userId,
      param(request, 'promotionId')
    )
  );
};

export const getSupportCasesHandler = async (request: Request, response: Response) => {
  response.json(await getStoreSupportCases(param(request, 'storeId'), request.auth!.userId));
};

export const createSupportCaseHandler = async (request: Request, response: Response) => {
  response
    .status(201)
    .json(await createStoreSupportCase(param(request, 'storeId'), request.auth!.userId, request.body));
};

export const replySupportCaseHandler = async (request: Request, response: Response) => {
  response.json(
    await replyStoreSupportCase(
      param(request, 'storeId'),
      request.auth!.userId,
      param(request, 'caseId'),
      request.body.text
    )
  );
};

export const getFinanceHandler = async (request: Request, response: Response) => {
  response.json(await getStoreFinance(param(request, 'storeId'), request.auth!.userId));
};

export const getNotificationsHandler = async (request: Request, response: Response) => {
  response.json(await getStoreNotifications(param(request, 'storeId'), request.auth!.userId));
};

export const getAnalyticsHandler = async (request: Request, response: Response) => {
  const period = (request.query.period as any) || '30d';
  response.json(await getStoreAnalytics(param(request, 'storeId'), request.auth!.userId, period));
};

export const generatePosKhqrHandler = async (request: Request, response: Response) => {
  response.json(
    await generatePosKhqr(
      param(request, 'storeId'),
      request.auth!.userId,
      request.body
    )
  );
};

export const checkPosKhqrHandler = async (request: Request, response: Response) => {
  response.json(
    await checkPosKhqr(
      param(request, 'storeId'),
      request.auth!.userId,
      param(request, 'tranId')
    )
  );
};

export const simulatePosKhqrHandler = async (request: Request, response: Response) => {
  response.json(
    await simulatePosKhqrPayment(
      param(request, 'storeId'),
      request.auth!.userId,
      param(request, 'tranId')
    )
  );
};


export const getPosKhqrSettingsHandler = async (request: Request, response: Response) => {
  response.json(await getPosKhqrSettings(param(request, 'storeId'), request.auth!.userId));
};

export const updatePosKhqrSettingsHandler = async (request: Request, response: Response) => {
  response.json(await updatePosKhqrSettings(param(request, 'storeId'), request.auth!.userId, request.body.bakongAccountId ? request.body : null));
};
