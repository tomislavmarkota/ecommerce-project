import { Request, Response } from 'express';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/admin.middleware';

// Public: fetch all products
export const getProducts = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

// Admin only: add product
// export const addProduct = async (req: AuthRequest, res: Response) => {
//   const { name, description, price, stock, categoryId, subcategoryId, imageUrl } = req.body;
//   console.log('TEST');
//   if (!name || !price || !stock || !categoryId) {
//     return res.status(400).json({ message: 'Name, price, stock, and categoryId are required' });
//   }

//   try {
//     const [result]: any = await pool.query(
//       `INSERT INTO products
//        (name, description, price, stock, category_id, subcategory_id, image_url, created_at)
//        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
//       [name, description || '', price, stock, categoryId, subcategoryId || null, imageUrl || ''],
//     );

//     res.status(201).json({ message: 'Product added', productId: result.insertId });
//   } catch (err) {
//     console.error('Add product error:', err);
//     res.status(500).json({ message: 'Failed to add product' });
//   }
// };

export const addProduct = async (req: AuthRequest, res: Response) => {
  const {
    name,
    description,
    price,
    stock,
    categoryId,
    subcategoryId,
    imageUrl,
    isPublished, // 👈 new
  } = req.body;

  if (!name || !price || !stock || !categoryId) {
    return res.status(400).json({ message: 'Name, price, stock, and categoryId are required' });
  }

  try {
    const [result]: any = await pool.query(
      `INSERT INTO products 
       (name, description, price, stock, category_id, subcategory_id, image_url, is_published, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [name, description || '', price, stock, categoryId, subcategoryId || null, imageUrl || '', isPublished],
    );

    res.status(201).json({
      message: 'Product added successfully',
      productId: result.insertId,
      published: !!isPublished,
    });
  } catch (err) {
    console.error('❌ Add product error:', err);
    res.status(500).json({ message: 'Failed to add product' });
  }
};
