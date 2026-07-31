import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Product from '../../models/Product';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';

const router = Router();

const createProductSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    price: z.number().positive().max(1_000_000),
    category: z.string().trim().min(2).max(80),
    image: z.string().trim().url().max(2048),
  })
  .strict();

// GET all products
router.get('/', async (_req: Request, res: Response) => {
  // Express 5 forwards rejected promises to the error handler, so the manual
  // try/catch that used to swallow these into a bare 500 is unnecessary.
  const products = await Product.find({}).sort({ createdAt: -1 });
  res.json(products);
});

// POST a new product
router.post(
  '/',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  validate(createProductSchema),
  async (req: Request, res: Response) => {
    const input = req.body as z.infer<typeof createProductSchema>;

    // Fields are listed explicitly instead of passing req.body straight
    // through. Handing the raw body to Mongoose lets a caller set any field
    // the schema defines — including ones added later, such as an ownership
    // or approval flag.
    const product = await Product.create({
      title: input.title,
      price: input.price,
      category: input.category,
      image: input.image,
    });

    res.status(201).json(product);
  },
);

export default router;
