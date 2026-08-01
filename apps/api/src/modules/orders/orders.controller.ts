import { Request, Response } from 'express';
import { AppError } from '../../errors/app-error';
import { param } from '../../utils/request-params';
import * as ordersService from './orders.service';
import { CreateOrderInput, listOrdersQuerySchema } from './orders.validation';

export const create = async (request: Request, response: Response) => {
  const order = await ordersService.createOrder(
    request.auth!.user,
    request.body as CreateOrderInput,
  );

  response.status(201).json({
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    message: 'Order placed successfully.',
    order,
  });
};

export const listMine = async (request: Request, response: Response) => {
  const parsed = listOrdersQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    throw new AppError(422, 'Invalid pagination', 'VALIDATION_ERROR');
  }

  response.json(
    await ordersService.listMyOrders(
      request.auth!.userId,
      parsed.data.page,
      parsed.data.limit,
    ),
  );
};

export const detail = async (request: Request, response: Response) => {
  response.json(
    await ordersService.getOrder(request.auth!.userId, param(request, 'id')),
  );
};
