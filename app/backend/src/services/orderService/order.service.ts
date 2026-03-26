import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2/promise';
import { buildCheckoutPreview } from '../checkoutService/checkout.service';

type CreateOrderParams = {
  userId: number | null;
  items: { productId: number; quantity: number }[];
  couponCode?: string;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  paymentMethod?: string | null;
  currency?: string;
  guest?: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
  } | null;
};

type GetOrdersListParams = {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
};

type OrderListRow = RowDataPacket & {
  id: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_group_code: string | null;
  status: string;
  payment_method: string | null;
  currency: string;
  subtotal: string;
  discount_total: string;
  grand_total: string;
  created_at: string;
  total_items: number;
};

type CountRow = RowDataPacket & {
  total: number;
};

export const getOrdersList = async ({ page, limit, search, sortBy, sortOrder }: GetOrdersListParams) => {
  const offset = (page - 1) * limit;

  const whereClauses: string[] = [];
  const params: Array<string | number> = [];

  if (search) {
    whereClauses.push(`
      (
        CAST(o.id AS CHAR) LIKE ?
        OR u.name LIKE ?
        OR u.email LIKE ?
        OR o.status LIKE ?
        OR o.customer_group_code LIKE ?
      )
    `);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      o.id,
      u.name AS customer_name,
      u.email AS customer_email,
      o.customer_group_code,
      o.status,
      o.payment_method,
      o.currency,
      o.subtotal,
      o.discount_total,
      o.grand_total,
      o.created_at,
      COALESCE(SUM(oi.quantity), 0) AS total_items
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    ${whereSql}
    GROUP BY
      o.id,
      u.name,
      u.email,
      o.customer_group_code,
      o.status,
      o.payment_method,
      o.currency,
      o.subtotal,
      o.discount_total,
      o.grand_total,
      o.created_at
    ORDER BY o.${sortBy} ${sortOrder}
    LIMIT ?
    OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    ${whereSql}
  `;

  const [rows] = await pool.query<OrderListRow[]>(dataQuery, [...params, limit, offset]);
  const [countRows] = await pool.query<CountRow[]>(countQuery, params);

  const total = countRows[0]?.total ?? 0;

  return {
    data: rows.map((row) => ({
      id: row.id,
      customer_name: row.customer_name,
      customer_email: row.customer_email,
      customer_group_code: row.customer_group_code,
      status: row.status,
      payment_method: row.payment_method,
      currency: row.currency,
      subtotal: Number(row.subtotal),
      discount_total: Number(row.discount_total),
      grand_total: Number(row.grand_total),
      created_at: row.created_at,
      total_items: Number(row.total_items),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const createOrderFromCheckout = async ({
  userId,
  items,
  couponCode,
  billingAddress = null,
  shippingAddress = null,
  paymentMethod = null,
  currency = 'EUR',
  guest = null,
}: CreateOrderParams) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const preview = await buildCheckoutPreview({
      items,
      userId,
      couponCode,
    });

    const [orderResult]: any = await connection.query(
      `
      INSERT INTO orders (
        user_id,
        guest_email,
        guest_first_name,
        guest_last_name,
        guest_phone,
        coupon_id,
        coupon_code,
        customer_group_code,
        currency,
        status,
        billing_address,
        shipping_address,
        payment_method,
        subtotal,
        discount_total,
        shipping_total,
        tax_total,
        grand_total,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        userId,
        guest?.email ?? null,
        guest?.firstName ?? null,
        guest?.lastName ?? null,
        guest?.phone ?? null,
        preview.coupon?.id ?? null,
        preview.coupon?.code ?? null,
        preview.customerGroupCode,
        currency,
        'pending',
        billingAddress,
        shippingAddress,
        paymentMethod,
        preview.subtotal,
        (preview.coupon?.discountAmount ?? 0) + preview.items.reduce((sum, item) => sum + item.discount_amount, 0),
        0,
        0,
        preview.grandTotal,
      ],
    );

    const orderId = orderResult.insertId;

    for (const item of preview.items) {
      await connection.query(
        `
        INSERT INTO order_items (
          order_id,
          product_id,
          quantity,
          original_unit_price,
          unit_price,
          discount_amount,
          total_price,
          applied_discount_id,
          applied_discount_name
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.productId,
          item.quantity,
          item.original_unit_price,
          item.unit_price,
          item.discount_amount,
          item.total_price,
          item.applied_discount_id,
          item.applied_discount_name,
        ],
      );
    }

    await connection.commit();

    return { orderId, preview };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
