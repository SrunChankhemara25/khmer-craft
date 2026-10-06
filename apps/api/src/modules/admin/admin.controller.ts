import { Request, Response } from 'express';
import { param } from '../../utils/request-params';
import {
  BillingStatus,
  getOverview,
  listSellers,
  listSubscriptionPayments,
  setUserStatus,
} from './admin.service';

const BILLING = ['all', 'paying', 'expiring', 'lapsed', 'free'];

const queryString = (value: unknown) => (typeof value === 'string' ? value : undefined);

export const overview = async (_request: Request, response: Response) => {
  response.json(await getOverview());
};

export const sellers = async (request: Request, response: Response) => {
  const billing = queryString(request.query.billing);
  response.json(
    await listSellers({
      billing: billing && BILLING.includes(billing) ? (billing as BillingStatus | 'all') : 'all',
      q: queryString(request.query.q),
      storeIds: queryString(request.query.storeIds)?.split(',').slice(0, 100),
      page: Number(request.query.page) || 1,
      limit: Number(request.query.limit) || 20,
    }),
  );
};

export const subscriptionPayments = async (request: Request, response: Response) => {
  response.json(
    await listSubscriptionPayments({
      status: queryString(request.query.status),
      page: Number(request.query.page) || 1,
      limit: Number(request.query.limit) || 20,
    }),
  );
};

export const userStatus = async (request: Request, response: Response) => {
  response.json(await setUserStatus(request.auth!.userId, param(request, 'userId'), request.body.status));
};
