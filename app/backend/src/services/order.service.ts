import { pool } from '../config/db';
import { ResultSetHeader } from 'mysql2/promise';
import { buildCheckoutPreview } from './checkout.service';

type CreateOrderParams = {
  userId: number;
  items: { productId: number; quantity: number }[];
  couponCode?: string;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  paymentMethod?: string | null;
  currency?: string;
};

export const createOrderFromCheckout = async ({
  userId,
  items,
  couponCode,
  billingAddress = null,
  shippingAddress = null,
  paymentMethod = null,
  currency = 'EUR',
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
        INSERT INTO orders
          (
            user_id,
            coupon_id,
            coupon_code,
            customer_type,
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        userId,
        preview.coupon?.id ?? null,
        preview.coupon?.code ?? null,
        preview.customerType,
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
          INSERT INTO order_items
            (
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

    return {
      orderId,
      preview,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
