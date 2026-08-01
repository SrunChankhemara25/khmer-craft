import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { create, detail, listMine } from './orders.controller';
import { createOrderSchema } from './orders.validation';

const router = Router();

router.use(authenticate);

router.post('/', validate(createOrderSchema), create);

// Must precede '/:id', otherwise 'my-orders' is read as an order id.
router.get('/my-orders', listMine);
router.get('/:id', detail);

export default router;
