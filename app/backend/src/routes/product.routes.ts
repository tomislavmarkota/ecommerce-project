import { Router } from 'express';
import { getProducts, addProduct } from '../controllers/product.controller';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();

// Public: fetch all products
router.get('/', requireAdmin, getProducts);

// Admin only: add product
// router.post('/add-product', requireAdmin, addProduct);
router.post('/add-product', addProduct);

export default router;
