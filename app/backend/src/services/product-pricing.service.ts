import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2/promise';
import { CUSTOMER_GROUP_CODES } from '../constants/pricing';

type ProductBaseRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
  stock: number;
  is_published: number;
  category_id: number | null;
  subcategory_id: number | null;
  category_name: string | null;
  subcategory_name: string | null;
  thumbnail: string | null;
};

type CatalogListRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
  stock: number;
  is_published: number;
  category_id: number | null;
  subcategory_id: number | null;
  category_name: string | null;
  subcategory_name: string | null;
  thumbnail: string | null;
};

type CountRow = RowDataPacket & {
  total: number;
};

export type PriceListContext = {
  customerGroupId: number | null;
  customerGroupCode: string;
  priceListId: number;
  currency: string;
};

type PriceRow = RowDataPacket & {
  product_id: number;
  price_net: string;
  vat_rate: string;
  price_gross: string;
};

type DiscountRow = RowDataPacket & {
  id: number;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  priority: number;
};

export type ResolvedPrice = {
  productId: number;
  customerGroupCode: string;
  priceListId: number;
  currency: string;
  originalNet: number;
  originalGross: number;
  vatRate: number;
  discountAmountNet: number;
  discountAmountGross: number;
  finalNet: number;
  finalGross: number;
  appliedDiscount: null | {
    id: number;
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
  };
};

export type CatalogProduct = {
  id: number;
  name: string;
  description: string | null;
  stock: number;
  isPublished: boolean;
  categoryId: number | null;
  subcategoryId: number | null;
  categoryName: string | null;
  subcategoryName: string | null;
  thumbnail: string | null;
  pricing: ResolvedPrice;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export const getPriceListContextForUser = async (userId?: number | null): Promise<PriceListContext> => {
  if (!userId) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
        SELECT
          cg.id AS customer_group_id,
          cg.code AS customer_group_code,
          pl.id AS price_list_id,
          pl.currency
        FROM customer_groups cg
        JOIN price_lists pl ON pl.id = cg.price_list_id
        WHERE cg.code = ?
        LIMIT 1
      `,
      [CUSTOMER_GROUP_CODES.RETAIL],
    );

    if (!rows.length) {
      throw new Error('Retail price list not configured');
    }

    return {
      customerGroupId: rows[0].customer_group_id,
      customerGroupCode: rows[0].customer_group_code,
      priceListId: rows[0].price_list_id,
      currency: rows[0].currency,
    };
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT
        cg.id AS customer_group_id,
        cg.code AS customer_group_code,
        pl.id AS price_list_id,
        pl.currency
      FROM users u
      LEFT JOIN customer_groups cg ON cg.id = u.customer_group_id
      LEFT JOIN price_lists pl ON pl.id = cg.price_list_id
      WHERE u.id = ?
      LIMIT 1
    `,
    [userId],
  );

  if (!rows.length || !rows[0].price_list_id) {
    const [fallbackRows] = await pool.query<RowDataPacket[]>(
      `
        SELECT
          cg.id AS customer_group_id,
          cg.code AS customer_group_code,
          pl.id AS price_list_id,
          pl.currency
        FROM customer_groups cg
        JOIN price_lists pl ON pl.id = cg.price_list_id
        WHERE cg.code = ?
        LIMIT 1
      `,
      [CUSTOMER_GROUP_CODES.RETAIL],
    );

    if (!fallbackRows.length) {
      throw new Error('Retail price list not configured');
    }

    return {
      customerGroupId: fallbackRows[0].customer_group_id,
      customerGroupCode: fallbackRows[0].customer_group_code,
      priceListId: fallbackRows[0].price_list_id,
      currency: fallbackRows[0].currency,
    };
  }

  return {
    customerGroupId: rows[0].customer_group_id,
    customerGroupCode: rows[0].customer_group_code,
    priceListId: rows[0].price_list_id,
    currency: rows[0].currency,
  };
};

