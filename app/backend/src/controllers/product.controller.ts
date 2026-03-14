import { Request, Response } from 'express';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/admin.middleware';
import { ResultSetHeader } from 'mysql2/promise';

// Public: fetch all products
export const getProducts = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.*,
        JSON_ARRAYAGG(pi.image_url) AS images
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      GROUP BY p.id
    `);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

// Add product with multiple images
export const addProduct = async (req: AuthRequest, res: Response) => {
  const { name, description, price, stock, categoryId, subcategoryId, images, isPublished } = req.body;

  if (!name || !price || !stock || !categoryId) {
    return res.status(400).json({ message: 'Name, price, stock, and categoryId are required' });
  }

  // Validate that images is an array
  if (images && !Array.isArray(images)) {
    return res.status(400).json({ message: 'Images must be an array of URLs' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // ✅ Insert the product
    const [result] = await connection.query<ResultSetHeader>(
      `
      INSERT INTO products 
        (name, description, price, stock, category_id, subcategory_id, is_published, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [name, description || '', price, stock, categoryId, subcategoryId || null, !!isPublished],
    );

    const productId = result.insertId;

    // ✅ Insert multiple product images
    if (Array.isArray(images) && images.length > 0) {
      const values = images.map((url, index) => [productId, url, index]);
      await connection.query('INSERT INTO product_images (product_id, image_url, sort_order) VALUES ?', [values]);
    }

    await connection.commit();

    res.status(201).json({
      message: 'Product added successfully',
      productId,
      published: !!isPublished,
    });
  } catch (err) {
    await connection.rollback();
    console.error('❌ Add product error:', err);
    res.status(500).json({ message: 'Failed to add product' });
  } finally {
    connection.release();
  }
};
