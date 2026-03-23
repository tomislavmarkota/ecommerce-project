import { Router } from 'express';
import { createOrder, getOrders } from '../../controllers/orderController';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();

router.post('/', createOrder);
router.get('/', requireAdmin, getOrders);
export default router;
