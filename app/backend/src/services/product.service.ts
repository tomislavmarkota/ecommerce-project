import { pool } from '../config/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

type GetProductsListParams = {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
};

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

type CreateProductParams = {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: number;
  subcategoryId: number | null;
  images: string[];
  isPublished: boolean;
};

export const getProductsList = async ({ page, limit, search, sortBy, sortOrder }: GetProductsListParams) => {
  const offset = (page - 1) * limit;

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

  return {
    data: rows.map((row) => ({
      ...row,
      is_published: Boolean(row.is_published),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const validateSubcategoryBelongsToCategory = async (categoryId: number, subcategoryId: number) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id
      FROM subcategories
      WHERE id = ? AND category_id = ?
      LIMIT 1
    `,
    [subcategoryId, categoryId],
  );

  return rows.length > 0;
};

export const createProduct = async ({
  name,
  description,
  price,
  stock,
  categoryId,
  subcategoryId,
  images,
  isPublished,
}: CreateProductParams) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO products
          (
            name,
            description,
            price,
            stock,
            category_id,
            subcategory_id,
            is_published,
            created_at
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [name, description, price, stock, categoryId, subcategoryId, isPublished],
    );

    const productId = result.insertId;

    if (images.length > 0) {
      const values = images.map((url, index) => [productId, url, index]);

      await connection.query(
        `
          INSERT INTO product_images
            (product_id, image_url, sort_order)
          VALUES ?
        `,
        [values],
      );
    }

    await connection.commit();

    return { productId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const deleteProductsByIds = async (ids: number[]) => {
  const placeholders = ids.map(() => '?').join(', ');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(`DELETE FROM product_images WHERE product_id IN (${placeholders})`, ids);

    const [result] = await connection.query<ResultSetHeader>(`DELETE FROM products WHERE id IN (${placeholders})`, ids);

    await connection.commit();

    return {
      deletedCount: result.affectedRows,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
