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
  stock: number;
  is_published: number;
  created_at: string;
  category_name: string | null;
  subcategory_name: string | null;
  thumbnail: string | null;
  b2c_price_gross: string | null;
  b2b_price_gross: string | null;
};

type CountRow = RowDataPacket & {
  total: number;
};

type CreateProductParams = {
  name: string;
  description: string;
  stock: number;
  categoryId: number;
  subcategoryId: number | null;
  images: string[];
  isPublished: boolean;
  pricing: {
    currency?: string;
    b2c: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
    b2b: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
  };
};

type UpdateProductPricesParams = {
  productId: number;
  currency?: string;
  b2c: {
    priceNet: number;
    vatRate: number;
    priceGross: number;
  };
  b2b: {
    priceNet: number;
    vatRate: number;
    priceGross: number;
  };
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
      ) AS thumbnail,
      (
        SELECT pp.price_gross
        FROM product_prices pp
        WHERE pp.product_id = p.id
          AND pp.customer_type = 'b2c'
          AND pp.currency = 'EUR'
        LIMIT 1
      ) AS b2c_price_gross,
      (
        SELECT pp.price_gross
        FROM product_prices pp
        WHERE pp.product_id = p.id
          AND pp.customer_type = 'b2b'
          AND pp.currency = 'EUR'
        LIMIT 1
      ) AS b2b_price_gross
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
      b2c_price_gross: row.b2c_price_gross != null ? Number(row.b2c_price_gross) : null,
      b2b_price_gross: row.b2b_price_gross != null ? Number(row.b2b_price_gross) : null,
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
  stock,
  categoryId,
  subcategoryId,
  images,
  isPublished,
  pricing,
}: CreateProductParams) => {
  const connection = await pool.getConnection();
  const currency = pricing.currency || 'EUR';

  try {
    await connection.beginTransaction();

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO products
          (
            name,
            description,
            stock,
            category_id,
            subcategory_id,
            is_published,
            created_at
          )
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `,
      [name, description, stock, categoryId, subcategoryId, isPublished],
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

    await connection.query(
      `
        INSERT INTO product_prices
          (product_id, customer_type, currency, price_net, vat_rate, price_gross)
        VALUES
          (?, 'b2c', ?, ?, ?, ?),
          (?, 'b2b', ?, ?, ?, ?)
      `,
      [
        productId,
        currency,
        pricing.b2c.priceNet,
        pricing.b2c.vatRate,
        pricing.b2c.priceGross,
        productId,
        currency,
        pricing.b2b.priceNet,
        pricing.b2b.vatRate,
        pricing.b2b.priceGross,
      ],
    );

    await connection.commit();

    return { productId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const updateProductPrices = async ({ productId, currency = 'EUR', b2c, b2b }: UpdateProductPricesParams) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
        INSERT INTO product_prices
          (product_id, customer_type, currency, price_net, vat_rate, price_gross)
        VALUES
          (?, 'b2c', ?, ?, ?, ?),
          (?, 'b2b', ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          price_net = VALUES(price_net),
          vat_rate = VALUES(vat_rate),
          price_gross = VALUES(price_gross),
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        productId,
        currency,
        b2c.priceNet,
        b2c.vatRate,
        b2c.priceGross,
        productId,
        currency,
        b2b.priceNet,
        b2b.vatRate,
        b2b.priceGross,
      ],
    );

    await connection.commit();

    return { updated: true };
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
    await connection.query(`DELETE FROM product_prices WHERE product_id IN (${placeholders})`, ids);

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
