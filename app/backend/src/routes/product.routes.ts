import { Router } from 'express';
import { getProducts, addProduct, deleteProductsBulk } from '../controllers/product.controller';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();

// Public: fetch all products
router.get('/', getProducts);

// Admin only: add product
// router.post('/add-product', requireAdmin, addProduct);
router.post('/add-product', requireAdmin, addProduct);
router.delete('/bulk', requireAdmin, deleteProductsBulk);

export default router;
