import { Router } from 'express';
import { createOrder } from '../controllers/orderController';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();

router.post('/', requireAdmin, createOrder);

export default router;
