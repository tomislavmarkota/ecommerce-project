import { Router } from 'express';
import { addProduct, deleteProductsBulk, getProducts, updateProductPricing } from '../controllers/product.controller';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();

router.get('/', getProducts);
router.post('/add', requireAdmin, addProduct);
router.patch('/:id/pricing', requireAdmin, updateProductPricing);
router.delete('/bulk', requireAdmin, deleteProductsBulk);

export default router;
