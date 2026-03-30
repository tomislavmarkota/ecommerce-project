import { RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';
import { CatalogProduct, PricingSource, ResolvedPrice } from '../../types/pricing';

type ProductBaseRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
  stock: number;
  is_published: number;
  price_net: string;
  vat_rate: string;
  price_gross: string;
  category_id: number | null;
  category_name: string | null;
  thumbnail: string | null;
};

type CatalogListRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
  stock: number;
  is_published: number;
  price_net: string;
  vat_rate: string;
  price_gross: string;
  category_id: number | null;
  category_name: string | null;
  thumbnail: string | null;
};

type CountRow = RowDataPacket & {
  total: number;
};

type CompanyDefaultDiscountRow = RowDataPacket & {
  pricing_discount_percent: string;
};

type CompanyProductDiscountRow = RowDataPacket & {
  discount_percent: string;
};

type PriceListContextRow = RowDataPacket & {
  id: number;
  company_id: number | null;
  customer_group_id: number | null;
  customer_group_price_list_id: number | null;
  company_customer_group_id: number | null;
  company_customer_group_price_list_id: number | null;
};

type PriceListPriceRow = RowDataPacket & {
  price_net: string;
  price_gross: string;
  vat_rate: string;
};

export type PriceListContext = {
  customerType: 'b2c' | 'b2b';
  companyId: number | null;
  customerGroupId: number | null;
  priceListId: number | null;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export const getPriceListContextForUser = async (userId?: number | null): Promise<PriceListContext> => {
  if (!userId) {
    return {
      customerType: 'b2c',
      companyId: null,
      customerGroupId: null,
      priceListId: null,
    };
  }

  const [rows] = await pool.query<PriceListContextRow[]>(
    `
      SELECT
        u.id,
        u.company_id,
        u.customer_group_id,
        cg.price_list_id AS customer_group_price_list_id,
        c.customer_group_id AS company_customer_group_id,
        ccg.price_list_id AS company_customer_group_price_list_id
      FROM users u
      LEFT JOIN customer_groups cg
        ON cg.id = u.customer_group_id
      LEFT JOIN companies c
        ON c.id = u.company_id
      LEFT JOIN customer_groups ccg
        ON ccg.id = c.customer_group_id
      WHERE u.id = ?
      LIMIT 1
    `,
    [userId],
  );

  if (!rows.length) {
    return {
      customerType: 'b2c',
      companyId: null,
      customerGroupId: null,
      priceListId: null,
    };
  }

  const row = rows[0];
  const customerType: 'b2c' | 'b2b' = row.company_id ? 'b2b' : 'b2c';

  return {
    customerType,
    companyId: row.company_id ?? null,
    customerGroupId:
      customerType === 'b2b'
        ? row.company_customer_group_id ?? row.customer_group_id ?? null
        : row.customer_group_id ?? null,
    priceListId:
      customerType === 'b2b'
        ? row.company_customer_group_price_list_id ?? row.customer_group_price_list_id ?? null
        : row.customer_group_price_list_id ?? null,
  };
};

const getCatalogProductBaseById = async (productId: number): Promise<ProductBaseRow | null> => {
  const [rows] = await pool.query<ProductBaseRow[]>(
    `
      SELECT
        p.id,
        p.name,
        p.description,
        p.stock,
        p.is_published,
        p.price_net,
        p.vat_rate,
        p.price_gross,
        pc.category_id,
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
      WHERE p.id = ?
      LIMIT 1
    `,
    [productId],
  );

  return rows[0] ?? null;
};

const getPriceListPrice = async (
  productId: number,
  priceListId?: number | null,
): Promise<{
  priceNet: number;
  priceGross: number;
  vatRate: number;
} | null> => {
  if (!priceListId) {
    return null;
  }

  const [rows] = await pool.query<PriceListPriceRow[]>(
    `
      SELECT
        price_net,
        price_gross,
        vat_rate
      FROM price_list_prices
      WHERE product_id = ? AND price_list_id = ?
      LIMIT 1
    `,
    [productId, priceListId],
  );

  if (!rows.length) {
    return null;
  }

  return {
    priceNet: Number(rows[0].price_net),
    priceGross: Number(rows[0].price_gross),
    vatRate: Number(rows[0].vat_rate),
  };
};

const getCompanyDefaultDiscount = async (companyId: number): Promise<number> => {
  const [rows] = await pool.query<CompanyDefaultDiscountRow[]>(
    `
      SELECT pricing_discount_percent
      FROM companies
      WHERE id = ?
      LIMIT 1
    `,
    [companyId],
  );

  if (!rows.length) {
    return 0;
  }

  return Number(rows[0].pricing_discount_percent) || 0;
};

const getCompanyProductOverrideDiscount = async (companyId: number, productId: number): Promise<number | null> => {
  const [rows] = await pool.query<CompanyProductDiscountRow[]>(
    `
      SELECT discount_percent
      FROM company_product_discounts
      WHERE company_id = ? AND product_id = ?
      LIMIT 1
    `,
    [companyId, productId],
  );

  if (!rows.length) {
    return null;
  }

  return Number(rows[0].discount_percent);
};

const calculateResolvedPrice = ({
  productId,
  originalNet,
  originalGross,
  vatRate,
  discountPercent,
  source,
  companyId,
  customerType,
}: {
  productId: number;
  originalNet: number;
  originalGross: number;
  vatRate: number;
  discountPercent: number;
  source: PricingSource;
  companyId: number | null;
  customerType: 'b2c' | 'b2b';
}): ResolvedPrice => {
  const normalizedDiscountPercent = Math.min(Math.max(discountPercent, 0), 100);

  const discountAmountGross = round2(originalGross * (normalizedDiscountPercent / 100));
  const discountAmountNet = round2(originalNet * (normalizedDiscountPercent / 100));

  const finalGross = round2(Math.max(0, originalGross - discountAmountGross));
  const finalNet = round2(Math.max(0, originalNet - discountAmountNet));

  return {
    productId,
    currency: 'EUR',
    originalNet,
    originalGross,
    vatRate,
    discountPercent: normalizedDiscountPercent,
    discountAmountNet,
    discountAmountGross,
    finalNet,
    finalGross,
    source,
    companyId,
    customerType,
  };
};

export const resolveProductPrice = async (
  productId: number,
  pricingContext?: PriceListContext,
): Promise<ResolvedPrice | null> => {
  const product = await getCatalogProductBaseById(productId);

  if (!product) {
    return null;
  }

  const context: PriceListContext = pricingContext ?? {
    customerType: 'b2c',
    companyId: null,
    customerGroupId: null,
    priceListId: null,
  };

  const priceListPrice = await getPriceListPrice(productId, context.priceListId);

  const originalNet = priceListPrice ? priceListPrice.priceNet : Number(product.price_net);
  const originalGross = priceListPrice ? priceListPrice.priceGross : Number(product.price_gross);
  const vatRate = priceListPrice ? priceListPrice.vatRate : Number(product.vat_rate);

  if (context.customerType !== 'b2b' || !context.companyId) {
    return calculateResolvedPrice({
      productId,
      originalNet,
      originalGross,
      vatRate,
      discountPercent: 0,
      source: 'regular',
      companyId: context.companyId,
      customerType: context.customerType,
    });
  }

  const overrideDiscount = await getCompanyProductOverrideDiscount(context.companyId, productId);

  if (overrideDiscount !== null) {
    return calculateResolvedPrice({
      productId,
      originalNet,
      originalGross,
      vatRate,
      discountPercent: overrideDiscount,
      source: 'company_product_override',
      companyId: context.companyId,
      customerType: context.customerType,
    });
  }

  const companyDefaultDiscount = await getCompanyDefaultDiscount(context.companyId);

  if (companyDefaultDiscount > 0) {
    return calculateResolvedPrice({
      productId,
      originalNet,
      originalGross,
      vatRate,
      discountPercent: companyDefaultDiscount,
      source: 'company_default',
      companyId: context.companyId,
      customerType: context.customerType,
    });
  }

  return calculateResolvedPrice({
    productId,
    originalNet,
    originalGross,
    vatRate,
    discountPercent: 0,
    source: 'regular',
    companyId: context.companyId,
    customerType: context.customerType,
  });
};

export const getCatalogProductWithPricing = async (
  productId: number,
  pricingContext?: PriceListContext,
): Promise<CatalogProduct | null> => {
  const product = await getCatalogProductBaseById(productId);

  if (!product) {
    return null;
  }

  const pricing = await resolveProductPrice(productId, pricingContext);

  if (!pricing) {
    return null;
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    stock: product.stock,
    isPublished: Boolean(product.is_published),
    categoryId: product.category_id,
    categoryName: product.category_name,
    thumbnail: product.thumbnail,
    pricing,
  };
};

export const getCatalogProductsList = async ({
  page,
  limit,
  search,
  categoryId,
  pricingContext,
}: {
  page: number;
  limit: number;
  search: string;
  categoryId?: number | null;
  pricingContext?: PriceListContext;
}) => {
  const offset = (page - 1) * limit;
  const params: Array<string | number> = [];
  const whereClauses = ['p.is_published = 1'];

  if (search) {
    whereClauses.push(`(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (categoryId) {
    whereClauses.push(`
      pc.category_id IN (
        WITH RECURSIVE category_tree AS (
          SELECT id FROM categories WHERE id = ?
          UNION ALL
          SELECT c.id
          FROM categories c
          INNER JOIN category_tree ct ON c.parent_id = ct.id
        )
        SELECT id FROM category_tree
      )
    `);
    params.push(categoryId);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const dataQuery = `
    SELECT
      p.id,
      p.name,
      p.description,
      p.stock,
      p.is_published,
      p.price_net,
      p.vat_rate,
      p.price_gross,
      pc.category_id,
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
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM products p
    LEFT JOIN product_categories pc
      ON pc.product_id = p.id
     AND pc.is_primary = 1
    LEFT JOIN categories c
      ON c.id = pc.category_id
    ${whereSql}
  `;

  const [rows] = await pool.query<CatalogListRow[]>(dataQuery, [...params, limit, offset]);
  const [countRows] = await pool.query<CountRow[]>(countQuery, params);

  const data = await Promise.all(
    rows.map(async (row) => {
      const pricing = await resolveProductPrice(row.id, pricingContext);

      if (!pricing) {
        return null;
      }

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        stock: row.stock,
        isPublished: Boolean(row.is_published),
        categoryId: row.category_id,
        categoryName: row.category_name,
        thumbnail: row.thumbnail,
        pricing,
      } satisfies CatalogProduct;
    }),
  );

  const filteredData = data.filter(Boolean) as CatalogProduct[];
  const total = countRows[0]?.total ?? 0;

  return {
    data: filteredData,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};
