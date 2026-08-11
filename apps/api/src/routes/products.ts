import { Router, Request, Response } from 'express';
import Product from '../../models/Product';
// Import Seller model so mongoose knows about it for populate
import '../../models/Seller';
import { protectSellerRoute, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all products
router.get('/', async (req: Request, res: Response) => {
  try {
    const products = await Product.find({})
      .populate('sellerId', 'name storeName storeAvatarUrl')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST a new product (PROTECTED - ONLY LOGGED IN SELLERS)
router.post('/', protectSellerRoute, async (req: AuthRequest, res: Response) => {
  try {
    // Automatically assign the logged-in seller's ID to the product
    const productData = {
      ...req.body,
      sellerId: req.seller._id
    };
    const product = await Product.create(productData);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

export default router;
