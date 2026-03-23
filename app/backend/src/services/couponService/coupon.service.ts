import { pool } from '../../config/db';
import { RowDataPacket } from 'mysql2/promise';

type CouponRow = RowDataPacket & {
  id: number;
  code: string;
  discount_type: 'fixed' | 'percent';
  discount_value: string;
  min_order_total: string;
  usage_limit: number | null;
  per_customer_limit: number | null;
};

type CountRow = RowDataPacket & {
  total: number;
};

export const validateCouponForCheckout = async ({
  code,
  customerGroupId,
  subtotal,
  userId,
}: {
  code: string;
  customerGroupId?: number | null;
  subtotal: number;
  userId?: number | null;
}) => {
  const [rows] = await pool.query<CouponRow[]>(
    `
      SELECT c.*
      FROM coupons c
      LEFT JOIN coupon_customer_groups ccg ON ccg.coupon_id = c.id
      WHERE c.code = ?
        AND c.active = 1
        AND (c.valid_from IS NULL OR c.valid_from <= NOW())
        AND (c.valid_to IS NULL OR c.valid_to >= NOW())
        AND (
          ccg.customer_group_id IS NULL
          OR ccg.customer_group_id = ?
        )
      LIMIT 1
    `,
    [code, customerGroupId ?? null],
  );

  const coupon = rows[0];
  if (!coupon) return null;

  if (subtotal < Number(coupon.min_order_total)) {
    return null;
  }

  if (coupon.usage_limit != null) {
    const [usageRows] = await pool.query<CountRow[]>(
      `
        SELECT COUNT(*) AS total
        FROM orders
        WHERE coupon_id = ?
      `,
      [coupon.id],
    );

    if ((usageRows[0]?.total ?? 0) >= coupon.usage_limit) {
      return null;
    }
  }

  if (userId && coupon.per_customer_limit != null) {
    const [userUsageRows] = await pool.query<CountRow[]>(
      `
        SELECT COUNT(*) AS total
        FROM orders
        WHERE coupon_id = ?
          AND user_id = ?
      `,
      [coupon.id, userId],
    );

    if ((userUsageRows[0]?.total ?? 0) >= coupon.per_customer_limit) {
      return null;
    }
  }

  return {
    id: coupon.id,
    code: coupon.code,
    discountType: coupon.discount_type,
    discountValue: Number(coupon.discount_value),
  };
};

export const calculateCouponDiscount = (
  subtotal: number,
  coupon: {
    discountType: 'fixed' | 'percent';
    discountValue: number;
  } | null,
) => {
  if (!coupon) return 0;

  if (coupon.discountType === 'percent') {
    return Math.round(subtotal * (coupon.discountValue / 100) * 100) / 100;
  }

  return Math.min(coupon.discountValue, subtotal);
};
