import { Request, Response } from 'express';
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  getCategoryTree,
  moveCategory,
  updateCategory,
} from '../services/category.service';

export const createCategoryHandler = async (req: Request, res: Response) => {
  try {
    const { name, parentId = null, description, imageUrl, sortOrder = 0, isActive = true } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'Name is required' });
    }

    const category = await createCategory({
      name: name.trim(),
      parentId: parentId === null ? null : Number(parentId),
      description,
      imageUrl,
      sortOrder: Number(sortOrder) || 0,
      isActive: Boolean(isActive),
    });

    return res.status(201).json(category);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Failed to create category' });
  }
};

export const getCategoriesTreeHandler = async (_req: Request, res: Response) => {
  try {
    const tree = await getCategoryTree();
    return res.status(200).json(tree);
  } catch {
    return res.status(500).json({ message: 'Failed to fetch category tree' });
  }
};

export const getCategoryByIdHandler = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const category = await getCategoryById(id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.status(200).json(category);
  } catch {
    return res.status(500).json({ message: 'Failed to fetch category' });
  }
};

export const updateCategoryHandler = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name, description, imageUrl, sortOrder = 0, isActive = true } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'Name is required' });
    }

    const category = await updateCategory({
      id,
      name: name.trim(),
      description,
      imageUrl,
      sortOrder: Number(sortOrder) || 0,
      isActive: Boolean(isActive),
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.status(200).json(category);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Failed to update category' });
  }
};

export const moveCategoryHandler = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { parentId = null } = req.body;

    const category = await moveCategory({
      id,
      newParentId: parentId === null ? null : Number(parentId),
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.status(200).json(category);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Failed to move category' });
  }
};

export const deleteCategoryHandler = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const deleted = await deleteCategory(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Failed to delete category' });
  }
};
