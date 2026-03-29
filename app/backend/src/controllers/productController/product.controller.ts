import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import {
  createProduct,
  deleteProductsByIds,
  getProductsList,
  getProductById as getProductByIdService,
  updateProductById,
  updateProductPrices,
  validateCategoriesExist,
} from '../../services/product.service';

const ALLOWED_SORT_FIELDS = new Set(['id', 'name', 'stock', 'created_at', 'is_published', 'price_gross']);

const isValidMoney = (value: unknown): boolean => typeof value === 'number' && Number.isFinite(value) && value >= 0;

const hasValidPricing = (
  pricing: unknown,
): pricing is {
  priceNet: number;
  vatRate: number;
  priceGross: number;
} => {
  if (!pricing || typeof pricing !== 'object') {
    return false;
  }

  const candidate = pricing as {
    priceNet?: unknown;
    vatRate?: unknown;
    priceGross?: unknown;
  };

  return isValidMoney(candidate.priceNet) && isValidMoney(candidate.vatRate) && isValidMoney(candidate.priceGross);
};

const normalizeCategoryIds = (categoryIds: unknown): number[] => {
  if (!Array.isArray(categoryIds)) {
    return [];
  }

  return [...new Set(categoryIds)].map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const search = rawSearch || '';

    const rawSortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'created_at';
    const sortBy = ALLOWED_SORT_FIELDS.has(rawSortBy) ? rawSortBy : 'created_at';

    const rawSortOrder = typeof req.query.sortOrder === 'string' ? req.query.sortOrder.toUpperCase() : 'DESC';

    const sortOrder = rawSortOrder === 'ASC' ? 'ASC' : 'DESC';

    const result = await getProductsList({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Fetch products error:', error);
    return res.status(500).json({ message: 'Failed to fetch products' });
  }
};

export const addProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, stock, categoryIds, primaryCategoryId, isPublished, pricing } = req.body;

    if (name == null || stock == null || categoryIds == null || primaryCategoryId == null || !pricing) {
      return res.status(400).json({
        message: 'Name, stock, categoryIds, primaryCategoryId and pricing are required',
      });
    }

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Valid product name is required' });
    }

    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({ message: 'Valid stock is required' });
    }

    const normalizedCategoryIds = normalizeCategoryIds(categoryIds);
    const normalizedPrimaryCategoryId = Number(primaryCategoryId);

    if (normalizedCategoryIds.length === 0) {
      return res.status(400).json({
        message: 'At least one valid category is required',
      });
    }

    if (!Number.isInteger(normalizedPrimaryCategoryId) || normalizedPrimaryCategoryId <= 0) {
      return res.status(400).json({
        message: 'Valid primaryCategoryId is required',
      });
    }

    if (!normalizedCategoryIds.includes(normalizedPrimaryCategoryId)) {
      return res.status(400).json({
        message: 'Primary category must be included in categoryIds',
      });
    }

    if (!hasValidPricing(pricing)) {
      return res.status(400).json({
        message: 'Valid base pricing is required',
      });
    }

    const categoriesExist = await validateCategoriesExist(normalizedCategoryIds);

    if (!categoriesExist) {
      return res.status(400).json({
        message: 'One or more selected categories do not exist',
      });
    }

    const result = await createProduct({
      name: name.trim(),
      description: typeof description === 'string' ? description : '',
      stock,
      categoryIds: normalizedCategoryIds,
      primaryCategoryId: normalizedPrimaryCategoryId,
      isPublished: Boolean(isPublished),
      pricing: {
        priceNet: pricing.priceNet,
        vatRate: pricing.vatRate,
        priceGross: pricing.priceGross,
      },
    });

    return res.status(201).json({
      message: 'Product added successfully',
      productId: result.productId,
      published: Boolean(isPublished),
    });
  } catch (error) {
    console.error('Add product error:', error);
    return res.status(500).json({ message: 'Failed to add product' });
  }
};

export const updateProductPricing = async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const { pricing } = req.body;

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ message: 'Valid product id is required' });
    }

    if (!hasValidPricing(pricing)) {
      return res.status(400).json({
        message: 'Valid base pricing is required',
      });
    }

    await updateProductPrices({
      productId,
      pricing: {
        priceNet: pricing.priceNet,
        vatRate: pricing.vatRate,
        priceGross: pricing.priceGross,
      },
    });

    return res.status(200).json({
      message: 'Product pricing updated successfully',
    });
  } catch (error) {
    console.error('Update product pricing error:', error);
    return res.status(500).json({ message: 'Failed to update product pricing' });
  }
};

export const deleteProductsBulk = async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body as { ids?: number[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Product ids are required' });
    }

    const normalizedIds = [...new Set(ids)].map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);

    if (normalizedIds.length === 0) {
      return res.status(400).json({ message: 'No valid product ids provided' });
    }

    const result = await deleteProductsByIds(normalizedIds);

    return res.status(200).json({
      message: 'Products deleted successfully',
      deletedCount: result.deletedCount,
      ids: normalizedIds,
    });
  } catch (error) {
    console.error('Bulk delete products error:', error);
    return res.status(500).json({ message: 'Failed to delete products' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ message: 'Valid product id is required' });
    }

    const product = await getProductByIdService(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (error) {
    console.error('Get product by id error:', error);
    return res.status(500).json({ message: 'Failed to fetch product' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const { name, description, stock, categoryIds, primaryCategoryId, isPublished, pricing } = req.body;

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ message: 'Valid product id is required' });
    }

    if (name == null || stock == null || categoryIds == null || primaryCategoryId == null || !pricing) {
      return res.status(400).json({
        message: 'Name, stock, categoryIds, primaryCategoryId and pricing are required',
      });
    }

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Valid product name is required' });
    }

    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({ message: 'Valid stock is required' });
    }

    const normalizedCategoryIds = normalizeCategoryIds(categoryIds);
    const normalizedPrimaryCategoryId = Number(primaryCategoryId);

    if (normalizedCategoryIds.length === 0) {
      return res.status(400).json({
        message: 'At least one valid category is required',
      });
    }

    if (!Number.isInteger(normalizedPrimaryCategoryId) || normalizedPrimaryCategoryId <= 0) {
      return res.status(400).json({
        message: 'Valid primaryCategoryId is required',
      });
    }

    if (!normalizedCategoryIds.includes(normalizedPrimaryCategoryId)) {
      return res.status(400).json({
        message: 'Primary category must be included in categoryIds',
      });
    }

    if (!hasValidPricing(pricing)) {
      return res.status(400).json({
        message: 'Valid base pricing is required',
      });
    }

    const categoriesExist = await validateCategoriesExist(normalizedCategoryIds);

    if (!categoriesExist) {
      return res.status(400).json({
        message: 'One or more selected categories do not exist',
      });
    }

    await updateProductById({
      productId,
      name: name.trim(),
      description: typeof description === 'string' ? description : '',
      stock,
      categoryIds: normalizedCategoryIds,
      primaryCategoryId: normalizedPrimaryCategoryId,
      isPublished: Boolean(isPublished),
      pricing: {
        priceNet: pricing.priceNet,
        vatRate: pricing.vatRate,
        priceGross: pricing.priceGross,
      },
    });

    return res.status(200).json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({ message: 'Failed to update product' });
  }
};
