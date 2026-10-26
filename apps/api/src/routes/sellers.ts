import { Router, Request, Response } from 'express';
import SellerApplication from '../../models/SellerApplication';
import Seller from '../../models/Seller';
import Review from '../../models/Review';
import Order from '../../models/Order';
import User from '../../models/User';
import { authenticate } from '../middleware/authenticate';

const router = Router();

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
    const sellers = await Seller.find({}).populate('userId', 'name email status');
    res.json(sellers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sellers' });
  }
});

// GET single seller by ID (public store profile)
router.get('/stores/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const store = await Seller.findById(req.params.id);
    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }
    res.json(store);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch store' });
  }
});


// ==============================
// SELLER ONBOARDING
// ==============================

// GET all stores for the currently authenticated user
router.get('/my-stores', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const stores = await Seller.find({ userId }).sort({ createdAt: -1 });
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your stores' });
  }
});

// GET a specific store dashboard for the authenticated user
router.get('/my-stores/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth!.userId;
    const storeId = req.params.id;
    
    const store = await Seller.findOne({ _id: storeId, userId });
    
    if (!store) {
      res.status(404).json({ error: 'Store not found or you do not have permission to view it' });
      return;
    }
    
    // In the future, we can add aggregated dashboard data here (e.g. orders, revenue)
    res.json(store);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch store details' });
  }
});

// PUT update store profile
router.put('/my-stores/:id/profile', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth!.userId;
    const storeId = req.params.id;
    const { storeName, storeDescription, storeAvatarUrl, storeCoverImages, location, phoneNumber } = req.body;

    const store = await Seller.findOneAndUpdate(
      { _id: storeId, userId },
      { $set: { storeName, storeDescription, storeAvatarUrl, storeCoverImages, location, phoneNumber } },
      { new: true }
    );

    if (!store) {
      res.status(404).json({ error: 'Store not found or you do not have permission to edit it' });
      return;
    }

    res.json({ message: 'Store profile updated successfully', store });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update store profile' });
  }
});

// ==============================
// ORDERS DASHBOARD
// ==============================

// GET orders and metrics for a specific store
router.get('/my-stores/:id/orders', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth!.userId;
    const storeId = req.params.id;

    // Verify ownership
    const store = await Seller.findOne({ _id: storeId, userId });
    if (!store) {
      res.status(404).json({ error: 'Store not found or you do not have permission' });
      return;
    }

    const { search, status, dateRange, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate metrics
    const [pendingCount, transitCount, completed30dCount, revenueResult] = await Promise.all([
      Order.countDocuments({ 'items.sellerId': store._id, orderStatus: 'PENDING' }),
      Order.countDocuments({ 'items.sellerId': store._id, orderStatus: 'SHIPPED' }),
      Order.countDocuments({ 'items.sellerId': store._id, orderStatus: 'DELIVERED', createdAt: { $gte: thirtyDaysAgo } }),
      // Calculate MTD Revenue: SUM(item.subtotal) where order is PAID and in current month
      Order.aggregate([
        { $match: { 'items.sellerId': store._id, paymentStatus: 'PAID', createdAt: { $gte: firstDayOfMonth } } },
        { $unwind: '$items' },
        { $match: { 'items.sellerId': store._id } },
        { $group: { _id: null, totalRevenue: { $sum: '$items.subtotal' } } }
      ])
    ]);

    const revenueMtd = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Build filter for order list
    const filter: any = { 'items.sellerId': store._id };
    
    if (status && status !== 'All Statuses') {
      filter.orderStatus = status;
    }

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      filter.$or = [
        { orderNumber: searchRegex },
        { buyerName: searchRegex }
      ];
    }

    if (dateRange) {
      if (dateRange === 'Last 7 Days') {
        filter.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      } else if (dateRange === 'Last 30 Days') {
        filter.createdAt = { $gte: thirtyDaysAgo };
      } else if (dateRange === 'This Month') {
        filter.createdAt = { $gte: firstDayOfMonth };
      }
    }

    // Fetch paginated orders
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const totalOrders = await Order.countDocuments(filter);

    // Format orders to only include my items and my total
    const formattedOrders = orders.map((order) => {
      const myItems = order.items.filter((item) => String(item.sellerId) === String(store._id));
      const myTotal = myItems.reduce((sum, item) => sum + item.subtotal, 0);
      
      return {
        id: order._id,
        orderNumber: order.orderNumber,
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        deliveryInfo: order.deliveryInfo,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        myItems,
        myTotal
      };
    });

    res.json({
      metrics: {
        pendingOrders: pendingCount,
        inTransit: transitCount,
        completed30d: completed30dCount,
        revenueMtd
      },
      orders: formattedOrders,
      pagination: {
        total: totalOrders,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalOrders / limitNum)
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders dashboard' });
  }
});

