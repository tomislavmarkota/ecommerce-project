// src/routes/orderRoutes/order.routes.ts
import { Router } from 'express';
import { createOrder, getOrders } from '../../controllers/orderController';
import { optionalAuth, requireAdmin } from '../../middleware/auth.middleware';

const router = Router();

router.post('/', optionalAuth, createOrder);
router.get('/', requireAdmin, getOrders);

export default router;
