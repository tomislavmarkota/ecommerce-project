// src/routes/checkoutRoutes/checkout.routes.ts
import { Router } from 'express';
import { getCheckoutPreview } from '../../controllers/checkoutController';
import { optionalAuth } from '../../middleware/auth.middleware';

const router = Router();

router.post('/preview', optionalAuth, getCheckoutPreview);

export default router;
