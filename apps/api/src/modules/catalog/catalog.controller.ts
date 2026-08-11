import { Request, Response } from 'express';
import { AppError } from '../../errors/app-error';
import { param } from '../../utils/request-params';
import {
  createProduct,
  getProductDetail,
  listProducts,
} from './catalog.service';
import {
  createProductSchema,
  listProductsQuerySchema,
} from './catalog.validation';

export const list = async (request: Request, response: Response) => {
  const parsed = listProductsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    throw new AppError(
      422,
      'Invalid product filters',
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors,
    );
  }

  response.json(await listProducts(parsed.data));
};

export const detail = async (request: Request, response: Response) => {
  response.json(await getProductDetail(param(request, 'id')));
};

export const create = async (request: Request, response: Response) => {
  const input = request.body as ReturnType<typeof createProductSchema.parse>;
  response.status(201).json(await createProduct(input));
};
