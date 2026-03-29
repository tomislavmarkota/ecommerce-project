import { pool } from '../config/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { ProductPricingInput } from '../../types/pricing';

type CreateProductParams = {
  name: string;
  description: string;
  stock: number;
  categoryIds: number[];
  primaryCategoryId: number;
  isPublished: boolean;
  pricing: ProductPricingInput;
};

type UpdateProductParams = {
  productId: number;
  name: string;
  description: string;
  stock: number;
  categoryIds: number[];
  primaryCategoryId: number;
  isPublished: boolean;
  pricing: ProductPricingInput;
};

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
  price_net: string;
  vat_rate: string;
  price_gross: string;
  category_name: string | null;
  thumbnail: string | null;
};

type CountRow = RowDataPacket & {
  total: number;
};

type ProductDetailsRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
  stock: number;
  is_published: number;
  created_at: string;
  updated_at: string | null;
  price_net: string;
  vat_rate: string;
  price_gross: string;
};

type ProductCategoryRow = RowDataPacket & {
  category_id: number;
  category_name: string | null;
  is_primary: number;
};

type ProductImageRow = RowDataPacket & {
  id: number;
  product_id: number;
  blob_name: string;
  image_url: string;
  thumbnail_blob_name: string | null;
  thumbnail_url: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: number;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
};

const normalizeCategoryIds = (categoryIds: number[]): number[] => [
  ...new Set(categoryIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)),
];

const insertProductCategories = async (
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  productId: number,
  categoryIds: number[],
  primaryCategoryId: number,
) => {
  for (const categoryId of categoryIds) {
    await connection.query(
      `
        INSERT INTO product_categories (product_id, category_id, is_primary)
        VALUES (?, ?, ?)
      `,
      [productId, categoryId, categoryId === primaryCategoryId ? 1 : 0],
    );
  }
};

export const validateCategoryExists = async (categoryId: number): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id
      FROM categories
      WHERE id = ?
      LIMIT 1
    `,
    [categoryId],
  );

  return rows.length > 0;
};

export const validateCategoriesExist = async (categoryIds: number[]): Promise<boolean> => {
  const normalizedIds = normalizeCategoryIds(categoryIds);

  if (normalizedIds.length === 0) {
    return false;
  }

  const placeholders = normalizedIds.map(() => '?').join(', ');

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id
      FROM categories
      WHERE id IN (${placeholders})
    `,
    normalizedIds,
  );

  return rows.length === normalizedIds.length;
};