export const getCatalogProductBaseById = async (productId: number): Promise<ProductBaseRow | null> => {
  const [rows] = await pool.query<ProductBaseRow[]>(
    `
      SELECT
        p.id,
        p.name,
        p.description,
        p.stock,
        p.is_published,
        p.category_id,
        p.subcategory_id,
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
      WHERE p.id = ?
      LIMIT 1
    `,
    [productId],
  );

  return rows[0] ?? null;
};

export const getPriceForProductFromPriceList = async (
  productId: number,
  priceListId: number,
): Promise<PriceRow | null> => {
  const [rows] = await pool.query<PriceRow[]>(
    `
      SELECT
        product_id,
        price_net,
        vat_rate,
        price_gross
      FROM price_list_prices
      WHERE product_id = ?
        AND price_list_id = ?
      LIMIT 1
    `,
    [productId, priceListId],
  );

  return rows[0] ?? null;
};

export const getProductDiscounts = async (
  productId: number,
  categoryId: number | null,
  subcategoryId: number | null,
  customerGroupId: number | null,
): Promise<DiscountRow[]> => {
  const [rows] = await pool.query<DiscountRow[]>(
    `
      SELECT DISTINCT
        d.id,
        d.name,
        d.discount_type,
        d.discount_value,
        d.priority
      FROM discounts d
      LEFT JOIN discount_products dp ON dp.discount_id = d.id
      LEFT JOIN discount_categories dc ON dc.discount_id = d.id
      LEFT JOIN discount_subcategories ds ON ds.discount_id = d.id
      LEFT JOIN discount_customer_groups dcg ON dcg.discount_id = d.id
      WHERE d.is_active = 1
        AND (d.starts_at IS NULL OR d.starts_at <= NOW())
        AND (d.ends_at IS NULL OR d.ends_at >= NOW())
        AND (
          dcg.customer_group_id IS NULL
          OR dcg.customer_group_id = ?
        )
        AND (
          dp.product_id = ?
          OR (? IS NOT NULL AND dc.category_id = ?)
          OR (? IS NOT NULL AND ds.subcategory_id = ?)
        )
      ORDER BY d.priority DESC, d.id DESC
    `,
    [customerGroupId, productId, categoryId, categoryId, subcategoryId, subcategoryId],
  );

  return rows;
};

export const resolveProductPrice = async (productId: number, userId?: number | null): Promise<ResolvedPrice | null> => {
  const product = await getCatalogProductBaseById(productId);
  if (!product) return null;

  const context = await getPriceListContextForUser(userId ?? null);
  const priceRow = await getPriceForProductFromPriceList(productId, context.priceListId);

  if (!priceRow) return null;

  const originalNet = Number(priceRow.price_net);
  const originalGross = Number(priceRow.price_gross);
  const vatRate = Number(priceRow.vat_rate);

  const discounts = await getProductDiscounts(
    productId,
    product.category_id,
    product.subcategory_id,
    context.customerGroupId,
  );

  let bestDiscount: ResolvedPrice['appliedDiscount'] = null;
  let bestDiscountAmountGross = 0;
  let bestDiscountAmountNet = 0;

  for (const discount of discounts) {
    const value = Number(discount.discount_value);

    let discountGross = 0;
    let discountNet = 0;

    if (discount.discount_type === 'percentage') {
      discountGross = round2(originalGross * (value / 100));
      discountNet = round2(originalNet * (value / 100));
    } else {
      discountGross = Math.min(value, originalGross);
      discountNet = round2(discountGross / (1 + vatRate / 100));
    }

    if (discountGross > bestDiscountAmountGross) {
      bestDiscountAmountGross = discountGross;
      bestDiscountAmountNet = discountNet;
      bestDiscount = {
        id: discount.id,
        name: discount.name,
        type: discount.discount_type,
        value,
      };
    }
  }

  return {
    productId,
    customerGroupCode: context.customerGroupCode,
    priceListId: context.priceListId,
    currency: context.currency,
    originalNet,
    originalGross,
    vatRate,
    discountAmountNet: bestDiscountAmountNet,
    discountAmountGross: bestDiscountAmountGross,
    finalNet: round2(Math.max(0, originalNet - bestDiscountAmountNet)),
    finalGross: round2(Math.max(0, originalGross - bestDiscountAmountGross)),
    appliedDiscount: bestDiscount,
  };
};

