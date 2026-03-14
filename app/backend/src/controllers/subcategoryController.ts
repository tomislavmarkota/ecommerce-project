import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/db';

/**
 * Create a new subcategory
 */
export const createSubcategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { categoryId, name } = req.body;

    if (!categoryId || !name) {
      return res.status(400).json({ message: 'category_id and name are required' });
    }

    // Check if category exists
    const [categoryRows] = await pool.execute<RowDataPacket[]>('SELECT id FROM categories WHERE id = ?', [categoryId]);
    if (categoryRows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check duplicate name within same category
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM subcategories WHERE category_id = ? AND LOWER(name) = LOWER(?)',
      [categoryId, name],
    );
    if (existingRows.length > 0) {
      return res.status(409).json({ message: 'Subcategory name already exists in this category' });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO subcategories (category_id, name) VALUES (?, ?)',
      [categoryId, name],
    );

    return res.status(201).json({
      id: result.insertId,
      categoryId,
      name,
    });
  } catch (err: any) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Subcategory already exists' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all subcategories
 */
export const getSubcategories = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.id, s.name, s.category_id, c.name AS category_name
       FROM subcategories s
       JOIN categories c ON s.category_id = c.id
       ORDER BY c.name, s.name`,
    );

    return res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get single subcategory by ID
 */
export const getSubcategoryById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.id, s.name, s.category_id, c.name AS category_name
       FROM subcategories s
       JOIN categories c ON s.category_id = c.id
       WHERE s.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update a subcategory
 */
export const updateSubcategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { categoryId, name } = req.body;

    if (!categoryId || !name) {
      return res.status(400).json({ message: 'category_id and name are required' });
    }

    // Ensure subcategory exists
    const [existingSubcat] = await pool.execute<RowDataPacket[]>('SELECT id FROM subcategories WHERE id = ?', [id]);
    if (existingSubcat.length === 0) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    // Ensure no duplicate in same category
    const [duplicate] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM subcategories WHERE category_id = ? AND LOWER(name) = LOWER(?) AND id != ?',
      [categoryId, name, id],
    );
    if (duplicate.length > 0) {
      return res.status(409).json({ message: 'Subcategory name already exists in this category' });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE subcategories SET category_id = ?, name = ? WHERE id = ?',
      [categoryId, name, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    return res.status(200).json({ id, categoryId, name });
  } catch (err: any) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Subcategory already exists' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a subcategory
 */
export const deleteSubcategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM subcategories WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    return res.status(200).json({ message: 'Subcategory deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
