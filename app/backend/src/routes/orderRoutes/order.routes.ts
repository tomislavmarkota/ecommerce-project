import { Router } from 'express';
import { createOrder, getOrderById, getOrders } from '../../controllers/orderController';
import { optionalAuth, requireAdmin } from '../../middleware/auth.middleware';

const router = Router();

router.post('/', optionalAuth, createOrder);
router.get('/', requireAdmin, getOrders);
router.get('/:id', requireAdmin, getOrderById);

export default router;
