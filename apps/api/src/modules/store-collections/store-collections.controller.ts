import { Request, Response } from 'express';
import { param } from '../../utils/request-params';
import * as service from './store-collections.service';
import {
  CreateStoreCollectionInput,
  UpdateStoreCollectionInput,
} from './store-collections.validation';

export const listPublic = async (request: Request, response: Response) => {
  const collections = await service.listPublic(param(request, 'storeId'));
  response.json({ collections });
};

export const getPublic = async (request: Request, response: Response) => {
  const collection = await service.getPublic(
    param(request, 'storeId'),
    param(request, 'collectionId')
  );
  response.json(collection);
};

export const listOwner = async (request: Request, response: Response) => {
  const collections = await service.listOwner(
    param(request, 'storeId'),
    request.auth!.userId
  );
  response.json({ collections });
};

export const create = async (request: Request, response: Response) => {
  const collection = await service.create(
    param(request, 'storeId'),
    request.auth!.userId,
    request.body as CreateStoreCollectionInput
  );
  response.status(201).json(collection);
};

export const update = async (request: Request, response: Response) => {
  const collection = await service.update(
    param(request, 'storeId'),
    param(request, 'collectionId'),
    request.auth!.userId,
    request.body as UpdateStoreCollectionInput
  );
  response.json(collection);
};

export const remove = async (request: Request, response: Response) => {
  const result = await service.remove(
    param(request, 'storeId'),
    param(request, 'collectionId'),
    request.auth!.userId
  );
  response.json(result);
};
