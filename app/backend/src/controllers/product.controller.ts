import { Request, Response } from 'express';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/admin.middleware';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

const ALLOWED_SORT_FIELDS = new Set(['id', 'name', 'price', 'stock', 'created_at', 'is_published']);

type ProductListRow = RowDataPacket & {
  id: number;
  name: string;
  price: number;
  stock: number;
  is_published: number;
  created_at: string;
  category_name: string | null;
  subcategory_name: string | null;
  thumbnail: string | null;
};

type CountRow = RowDataPacket & {
  total: number;
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const offset = (page - 1) * limit;

    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const search = rawSearch || '';

    const rawSortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'created_at';
    const sortBy = ALLOWED_SORT_FIELDS.has(rawSortBy) ? rawSortBy : 'created_at';

    const rawSortOrder = typeof req.query.sortOrder === 'string' ? req.query.sortOrder.toUpperCase() : 'DESC';
    const sortOrder = rawSortOrder === 'ASC' ? 'ASC' : 'DESC';

    const whereClauses: string[] = [];
    const params: Array<string | number> = [];

    if (search) {
      whereClauses.push(`
        (
          p.name LIKE ?
          OR p.description LIKE ?
          OR c.name LIKE ?
          OR sc.name LIKE ?
        )
      `);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const dataQuery = `
      SELECT
        p.id,
        p.name,
        p.price,
        p.stock,
        p.is_published,
        p.created_at,
        c.name AS category_name,
        sc.name AS subcategory_name,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) AS thumbnail
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN subcategories sc ON sc.id = p.subcategory_id
      ${whereSql}
      ORDER BY p.${sortBy} ${sortOrder}
      LIMIT ?
      OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN subcategories sc ON sc.id = p.subcategory_id
      ${whereSql}
    `;

    const [rows] = await pool.query<ProductListRow[]>(dataQuery, [...params, limit, offset]);
    const [countRows] = await pool.query<CountRow[]>(countQuery, params);

    const total = countRows[0]?.total ?? 0;

    return res.status(200).json({
      data: rows.map((row) => ({
        ...row,
        is_published: Boolean(row.is_published),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Fetch products error:', err);
    return res.status(500).json({ message: 'Failed to fetch products' });
  }
};

// Add product with multiple images
export const addProduct = async (req: AuthRequest, res: Response) => {
  const { name, description, price, stock, categoryId, subcategoryId, images, isPublished } = req.body;

  if (name == null || price == null || stock == null || categoryId == null) {
    return res.status(400).json({ message: 'Name, price, stock, and categoryId are required' });
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

  if (images && !Array.isArray(images)) {
    return res.status(400).json({ message: 'Images must be an array of URLs' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query<ResultSetHeader>(
      `
      INSERT INTO products
        (name, description, price, stock, category_id, subcategory_id, is_published, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [name.trim(), description || '', price, stock, categoryId, subcategoryId || null, Boolean(isPublished)],
    );

    const productId = result.insertId;

    if (Array.isArray(images) && images.length > 0) {
      const values = images.map((url: string, index: number) => [productId, url, index]);
      await connection.query('INSERT INTO product_images (product_id, image_url, sort_order) VALUES ?', [values]);
    }

    await connection.commit();

    return res.status(201).json({
      message: 'Product added successfully',
      productId,
      published: Boolean(isPublished),
    });
  } catch (err) {
    await connection.rollback();
    console.error('Add product error:', err);
    return res.status(500).json({ message: 'Failed to add product' });
  } finally {
    connection.release();
  }
};