// ==============================
// REVIEWS
// ==============================

// GET reviews and stats for a specific store
router.get('/my-stores/:id/reviews', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.auth!.userId;
    const storeId = req.params.id;

    // Verify ownership
    const store = await Seller.findOne({ _id: storeId, userId });
    if (!store) {
      res.status(404).json({ error: 'Store not found or you do not have permission' });
      return;
    }

    const { rating, sort } = req.query;
    
    // Aggregation for stats
    const stats = await Review.aggregate([
      { $match: { sellerId: store._id } },
      { $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          stars5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          stars4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          stars3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          stars2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          stars1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
      }}
    ]);

    // Query for paginated list
    const filter: any = { sellerId: store._id };
    if (rating) filter.rating = Number(rating);
    
    let sortOptions: any = { createdAt: -1 };
    if (sort === 'oldest') sortOptions = { createdAt: 1 };

    const reviews = await Review.find(filter).sort(sortOptions).limit(50);

    const statsResult = stats.length > 0 ? stats[0] : {
      averageRating: 0, totalReviews: 0, stars5: 0, stars4: 0, stars3: 0, stars2: 0, stars1: 0
    };

    res.json({
      stats: statsResult,
      reviews
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST reply to a review
router.post('/my-stores/:id/reviews/:reviewId/reply', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: storeId, reviewId } = req.params;
    const userId = req.auth!.userId;
    const { response } = req.body;

    // Verify ownership
    const store = await Seller.findOne({ _id: storeId, userId });
    if (!store) {
      res.status(404).json({ error: 'Store not found or you do not have permission' });
      return;
    }

    const review = await Review.findOneAndUpdate(
      { _id: reviewId, sellerId: store._id },
      { $set: { sellerResponse: response } },
      { new: true }
    );

    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    res.json({ message: 'Reply saved successfully', review });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reply to review' });
  }
});

// POST flag a review
router.post('/my-stores/:id/reviews/:reviewId/flag', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: storeId, reviewId } = req.params;
    const userId = req.auth!.userId;

    // Verify ownership
    const store = await Seller.findOne({ _id: storeId, userId });
    if (!store) {
      res.status(404).json({ error: 'Store not found or you do not have permission' });
      return;
    }

    const review = await Review.findOneAndUpdate(
      { _id: reviewId, sellerId: store._id },
      { $set: { isFlagged: true } },
      { new: true }
    );

    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    res.json({ message: 'Review flagged for moderation', review });
  } catch (error) {
    res.status(500).json({ error: 'Failed to flag review' });
  }
});

// POST onboard a logged-in user to become a seller
router.post('/onboard', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeName, storeDescription, subscriptionPlan, paymentMethod } = req.body;
    const userId = req.auth!.userId;

    // Create the Seller store profile
    const seller = await Seller.create({
      userId,
      storeName,
      storeDescription,
      subscriptionPlan,
      paymentMethod,
      onboardingStatus: 'COMPLETED'
    });

    // Update the user's role to SELLER
    const user = req.auth!.user;
    if (user.role !== 'SELLER') {
      user.role = 'SELLER';
      // Saving user to update their role in DB
      await user.save();
    }

    res.status(201).json({
      message: 'Seller onboarded successfully',
      store: seller
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to onboard seller' });
  }
});

export default router;