export const getProductsList = async ({ page, limit, search, sortBy, sortOrder }: GetProductsListParams) => {
  const offset = (page - 1) * limit;

  const whereClauses: string[] = [];
  const params: Array<string | number> = [];

  if (search) {
    whereClauses.push(`(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      p.id,
      p.name,
      p.stock,
      p.is_published,
      p.created_at,
      p.price_net,
      p.vat_rate,
      p.price_gross,
      c.name AS category_name,
      (
        SELECT COALESCE(pi.thumbnail_url, pi.image_url)
        FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
        LIMIT 1
      ) AS thumbnail
    FROM products p
    LEFT JOIN product_categories pc
      ON pc.product_id = p.id
     AND pc.is_primary = 1
    LEFT JOIN categories c
      ON c.id = pc.category_id
    ${whereSql}
    ORDER BY p.${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(DISTINCT p.id) AS total
    FROM products p
    LEFT JOIN product_categories pc
      ON pc.product_id = p.id
     AND pc.is_primary = 1
    LEFT JOIN categories c
      ON c.id = pc.category_id
    ${whereSql}
  `;

  const [rows] = await pool.query<ProductListRow[]>(dataQuery, [...params, limit, offset]);
  const [countRows] = await pool.query<CountRow[]>(countQuery, params);

  const total = countRows[0]?.total ?? 0;

  return {
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      stock: row.stock,
      is_published: Boolean(row.is_published),
      created_at: row.created_at,
      price_net: Number(row.price_net),
      vat_rate: Number(row.vat_rate),
      price_gross: Number(row.price_gross),
      category_name: row.category_name,
      thumbnail: row.thumbnail,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const createProduct = async ({
  name,
  description,
  stock,
  categoryIds,
  primaryCategoryId,
  isPublished,
  pricing,
}: CreateProductParams) => {
  const normalizedCategoryIds = normalizeCategoryIds(categoryIds);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO products (
          name,
          description,
          stock,
          is_published,
          price_net,
          vat_rate,
          price_gross,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [name, description, stock, isPublished ? 1 : 0, pricing.priceNet, pricing.vatRate, pricing.priceGross],
    );

    const productId = result.insertId;

    await insertProductCategories(connection, productId, normalizedCategoryIds, primaryCategoryId);

    await connection.commit();

    return { productId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateProductPrices = async ({
  productId,
  pricing,
}: {
  productId: number;
  pricing: ProductPricingInput;
}) => {
  const [result] = await pool.query<ResultSetHeader>(
    `
      UPDATE products
      SET
        price_net = ?,
        vat_rate = ?,
        price_gross = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    [pricing.priceNet, pricing.vatRate, pricing.priceGross, productId],
  );

  return {
    updated: result.affectedRows > 0,
  };
};

export const deleteProductsByIds = async (ids: number[]) => {
  const placeholders = ids.map(() => '?').join(', ');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(`DELETE FROM company_product_discounts WHERE product_id IN (${placeholders})`, ids);

    await connection.query(`DELETE FROM product_images WHERE product_id IN (${placeholders})`, ids);

    await connection.query(`DELETE FROM product_categories WHERE product_id IN (${placeholders})`, ids);

    const [result] = await connection.query<ResultSetHeader>(`DELETE FROM products WHERE id IN (${placeholders})`, ids);

    await connection.commit();

    return {
      deletedCount: result.affectedRows,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getProductById = async (productId: number) => {
  const [productRows] = await pool.query<ProductDetailsRow[]>(
    `
      SELECT
        p.id,
        p.name,
        p.description,
        p.stock,
        p.is_published,
        p.created_at,
        p.updated_at,
        p.price_net,
        p.vat_rate,
        p.price_gross
      FROM products p
      WHERE p.id = ?
      LIMIT 1
    `,
    [productId],
  );

  const product = productRows[0];

  if (!product) {
    return null;
  }

  const [categoryRows] = await pool.query<ProductCategoryRow[]>(
    `
      SELECT
        pc.category_id,
        c.name AS category_name,
        pc.is_primary
      FROM product_categories pc
      LEFT JOIN categories c
        ON c.id = pc.category_id
      WHERE pc.product_id = ?
      ORDER BY pc.is_primary DESC, c.name ASC
    `,
    [productId],
  );

  const [imageRows] = await pool.query<ProductImageRow[]>(
    `
      SELECT
        id,
        product_id,
        blob_name,
        image_url,
        thumbnail_blob_name,
        thumbnail_url,
        alt_text,
        sort_order,
        is_primary,
        mime_type,
        file_size,
        width,
        height,
        created_at,
        updated_at
      FROM product_images
      WHERE product_id = ?
      ORDER BY is_primary DESC, sort_order ASC, id ASC
    `,
    [productId],
  );

  const primaryCategory = categoryRows.find((row) => Boolean(row.is_primary)) ?? categoryRows[0] ?? null;

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    stock: product.stock,
    categoryId: primaryCategory?.category_id ?? null,
    categoryIds: categoryRows.map((row) => row.category_id),
    primaryCategoryId: primaryCategory?.category_id ?? null,
    categories: categoryRows.map((row) => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      isPrimary: Boolean(row.is_primary),
    })),
    isPublished: Boolean(product.is_published),
    createdAt: product.created_at,
    updatedAt: product.updated_at,
    images: imageRows.map((row) => ({
      id: row.id,
      product_id: row.product_id,
      blob_name: row.blob_name,
      image_url: row.image_url,
      thumbnail_blob_name: row.thumbnail_blob_name,
      thumbnail_url: row.thumbnail_url,
      alt_text: row.alt_text,
      sort_order: row.sort_order,
      is_primary: row.is_primary,
      mime_type: row.mime_type,
      file_size: row.file_size,
      width: row.width,
      height: row.height,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
    pricing: {
      priceNet: Number(product.price_net),
      vatRate: Number(product.vat_rate),
      priceGross: Number(product.price_gross),
    },
  };
};

export const updateProductById = async ({
  productId,
  name,
  description,
  stock,
  categoryIds,
  primaryCategoryId,
  isPublished,
  pricing,
}: UpdateProductParams) => {
  const normalizedCategoryIds = normalizeCategoryIds(categoryIds);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
        UPDATE products
        SET
          name = ?,
          description = ?,
          stock = ?,
          is_published = ?,
          price_net = ?,
          vat_rate = ?,
          price_gross = ?,
          updated_at = NOW()
        WHERE id = ?
      `,
      [name, description, stock, isPublished ? 1 : 0, pricing.priceNet, pricing.vatRate, pricing.priceGross, productId],
    );

    await connection.query(`DELETE FROM product_categories WHERE product_id = ?`, [productId]);

    await insertProductCategories(connection, productId, normalizedCategoryIds, primaryCategoryId);

    await connection.commit();

    return { updated: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
