import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/db'; // adjust import path as needed

/**
 * Create a new category
 */
export const createCategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    // Check for duplicate (case-insensitive)
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER(?)',
      [name],
    );

    if (existingRows.length > 0) {
      return res.status(409).json({ message: 'Category name already exists' });
    }

    const [result] = await pool.execute<ResultSetHeader>('INSERT INTO categories (name) VALUES (?)', [name]);

    return res.status(201).json({ id: result.insertId, name });
  } catch (err: any) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Category already exists' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all categories
 */
export const getCategories = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id, name FROM categories ORDER BY name ASC');

    return res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get category by ID (with subcategories)
 */
export const getCategoryById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const [categoryRows] = await pool.execute<RowDataPacket[]>('SELECT id, name FROM categories WHERE id = ?', [id]);

    if (categoryRows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const [subcategories] = await pool.execute<RowDataPacket[]>(
      'SELECT id, name FROM subcategories WHERE category_id = ? ORDER BY name ASC',
      [id],
    );

    return res.status(200).json({
      ...categoryRows[0],
      subcategories,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update a category
 */
export const updateCategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    // Check if category exists
    const [existingCategory] = await pool.execute<RowDataPacket[]>('SELECT id FROM categories WHERE id = ?', [id]);
    if (existingCategory.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Prevent duplicate names (case-insensitive)
    const [duplicateRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?',
      [name, id],
    );
    if (duplicateRows.length > 0) {
      return res.status(409).json({ message: 'Category name already exists' });
    }

    const [result] = await pool.execute<ResultSetHeader>('UPDATE categories SET name = ? WHERE id = ?', [name, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.status(200).json({ id, name });
  } catch (err: any) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Category already exists' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a category
 */
export const deleteCategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    // Optional: check if category has subcategories before deletion
    const [subcategories] = await pool.execute<RowDataPacket[]>('SELECT id FROM subcategories WHERE category_id = ?', [
      id,
    ]);

    if (subcategories.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete category that has subcategories',
      });
    }

    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM categories WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.status(200).json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
