import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { create, list, remove, update } from './warehouses.controller';
import { createWarehouseSchema, updateWarehouseSchema } from './warehouses.validation';

/**
 * Stock locations. Owner-only throughout — there is no public view of where a
 * seller keeps their things, and nothing here is exposed to buyers.
 */
const router = Router();

router.use(authenticate, authorize('SELLER', 'ADMIN'));

router.get('/my-stores/:storeId', list);
router.post('/my-stores/:storeId', validate(createWarehouseSchema), create);
router.patch('/my-stores/:storeId/:warehouseId', validate(updateWarehouseSchema), update);
router.delete('/my-stores/:storeId/:warehouseId', remove);

export default router;
