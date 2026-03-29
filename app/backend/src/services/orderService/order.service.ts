import { pool } from '../../config/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
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
  user_id: number | null;
  guest_email: string | null;
  guest_first_name: string | null;
  guest_last_name: string | null;
  status: string;
  currency: string;
  payment_method: string | null;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  tax_total: string;
  grand_total: string;
  created_at: string;
  updated_at: string;
};

type CountRow = RowDataPacket & {
  total: number;
};

type OrderRow = RowDataPacket & {
  id: number;
  user_id: number | null;
  guest_email: string | null;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_phone: string | null;
  coupon_id: number | null;
  coupon_code: string | null;
  customer_group_code: string | null;
  currency: string;
  status: string;
  billing_address: string | null;
  shipping_address: string | null;
  payment_method: string | null;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  tax_total: string;
  grand_total: string;
  created_at: string;
  updated_at: string;
};

type OrderItemRow = RowDataPacket & {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  original_unit_price: string;
  unit_price: string;
  discount_amount: string;
  total_price: string;
  applied_discount_id: number | null;
  applied_discount_name: string | null;
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

    const [orderResult] = await connection.query<ResultSetHeader>(
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

export const getOrdersList = async ({ page, limit, search, sortBy, sortOrder }: GetOrdersListParams) => {
  const offset = (page - 1) * limit;

  const whereClauses: string[] = [];
  const params: Array<string | number> = [];

  if (search) {
    whereClauses.push(`
      (
        CAST(o.id AS CHAR) LIKE ?
        OR o.status LIKE ?
        OR o.currency LIKE ?
        OR o.payment_method LIKE ?
        OR o.coupon_code LIKE ?
        OR o.guest_email LIKE ?
        OR CONCAT(COALESCE(o.guest_first_name, ''), ' ', COALESCE(o.guest_last_name, '')) LIKE ?
      )
    `);

    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
    );
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      o.id,
      o.user_id,
      o.guest_email,
      o.guest_first_name,
      o.guest_last_name,
      o.status,
      o.currency,
      o.payment_method,
      o.subtotal,
      o.discount_total,
      o.shipping_total,
      o.tax_total,
      o.grand_total,
      o.created_at,
      o.updated_at
    FROM orders o
    ${whereSql}
    ORDER BY o.${sortBy} ${sortOrder}
    LIMIT ?
    OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM orders o
    ${whereSql}
  `;

  const [rows] = await pool.query<OrderListRow[]>(dataQuery, [...params, limit, offset]);
  const [countRows] = await pool.query<CountRow[]>(countQuery, params);

  const total = countRows[0]?.total ?? 0;

  return {
    data: rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      guest_email: row.guest_email,
      guest_first_name: row.guest_first_name,
      guest_last_name: row.guest_last_name,
      status: row.status,
      currency: row.currency,
      payment_method: row.payment_method,
      subtotal: Number(row.subtotal),
      discount_total: Number(row.discount_total),
      shipping_total: Number(row.shipping_total),
      tax_total: Number(row.tax_total),
      grand_total: Number(row.grand_total),
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getOrderById = async (orderId: number) => {
  const [orderRows] = await pool.query<OrderRow[]>(
    `
      SELECT
        o.id,
        o.user_id,
        o.guest_email,
        o.guest_first_name,
        o.guest_last_name,
        o.guest_phone,
        o.coupon_id,
        o.coupon_code,
        o.customer_group_code,
        o.currency,
        o.status,
        o.billing_address,
        o.shipping_address,
        o.payment_method,
        o.subtotal,
        o.discount_total,
        o.shipping_total,
        o.tax_total,
        o.grand_total,
        o.created_at,
        o.updated_at
      FROM orders o
      WHERE o.id = ?
      LIMIT 1
    `,
    [orderId],
  );

  const order = orderRows[0];

  if (!order) {
    return null;
  }

  const [itemRows] = await pool.query<OrderItemRow[]>(
    `
      SELECT
        oi.id,
        oi.order_id,
        oi.product_id,
        oi.quantity,
        oi.original_unit_price,
        oi.unit_price,
        oi.discount_amount,
        oi.total_price,
        oi.applied_discount_id,
        oi.applied_discount_name
      FROM order_items oi
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `,
    [orderId],
  );

  return {
    id: order.id,
    user_id: order.user_id,
    guest_email: order.guest_email,
    guest_first_name: order.guest_first_name,
    guest_last_name: order.guest_last_name,
    guest_phone: order.guest_phone,
    coupon_id: order.coupon_id,
    coupon_code: order.coupon_code,
    customer_group_code: order.customer_group_code,
    currency: order.currency,
    status: order.status,
    billing_address: order.billing_address,
    shipping_address: order.shipping_address,
    payment_method: order.payment_method,
    subtotal: Number(order.subtotal),
    discount_total: Number(order.discount_total),
    shipping_total: Number(order.shipping_total),
    tax_total: Number(order.tax_total),
    grand_total: Number(order.grand_total),
    created_at: order.created_at,
    updated_at: order.updated_at,
    items: itemRows.map((item) => ({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      quantity: item.quantity,
      original_unit_price: Number(item.original_unit_price),
      unit_price: Number(item.unit_price),
      discount_amount: Number(item.discount_amount),
      total_price: Number(item.total_price),
      applied_discount_id: item.applied_discount_id,
      applied_discount_name: item.applied_discount_name,
    })),
  };
};
