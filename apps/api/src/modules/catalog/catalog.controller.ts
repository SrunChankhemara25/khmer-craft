import { Request, Response } from 'express';
import Seller from '../../../models/Seller';
import { AppError } from '../../errors/app-error';
import { param } from '../../utils/request-params';
import {
  archiveProduct,
  createProduct,
  getProductDetail,
  listProducts,
  listSellerProducts,
  updateProduct,
  deleteProduct,

} from './catalog.service';
import {
  CreateProductInput,
  UpdateProductInput,
  listProductsQuerySchema,
  updateProductSchema
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

/** A seller's own listings — drafts and archived included. */
export const listMine = async (request: Request, response: Response) => {
  const page = Number(request.query.page ?? 1);
  const limit = Math.min(Number(request.query.limit ?? 20), 100);

  response.json(
    await listSellerProducts(
      request.auth!.userId,
      Number.isFinite(page) && page > 0 ? page : 1,
      Number.isFinite(limit) && limit > 0 ? limit : 20,
    ),
  );
};

/** Delist. The product is archived, not removed — see the service for why. */
export const remove = async (request: Request, response: Response) => {
  response.json(
    await archiveProduct(request.auth!.user, param(request, 'id')),
  );
};

export const create = async (request: Request, response: Response) => {
  const input = request.body as CreateProductInput;
  
  if (request.auth?.userId) {
    const seller = await Seller.findOne({ userId: request.auth.userId });
    if (seller) {
      input.sellerId = String(seller._id);
      if (!input.storeName) input.storeName = seller.storeName;
    }
  }

  response.status(201).json(await createProduct(request.auth!.user, input));
};

export const update = async (request: Request, response: Response) => {
  const input = request.body as UpdateProductInput;
  const id = param(request, 'id');
  
  response.json(await updateProduct(request.auth!.user, id, input));
};

export const hardRemove = async (request: Request, response: Response) => {
  const id = param(request, 'id');
  const userId = request.auth?.userId;
  
  await deleteProduct(id, userId);
  response.status(204).send();
};
