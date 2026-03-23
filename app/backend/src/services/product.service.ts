import { pool } from '../config/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { PRICE_LIST_CODES } from '../constants/pricing';

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
  retail_price_gross: string | null;
  business_price_gross: string | null;
};

type CountRow = RowDataPacket & {
  total: number;
};

type PriceListRow = RowDataPacket & {
  id: number;
  code: string;
};

type CreateProductParams = {
  name: string;
  description: string;
  stock: number;
  categoryId: number;
  subcategoryId: number | null;
  isPublished: boolean;
  pricing: {
    retail: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
    business: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
  };
};

type ProductDetailsRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
  stock: number;
  is_published: number;
  category_id: number | null;
  subcategory_id: number | null;
  created_at: string;
};

type ProductPriceRow = RowDataPacket & {
  code: string;
  price_net: string;
  vat_rate: string;
  price_gross: string;
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

type UpdateProductParams = {
  productId: number;
  name: string;
  description: string;
  stock: number;
  categoryId: number;
  subcategoryId: number | null;
  isPublished: boolean;
  pricing: {
    retail: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
    business: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
  };
};

export const getAdminPriceListIds = async () => {
  const [rows] = await pool.query<PriceListRow[]>(
    `
      SELECT id, code
      FROM price_lists
      WHERE code IN (?, ?)
    `,
    [PRICE_LIST_CODES.RETAIL_EUR, PRICE_LIST_CODES.BUSINESS_EUR],
  );

  const retail = rows.find((row) => row.code === PRICE_LIST_CODES.RETAIL_EUR);
  const business = rows.find((row) => row.code === PRICE_LIST_CODES.BUSINESS_EUR);

  if (!retail || !business) {
    throw new Error('Required price lists are not configured');
  }

  return {
    retailPriceListId: retail.id,
    businessPriceListId: business.id,
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
        SELECT COALESCE(pi.thumbnail_url, pi.image_url)
        FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
        LIMIT 1
      ) AS thumbnail,
      (
        SELECT plp.price_gross
        FROM price_list_prices plp
        WHERE plp.product_id = p.id
          AND plp.price_list_id = 1
        LIMIT 1
      ) AS retail_price_gross,
      (
        SELECT plp.price_gross
        FROM price_list_prices plp
        WHERE plp.product_id = p.id
          AND plp.price_list_id = 2
        LIMIT 1
      ) AS business_price_gross
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
      retail_price_gross: row.retail_price_gross != null ? Number(row.retail_price_gross) : null,
      business_price_gross: row.business_price_gross != null ? Number(row.business_price_gross) : null,
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
  isPublished,
  pricing,
}: CreateProductParams) => {
  const connection = await pool.getConnection();

  try {
    const { retailPriceListId, businessPriceListId } = await getAdminPriceListIds();

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

    await connection.query(
      `
        INSERT INTO price_list_prices
          (price_list_id, product_id, price_net, vat_rate, price_gross)
        VALUES
          (?, ?, ?, ?, ?),
          (?, ?, ?, ?, ?)
      `,
      [
        retailPriceListId,
        productId,
        pricing.retail.priceNet,
        pricing.retail.vatRate,
        pricing.retail.priceGross,
        businessPriceListId,
        productId,
        pricing.business.priceNet,
        pricing.business.vatRate,
        pricing.business.priceGross,
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

export const updateProductPrices = async ({
  productId,
  pricing,
}: {
  productId: number;
  pricing: {
    retail: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
    business: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
  };
}) => {
  const connection = await pool.getConnection();

  try {
    const { retailPriceListId, businessPriceListId } = await getAdminPriceListIds();

    await connection.beginTransaction();

    await connection.query(
      `
        INSERT INTO price_list_prices
          (price_list_id, product_id, price_net, vat_rate, price_gross)
        VALUES
          (?, ?, ?, ?, ?),
          (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          price_net = VALUES(price_net),
          vat_rate = VALUES(vat_rate),
          price_gross = VALUES(price_gross),
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        retailPriceListId,
        productId,
        pricing.retail.priceNet,
        pricing.retail.vatRate,
        pricing.retail.priceGross,
        businessPriceListId,
        productId,
        pricing.business.priceNet,
        pricing.business.vatRate,
        pricing.business.priceGross,
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
    await connection.query(`DELETE FROM price_list_prices WHERE product_id IN (${placeholders})`, ids);

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

export const getProductById = async (productId: number) => {
  const [productRows] = await pool.query<ProductDetailsRow[]>(
    `
      SELECT
        p.id,
        p.name,
        p.description,
        p.stock,
        p.is_published,
        p.category_id,
        p.subcategory_id,
        p.created_at
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

  const [priceRows] = await pool.query<ProductPriceRow[]>(
    `
      SELECT
        pl.code,
        plp.price_net,
        plp.vat_rate,
        plp.price_gross
      FROM price_list_prices plp
      JOIN price_lists pl ON pl.id = plp.price_list_id
      WHERE plp.product_id = ?
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

  const retail = priceRows.find((row) => row.code === PRICE_LIST_CODES.RETAIL_EUR);
  const business = priceRows.find((row) => row.code === PRICE_LIST_CODES.BUSINESS_EUR);

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    stock: product.stock,
    categoryId: product.category_id,
    subcategoryId: product.subcategory_id,
    isPublished: Boolean(product.is_published),
    createdAt: product.created_at,
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
      retail: retail
        ? {
            priceNet: Number(retail.price_net),
            vatRate: Number(retail.vat_rate),
            priceGross: Number(retail.price_gross),
          }
        : null,
      business: business
        ? {
            priceNet: Number(business.price_net),
            vatRate: Number(business.vat_rate),
            priceGross: Number(business.price_gross),
          }
        : null,
    },
  };
};

export const updateProductById = async ({
  productId,
  name,
  description,
  stock,
  categoryId,
  subcategoryId,
  isPublished,
  pricing,
}: UpdateProductParams) => {
  const connection = await pool.getConnection();

  try {
    const { retailPriceListId, businessPriceListId } = await getAdminPriceListIds();

    await connection.beginTransaction();

    await connection.query(
      `
        UPDATE products
        SET
          name = ?,
          description = ?,
          stock = ?,
          category_id = ?,
          subcategory_id = ?,
          is_published = ?
        WHERE id = ?
      `,
      [name, description, stock, categoryId, subcategoryId, isPublished, productId],
    );

    await connection.query(
      `
        INSERT INTO price_list_prices
          (price_list_id, product_id, price_net, vat_rate, price_gross)
        VALUES
          (?, ?, ?, ?, ?),
          (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          price_net = VALUES(price_net),
          vat_rate = VALUES(vat_rate),
          price_gross = VALUES(price_gross),
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        retailPriceListId,
        productId,
        pricing.retail.priceNet,
        pricing.retail.vatRate,
        pricing.retail.priceGross,
        businessPriceListId,
        productId,
        pricing.business.priceNet,
        pricing.business.vatRate,
        pricing.business.priceGross,
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