export const getCatalogProductWithPricing = async (
  productId: number,
  userId?: number | null,
): Promise<CatalogProduct | null> => {
  const product = await getCatalogProductBaseById(productId);
  if (!product) return null;

  const pricing = await resolveProductPrice(productId, userId ?? null);
  if (!pricing) return null;

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    stock: product.stock,
    isPublished: Boolean(product.is_published),
    categoryId: product.category_id,
    subcategoryId: product.subcategory_id,
    categoryName: product.category_name,
    subcategoryName: product.subcategory_name,
    thumbnail: product.thumbnail,
    pricing,
  };
};

export const getCatalogProductsList = async ({
  page,
  limit,
  search,
  pricingContext,
}: {
  page: number;
  limit: number;
  search: string;
  pricingContext: PriceListContext;
}) => {
  const offset = (page - 1) * limit;
  const params: Array<string | number> = [];
  const whereClauses = [`p.is_published = 1`];

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

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const dataQuery = `
    SELECT
      p.id,
      p.name,
      p.description,
      p.stock,
      p.is_published,
      p.category_id,
      p.subcategory_id,
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
    ORDER BY p.created_at DESC
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

  const [rows] = await pool.query<CatalogListRow[]>(dataQuery, [...params, limit, offset]);
  const [countRows] = await pool.query<CountRow[]>(countQuery, params);

  const items = await Promise.all(
    rows.map(async (row) => {
      const priceRow = await getPriceForProductFromPriceList(row.id, pricingContext.priceListId);
      if (!priceRow) return null;

      const discounts = await getProductDiscounts(
        row.id,
        row.category_id,
        row.subcategory_id,
        pricingContext.customerGroupId,
      );

      const originalNet = Number(priceRow.price_net);
      const originalGross = Number(priceRow.price_gross);
      const vatRate = Number(priceRow.vat_rate);

      let bestDiscount: ResolvedPrice['appliedDiscount'] = null;
      let bestDiscountAmountGross = 0;
      let bestDiscountAmountNet = 0;

      for (const discount of discounts) {
        const value = Number(discount.discount_value);

        let discountGross = 0;
        let discountNet = 0;

        if (discount.discount_type === 'percentage') {
          discountGross = round2(originalGross * (value / 100));
          discountNet = round2(originalNet * (value / 100));
        } else {
          discountGross = Math.min(value, originalGross);
          discountNet = round2(discountGross / (1 + vatRate / 100));
        }

        if (discountGross > bestDiscountAmountGross) {
          bestDiscountAmountGross = discountGross;
          bestDiscountAmountNet = discountNet;
          bestDiscount = {
            id: discount.id,
            name: discount.name,
            type: discount.discount_type,
            value,
          };
        }
      }

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        stock: row.stock,
        isPublished: Boolean(row.is_published),
        categoryId: row.category_id,
        subcategoryId: row.subcategory_id,
        categoryName: row.category_name,
        subcategoryName: row.subcategory_name,
        thumbnail: row.thumbnail,
        pricing: {
          productId: row.id,
          customerGroupCode: pricingContext.customerGroupCode,
          priceListId: pricingContext.priceListId,
          currency: pricingContext.currency,
          originalNet,
          originalGross,
          vatRate,
          discountAmountNet: bestDiscountAmountNet,
          discountAmountGross: bestDiscountAmountGross,
          finalNet: round2(Math.max(0, originalNet - bestDiscountAmountNet)),
          finalGross: round2(Math.max(0, originalGross - bestDiscountAmountGross)),
          appliedDiscount: bestDiscount,
        },
      } satisfies CatalogProduct;
    }),
  );

  const filteredItems = items.filter(Boolean) as CatalogProduct[];
  const total = countRows[0]?.total ?? 0;

  return {
    data: filteredItems,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};
