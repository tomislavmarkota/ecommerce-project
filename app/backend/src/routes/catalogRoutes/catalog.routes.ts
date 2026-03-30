import { Router } from 'express';
import { getCatalogProduct, getCatalogProducts } from '../../controllers/catalogController';
import { optionalAuth } from '../../middleware/auth.middleware';

const router = Router();

router.get('/products', optionalAuth, getCatalogProducts);
router.get('/products/:id', optionalAuth, getCatalogProduct);

export default router;
