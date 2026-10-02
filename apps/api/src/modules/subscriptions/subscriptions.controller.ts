import { Request, Response } from 'express';
import * as subscriptionsService from './subscriptions.service';
import { param } from '../../utils/request-params';
import { CreatePlanCheckoutInput } from './subscriptions.validation';

export const createPlanCheckout = async (
  request: Request,
  response: Response,
) => {
  const { storeId, plan } = request.body as CreatePlanCheckoutInput;
  const checkout = await subscriptionsService.createPlanCheckout(
    request.auth!.user,
    storeId,
    plan,
  );
  response.json(checkout);
};

/**
 * Polled by the plan payment page. Reads as a GET, but is not free: it asks
 * ABA for the transaction's real status and may activate the plan.
 */
export const planPaymentStatus = async (
  request: Request,
  response: Response,
) => {
  const status = await subscriptionsService.getPlanPaymentStatus(
    request.auth!.user,
    param(request, 'paymentId'),
  );
  response.json(status);
};

export const subscription = async (request: Request, response: Response) => {
  response.json(
    await subscriptionsService.getSubscription(
      request.auth!.user,
      param(request, 'storeId'),
    ),
  );
};

export const payments = async (request: Request, response: Response) => {
  response.json(
    await subscriptionsService.listPayments(
      request.auth!.user,
      param(request, 'storeId'),
    ),
  );
};
