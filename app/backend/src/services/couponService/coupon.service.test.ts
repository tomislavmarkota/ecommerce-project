import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateCouponDiscount, validateCouponForCheckout } from './coupon.service';

const mocks = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../config/db', () => ({
  pool: {
    query: mocks.mockQuery,
  },
}));

describe('coupon.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateCouponDiscount', () => {
    it('calculates percent coupon correctly', () => {
      const result = calculateCouponDiscount(200, {
        discountType: 'percent',
        discountValue: 10,
      });

      expect(result).toBe(20);
    });

    it('calculates fixed coupon correctly', () => {
      const result = calculateCouponDiscount(200, {
        discountType: 'fixed',
        discountValue: 30,
      });

      expect(result).toBe(30);
    });

    it('does not allow fixed coupon to exceed subtotal', () => {
      const result = calculateCouponDiscount(20, {
        discountType: 'fixed',
        discountValue: 50,
      });

      expect(result).toBe(20);
    });

    it('returns 0 when coupon is null', () => {
      const result = calculateCouponDiscount(100, null);

      expect(result).toBe(0);
    });
  });

  describe('validateCouponForCheckout', () => {
    it('returns null when coupon is not found', async () => {
      mocks.mockQuery.mockResolvedValueOnce([[]]);

      const result = await validateCouponForCheckout({
        code: 'NOPE',
        customerGroupId: 1,
        subtotal: 100,
        userId: 1,
      });

      expect(result).toBeNull();
      expect(mocks.mockQuery).toHaveBeenCalledTimes(1);
    });

    it('returns null when subtotal is below minimum order total', async () => {
      mocks.mockQuery.mockResolvedValueOnce([
        [
          {
            id: 1,
            code: 'SAVE10',
            discount_type: 'percent',
            discount_value: '10.00',
            min_order_total: '200.00',
            usage_limit: null,
            per_customer_limit: null,
          },
        ],
      ]);

      const result = await validateCouponForCheckout({
        code: 'SAVE10',
        customerGroupId: 1,
        subtotal: 100,
        userId: 1,
      });

      expect(result).toBeNull();
    });

    it('returns normalized coupon when coupon is valid', async () => {
      mocks.mockQuery.mockResolvedValueOnce([
        [
          {
            id: 1,
            code: 'SAVE10',
            discount_type: 'percent',
            discount_value: '10.00',
            min_order_total: '50.00',
            usage_limit: null,
            per_customer_limit: null,
          },
        ],
      ]);

      const result = await validateCouponForCheckout({
        code: 'SAVE10',
        customerGroupId: 1,
        subtotal: 100,
        userId: 1,
      });

      expect(result).toEqual({
        id: 1,
        code: 'SAVE10',
        discountType: 'percent',
        discountValue: 10,
      });
    });
  });
});
