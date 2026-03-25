import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/admin.middleware';
import {
  createProduct,
  deleteProductsByIds,
  getProductsList,
  updateProductPrices,
  getProductById as getProductByIdService,
  validateSubcategoryBelongsToCategory,
  updateProductById,
} from '../../services/product.service';

const ALLOWED_SORT_FIELDS = new Set(['id', 'name', 'stock', 'created_at', 'is_published']);

const isValidMoney = (value: unknown): boolean => typeof value === 'number' && Number.isFinite(value) && value >= 0;

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
  } catch (err) {
    console.error('Fetch products error:', err);
    return res.status(500).json({ message: 'Failed to fetch products' });
  }
};

export const addProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, stock, categoryId, subcategoryId, isPublished, pricing } = req.body;

    if (name == null || stock == null || categoryId == null || !pricing) {
      return res.status(400).json({
        message: 'Name, stock, categoryId and pricing are required',
      });
    }

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Valid product name is required' });
    }

    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({ message: 'Valid stock is required' });
    }

    if (!Number.isInteger(Number(categoryId)) || Number(categoryId) <= 0) {
      return res.status(400).json({ message: 'Valid categoryId is required' });
    }

    if (
      subcategoryId != null &&
      subcategoryId !== '' &&
      (!Number.isInteger(Number(subcategoryId)) || Number(subcategoryId) <= 0)
    ) {
      return res.status(400).json({ message: 'Valid subcategoryId is required' });
    }

    if (
      !pricing?.retail ||
      !pricing?.business ||
      !isValidMoney(pricing.retail.priceNet) ||
      !isValidMoney(pricing.retail.priceGross) ||
      !isValidMoney(pricing.retail.vatRate) ||
      !isValidMoney(pricing.business.priceNet) ||
      !isValidMoney(pricing.business.priceGross) ||
      !isValidMoney(pricing.business.vatRate)
    ) {
      return res.status(400).json({
        message: 'Valid retail and business pricing is required',
      });
    }

    const normalizedCategoryId = Number(categoryId);
    const normalizedSubcategoryId = subcategoryId != null && subcategoryId !== '' ? Number(subcategoryId) : null;

    if (normalizedSubcategoryId) {
      const isValidSubcategory = await validateSubcategoryBelongsToCategory(
        normalizedCategoryId,
        normalizedSubcategoryId,
      );

      if (!isValidSubcategory) {
        return res.status(400).json({
          message: 'Selected subcategory does not belong to selected category',
        });
      }
    }

    const result = await createProduct({
      name: name.trim(),
      description: typeof description === 'string' ? description : '',
      stock,
      categoryId: normalizedCategoryId,
      subcategoryId: normalizedSubcategoryId,
      isPublished: Boolean(isPublished),
      pricing: {
        retail: {
          priceNet: pricing.retail.priceNet,
          vatRate: pricing.retail.vatRate,
          priceGross: pricing.retail.priceGross,
        },
        business: {
          priceNet: pricing.business.priceNet,
          vatRate: pricing.business.vatRate,
          priceGross: pricing.business.priceGross,
        },
      },
    });

    return res.status(201).json({
      message: 'Product added successfully',
      productId: result.productId,
      published: Boolean(isPublished),
    });
  } catch (err) {
    console.error('Add product error:', err);
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

    if (
      !pricing?.retail ||
      !pricing?.business ||
      !isValidMoney(pricing.retail.priceNet) ||
      !isValidMoney(pricing.retail.priceGross) ||
      !isValidMoney(pricing.retail.vatRate) ||
      !isValidMoney(pricing.business.priceNet) ||
      !isValidMoney(pricing.business.priceGross) ||
      !isValidMoney(pricing.business.vatRate)
    ) {
      return res.status(400).json({
        message: 'Valid retail and business pricing is required',
      });
    }

    await updateProductPrices({
      productId,
      pricing: {
        retail: {
          priceNet: pricing.retail.priceNet,
          vatRate: pricing.retail.vatRate,
          priceGross: pricing.retail.priceGross,
        },
        business: {
          priceNet: pricing.business.priceNet,
          vatRate: pricing.business.vatRate,
          priceGross: pricing.business.priceGross,
        },
      },
    });

    return res.status(200).json({
      message: 'Product pricing updated successfully',
    });
  } catch (err) {
    console.error('Update product pricing error:', err);
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
  } catch (err) {
    console.error('Bulk delete products error:', err);
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
  } catch (err) {
    console.error('Get product by id error:', err);
    return res.status(500).json({ message: 'Failed to fetch product' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const { name, description, stock, categoryId, subcategoryId, isPublished, pricing } = req.body;

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ message: 'Valid product id is required' });
    }

    if (name == null || stock == null || categoryId == null || !pricing) {
      return res.status(400).json({
        message: 'Name, stock, categoryId and pricing are required',
      });
    }

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Valid product name is required' });
    }

    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({ message: 'Valid stock is required' });
    }

    if (!Number.isInteger(Number(categoryId)) || Number(categoryId) <= 0) {
      return res.status(400).json({ message: 'Valid categoryId is required' });
    }

    if (
      subcategoryId != null &&
      subcategoryId !== '' &&
      (!Number.isInteger(Number(subcategoryId)) || Number(subcategoryId) <= 0)
    ) {
      return res.status(400).json({ message: 'Valid subcategoryId is required' });
    }

    if (
      !pricing?.retail ||
      !pricing?.business ||
      !isValidMoney(pricing.retail.priceNet) ||
      !isValidMoney(pricing.retail.priceGross) ||
      !isValidMoney(pricing.retail.vatRate) ||
      !isValidMoney(pricing.business.priceNet) ||
      !isValidMoney(pricing.business.priceGross) ||
      !isValidMoney(pricing.business.vatRate)
    ) {
      return res.status(400).json({
        message: 'Valid retail and business pricing is required',
      });
    }

    const normalizedCategoryId = Number(categoryId);
    const normalizedSubcategoryId = subcategoryId != null && subcategoryId !== '' ? Number(subcategoryId) : null;

    if (normalizedSubcategoryId) {
      const isValidSubcategory = await validateSubcategoryBelongsToCategory(
        normalizedCategoryId,
        normalizedSubcategoryId,
      );

      if (!isValidSubcategory) {
        return res.status(400).json({
          message: 'Selected subcategory does not belong to selected category',
        });
      }
    }

    await updateProductById({
      productId,
      name: name.trim(),
      description: typeof description === 'string' ? description : '',
      stock,
      categoryId: normalizedCategoryId,
      subcategoryId: normalizedSubcategoryId,
      isPublished: Boolean(isPublished),
      pricing: {
        retail: {
          priceNet: pricing.retail.priceNet,
          vatRate: pricing.retail.vatRate,
          priceGross: pricing.retail.priceGross,
        },
        business: {
          priceNet: pricing.business.priceNet,
          vatRate: pricing.business.vatRate,
          priceGross: pricing.business.priceGross,
        },
      },
    });

    return res.status(200).json({
      message: 'Product updated successfully',
    });
  } catch (err) {
    console.error('Update product error:', err);
    return res.status(500).json({ message: 'Failed to update product' });
  }
};
