import { Router } from 'express';
import {
  addProduct,
  deleteProductsBulk,
  getProductById,
  getProducts,
  updateProduct,
  updateProductPricing,
} from '../../controllers/productController/product.controller';
import { requireAdmin } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', getProducts);
router.post('/add', requireAdmin, addProduct);
router.patch('/:id/pricing', requireAdmin, updateProductPricing);
router.get('/:id', requireAdmin, getProductById);
router.delete('/bulk', requireAdmin, deleteProductsBulk);
router.put('/:id', requireAdmin, updateProduct);

export default router;
