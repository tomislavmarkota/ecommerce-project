import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/admin.middleware';
import {
  createProduct,
  deleteProductsByIds,
  getProductsList,
  validateSubcategoryBelongsToCategory,
} from '../services/product.service';

const ALLOWED_SORT_FIELDS = new Set(['id', 'name', 'price', 'stock', 'created_at', 'is_published']);

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
    const { name, description, price, stock, categoryId, subcategoryId, images, isPublished } = req.body;

    if (name == null || price == null || stock == null || categoryId == null) {
      return res.status(400).json({
        message: 'Name, price, stock, and categoryId are required',
      });
    }

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Valid product name is required' });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ message: 'Valid price is required' });
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

    if (images && !Array.isArray(images)) {
      return res.status(400).json({ message: 'Images must be an array of URLs' });
    }

    if (Array.isArray(images)) {
      const invalidImage = images.some((url) => typeof url !== 'string' || !url.trim());

      if (invalidImage) {
        return res.status(400).json({
          message: 'All images must be valid non-empty URLs',
        });
      }
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
      price,
      stock,
      categoryId: normalizedCategoryId,
      subcategoryId: normalizedSubcategoryId,
      images: Array.isArray(images) ? images : [],
      isPublished: Boolean(isPublished),
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
