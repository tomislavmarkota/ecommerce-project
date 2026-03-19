import { Router } from 'express';
import { getCatalogProduct, getCatalogProducts } from '../controllers/catalogController';

const router = Router();

router.get('/products', getCatalogProducts);
router.get('/products/:id', getCatalogProduct);

export default router;
