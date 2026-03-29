import { Request, Response } from 'express';
import { getCatalogProductWithPricing, getCatalogProductsList } from '../services/product-pricing.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const getCatalogProducts = async (req: Request | AuthRequest, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 48);

    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const search = rawSearch || '';

    const rawCategoryId = req.query.categoryId;
    const categoryId = rawCategoryId != null && rawCategoryId !== '' ? Number(rawCategoryId) : null;

    if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
      return res.status(400).json({ message: 'Invalid categoryId' });
    }

    const authReq = req as AuthRequest;

    const userId = authReq.user?.id || authReq.user?.user?.id || null;

    const result = await getCatalogProductsList({
      page,
      limit,
      search,
      categoryId,
      userId,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('Get catalog products error:', err);
    return res.status(500).json({ message: 'Failed to fetch products' });
  }
};

export const getCatalogProduct = async (req: Request | AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ message: 'Invalid product id' });
    }

    const authReq = req as AuthRequest;
    const product = await getCatalogProductWithPricing(productId, authReq.user?.id ?? null);

    if (!product || !product.isPublished) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (err) {
    console.error('Get catalog product error:', err);
    return res.status(500).json({ message: 'Failed to fetch product' });
  }
};
