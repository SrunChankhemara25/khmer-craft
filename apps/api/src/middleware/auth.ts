import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Seller from '../../models/Seller';

export interface AuthRequest extends Request {
  seller?: any;
}

export const protectSellerRoute = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
      
      req.seller = await Seller.findById(decoded.id).select('-password');
      
      if (!req.seller) {
        res.status(401).json({ error: 'Not authorized, seller not found' });
        return;
      }
      
      next();
    } catch (error) {
      res.status(401).json({ error: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ error: 'Not authorized, no token' });
  }
};
