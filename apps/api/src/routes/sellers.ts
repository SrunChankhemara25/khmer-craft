import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import SellerApplication from '../../models/SellerApplication';
import Seller from '../../models/Seller';

const router = Router();

// Helper to generate JWT token
const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

// ==============================
// SELLER APPLICATIONS
// ==============================

// GET all applications
router.get('/apply', async (req: Request, res: Response) => {
  try {
    const applications = await SellerApplication.find({}).sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch seller applications' });
  }
});

// POST new application
router.post('/apply', async (req: Request, res: Response) => {
  try {
    const application = await SellerApplication.create(req.body);
    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit seller application' });
  }
});

// ==============================
// APPROVED SELLERS / STORES
// ==============================

// GET all sellers (for popular stores list)
router.get('/stores', async (req: Request, res: Response) => {
  try {
    const sellers = await Seller.find({}).select('-password');
    res.json(sellers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sellers' });
  }
});

// POST register a new approved seller
router.post('/register', async (req: Request, res: Response) => {
  try {
    const seller = await Seller.create(req.body);
    res.status(201).json({
      _id: seller._id,
      name: seller.name,
      email: seller.email,
      storeName: seller.storeName,
      token: generateToken(seller._id as string),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register seller' });
  }
});

// POST login a seller
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    // Find seller by email
    const seller = await Seller.findOne({ email });
    
    if (seller && (await seller.comparePassword(password))) {
      res.json({
        _id: seller._id,
        name: seller.name,
        email: seller.email,
        storeName: seller.storeName,
        token: generateToken(seller._id as string),
      });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to log in seller' });
  }
});

export default router;
