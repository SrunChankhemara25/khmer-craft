import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  listActiveSlides,
  listCampaigns,
  createCampaign,
  updateCampaign,
  applySlide,
  listSellerSlides,
  paySlide,
  updateSlide,
  submitDraftSlide,
  deleteSlide,
  listAdminSlides,
  reviewSlide,
  createHouseSlide,
  adminUpdateSlide,
  setSlideStatus,
  adminDeleteSlide,
  reorderSlides,
} from './promotions.service';
import {
  createHouseSlideSchema,
  reorderSlidesSchema,
  reviewSlideSchema,
  setSlideStatusSchema,
  updateSlideSchema,
} from './promotions.validation';

const router = Router();

// ------------------------------------------------------------------ Public
router.get('/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listActiveSlides(req.query.placement === 'HERO' ? 'HERO' : 'BRAND_ADS'));
  } catch (err) {
    next(err);
  }
});

router.get('/campaigns', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listCampaigns());
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ Seller
router.post('/slides/apply', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slide = await applySlide(req.auth!.userId, req.body);
    res.status(201).json(slide);
  } catch (err) {
    next(err);
  }
});

router.get('/slides/my', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listSellerSlides(req.auth!.userId));
  } catch (err) {
    next(err);
  }
});

router.patch('/slides/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await updateSlide(req.auth!.userId, req.params.id as string, req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/slides/:id/submit', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await submitDraftSlide(req.auth!.userId, req.params.id as string));
  } catch (err) {
    next(err);
  }
});

router.delete('/slides/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await deleteSlide(req.auth!.userId, req.params.id as string));
  } catch (err) {
    next(err);
  }
});

router.post('/slides/:id/pay', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await paySlide(req.auth!.userId, req.params.id as string));
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ Admin
router.post(
  '/campaigns',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await createCampaign(req.body));
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/campaigns/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await updateCampaign(req.params.id as string, req.body));
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/admin/slides',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await listAdminSlides(req.query.status as string, req.query.placement as string));
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/admin/slides/:id/review',
  authenticate,
  authorize('ADMIN'),
  validate(reviewSlideSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, rejectionReason } = req.body;
      res.json(await reviewSlide(req.params.id as string, status, rejectionReason));
    } catch (err) {
      next(err);
    }
  }
);

// Literal path before '/admin/slides/:id' so "reorder" is never read as an id.
router.put(
  '/admin/slides/reorder',
  authenticate,
  authorize('ADMIN'),
  validate(reorderSlidesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await reorderSlides(req.body.placement, req.body.ids));
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/admin/slides',
  authenticate,
  authorize('ADMIN'),
  validate(createHouseSlideSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await createHouseSlide(req.body));
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/admin/slides/:id',
  authenticate,
  authorize('ADMIN'),
  validate(updateSlideSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await adminUpdateSlide(req.params.id as string, req.body));
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/admin/slides/:id/status',
  authenticate,
  authorize('ADMIN'),
  validate(setSlideStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await setSlideStatus(req.params.id as string, req.body.status));
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/admin/slides/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await adminDeleteSlide(req.params.id as string));
    } catch (err) {
      next(err);
    }
  }
);

export default router;
