import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCheckoutPreview } from './checkout.service';

const mocks = vi.hoisted(() => ({
  mockGetPriceListContextForUser: vi.fn(),
  mockResolveProductPrice: vi.fn(),
  mockValidateCouponForCheckout: vi.fn(),
  mockCalculateCouponDiscount: vi.fn(),
}));

vi.mock('../product-pricing.service', () => ({
  getPriceListContextForUser: mocks.mockGetPriceListContextForUser,
  resolveProductPrice: mocks.mockResolveProductPrice,
}));

vi.mock('../couponService/coupon.service', () => ({
  validateCouponForCheckout: mocks.mockValidateCouponForCheckout,
  calculateCouponDiscount: mocks.mockCalculateCouponDiscount,
}));

describe('checkout.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds checkout preview without coupon', async () => {
    mocks.mockGetPriceListContextForUser.mockResolvedValue({
      customerGroupId: 1,
      customerGroupCode: 'retail',
      priceListId: 10,
      currency: 'EUR',
    });

    mocks.mockResolveProductPrice.mockResolvedValueOnce({
      originalGross: 100,
      finalGross: 90,
      appliedDiscount: {
        id: 1,
        name: 'Spring Sale',
      },
    });

    mocks.mockCalculateCouponDiscount.mockReturnValue(0);

    const result = await buildCheckoutPreview({
      items: [{ productId: 10, quantity: 2 }],
      userId: 5,
    });

    expect(mocks.mockGetPriceListContextForUser).toHaveBeenCalledWith(5);
    expect(mocks.mockResolveProductPrice).toHaveBeenCalledWith(10, 5);
    expect(mocks.mockValidateCouponForCheckout).not.toHaveBeenCalled();
    expect(mocks.mockCalculateCouponDiscount).toHaveBeenCalledWith(180, null);

    expect(result).toEqual({
      customerGroupCode: 'retail',
      items: [
        {
          productId: 10,
          quantity: 2,
          original_unit_price: 100,
          unit_price: 90,
          discount_amount: 20,
          total_price: 180,
          applied_discount_id: 1,
          applied_discount_name: 'Spring Sale',
        },
      ],
      subtotal: 180,
      coupon: null,
      grandTotal: 180,
    });
  });

  it('builds checkout preview with valid coupon', async () => {
    mocks.mockGetPriceListContextForUser.mockResolvedValue({
      customerGroupId: 2,
      customerGroupCode: 'business',
      priceListId: 20,
      currency: 'EUR',
    });

    mocks.mockResolveProductPrice.mockResolvedValueOnce({
      originalGross: 50,
      finalGross: 40,
      appliedDiscount: {
        id: 7,
        name: 'Wholesale Deal',
      },
    });

    mocks.mockValidateCouponForCheckout.mockResolvedValue({
      id: 99,
      code: 'SAVE10',
      discountType: 'percent',
      discountValue: 10,
    });

    mocks.mockCalculateCouponDiscount.mockReturnValue(8);

    const result = await buildCheckoutPreview({
      items: [{ productId: 22, quantity: 2 }],
      userId: 8,
      couponCode: 'SAVE10',
    });

    expect(mocks.mockGetPriceListContextForUser).toHaveBeenCalledWith(8);
    expect(mocks.mockResolveProductPrice).toHaveBeenCalledWith(22, 8);
    expect(mocks.mockValidateCouponForCheckout).toHaveBeenCalledWith({
      code: 'SAVE10',
      customerGroupId: 2,
      subtotal: 80,
      userId: 8,
    });
    expect(mocks.mockCalculateCouponDiscount).toHaveBeenCalledWith(80, {
      id: 99,
      code: 'SAVE10',
      discountType: 'percent',
      discountValue: 10,
    });

    expect(result).toEqual({
      customerGroupCode: 'business',
      items: [
        {
          productId: 22,
          quantity: 2,
          original_unit_price: 50,
          unit_price: 40,
          discount_amount: 20,
          total_price: 80,
          applied_discount_id: 7,
          applied_discount_name: 'Wholesale Deal',
        },
      ],
      subtotal: 80,
      coupon: {
        id: 99,
        code: 'SAVE10',
        discountType: 'percent',
        discountValue: 10,
        discountAmount: 8,
      },
      grandTotal: 72,
    });
  });

  it('throws when pricing is not found for a product', async () => {
    mocks.mockGetPriceListContextForUser.mockResolvedValue({
      customerGroupId: 1,
      customerGroupCode: 'retail',
      priceListId: 10,
      currency: 'EUR',
    });

    mocks.mockResolveProductPrice.mockResolvedValue(null);

    await expect(
      buildCheckoutPreview({
        items: [{ productId: 123, quantity: 1 }],
        userId: 2,
      }),
    ).rejects.toThrow('Pricing not found for product 123');

    expect(mocks.mockResolveProductPrice).toHaveBeenCalledWith(123, 2);
  });

  it('calculates subtotal correctly for multiple items', async () => {
    mocks.mockGetPriceListContextForUser.mockResolvedValue({
      customerGroupId: 1,
      customerGroupCode: 'retail',
      priceListId: 10,
      currency: 'EUR',
    });

    mocks.mockResolveProductPrice
      .mockResolvedValueOnce({
        originalGross: 100,
        finalGross: 90,
        appliedDiscount: {
          id: 1,
          name: 'Discount A',
        },
      })
      .mockResolvedValueOnce({
        originalGross: 50,
        finalGross: 45,
        appliedDiscount: {
          id: 2,
          name: 'Discount B',
        },
      });

    mocks.mockValidateCouponForCheckout.mockResolvedValue({
      id: 5,
      code: 'WELCOME',
      discountType: 'fixed',
      discountValue: 10,
    });

    mocks.mockCalculateCouponDiscount.mockReturnValue(10);

    const result = await buildCheckoutPreview({
      items: [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 3 },
      ],
      userId: 10,
      couponCode: 'WELCOME',
    });

    expect(result.subtotal).toBe(315);
    expect(result.grandTotal).toBe(305);

    expect(result.items).toEqual([
      {
        productId: 1,
        quantity: 2,
        original_unit_price: 100,
        unit_price: 90,
        discount_amount: 20,
        total_price: 180,
        applied_discount_id: 1,
        applied_discount_name: 'Discount A',
      },
      {
        productId: 2,
        quantity: 3,
        original_unit_price: 50,
        unit_price: 45,
        discount_amount: 15,
        total_price: 135,
        applied_discount_id: 2,
        applied_discount_name: 'Discount B',
      },
    ]);
  });
});
