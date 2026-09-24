import { Request, Response } from 'express';
import {
  createWarehouse,
  deleteWarehouse,
  listWarehouses,
  updateWarehouse,
} from './warehouses.service';
import { CreateWarehouseInput, UpdateWarehouseInput } from './warehouses.validation';

const param = (request: Request, name: string) => String(request.params[name] ?? '');

export const list = async (request: Request, response: Response) => {
  response.json(await listWarehouses(param(request, 'storeId'), request.auth!.userId));
};

export const create = async (request: Request, response: Response) => {
  response
    .status(201)
    .json(
      await createWarehouse(
        param(request, 'storeId'),
        request.auth!.userId,
        request.body as CreateWarehouseInput,
      ),
    );
};

export const update = async (request: Request, response: Response) => {
  response.json(
    await updateWarehouse(
      param(request, 'storeId'),
      request.auth!.userId,
      param(request, 'warehouseId'),
      request.body as UpdateWarehouseInput,
    ),
  );
};

export const remove = async (request: Request, response: Response) => {
  response.json(
    await deleteWarehouse(
      param(request, 'storeId'),
      request.auth!.userId,
      param(request, 'warehouseId'),
    ),
  );
};
