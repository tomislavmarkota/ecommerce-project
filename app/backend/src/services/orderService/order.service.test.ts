import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrderFromCheckout } from './order.service';

const mocks = vi.hoisted(() => ({
  mockBuildCheckoutPreview: vi.fn(),
  mockGetConnection: vi.fn(),
  mockBeginTransaction: vi.fn(),
  mockQuery: vi.fn(),
  mockCommit: vi.fn(),
  mockRollback: vi.fn(),
  mockRelease: vi.fn(),
}));

vi.mock('../checkoutService/checkout.service', () => ({
  buildCheckoutPreview: mocks.mockBuildCheckoutPreview,
}));

vi.mock('../../config/db', () => ({
  pool: {
    getConnection: mocks.mockGetConnection,
  },
}));

describe('order.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.mockGetConnection.mockResolvedValue({
      beginTransaction: mocks.mockBeginTransaction,
      query: mocks.mockQuery,
      commit: mocks.mockCommit,
      rollback: mocks.mockRollback,
      release: mocks.mockRelease,
    });
  });

  it('creates order and order items successfully', async () => {
    mocks.mockBuildCheckoutPreview.mockResolvedValue({
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
        {
          productId: 20,
          quantity: 1,
          original_unit_price: 50,
          unit_price: 45,
          discount_amount: 5,
          total_price: 45,
          applied_discount_id: 2,
          applied_discount_name: 'Promo',
        },
      ],
      subtotal: 225,
      coupon: {
        id: 99,
        code: 'SAVE10',
        discountType: 'percent',
        discountValue: 10,
        discountAmount: 10,
      },
      grandTotal: 215,
    });

    mocks.mockQuery
      .mockResolvedValueOnce([{ insertId: 777 }])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const result = await createOrderFromCheckout({
      userId: 5,
      items: [
        { productId: 10, quantity: 2 },
        { productId: 20, quantity: 1 },
      ],
      couponCode: 'SAVE10',
      billingAddress: 'Billing address',
      shippingAddress: 'Shipping address',
      paymentMethod: 'card',
      currency: 'EUR',
    });

    expect(mocks.mockBeginTransaction).toHaveBeenCalled();

    expect(mocks.mockBuildCheckoutPreview).toHaveBeenCalledWith({
      items: [
        { productId: 10, quantity: 2 },
        { productId: 20, quantity: 1 },
      ],
      userId: 5,
      couponCode: 'SAVE10',
    });

    expect(mocks.mockQuery).toHaveBeenCalledTimes(3);

    expect(mocks.mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('INSERT INTO orders'), [
      5,
      99,
      'SAVE10',
      'retail',
      'EUR',
      'pending',
      'Billing address',
      'Shipping address',
      'card',
      225,
      35,
      0,
      0,
      215,
    ]);

    expect(mocks.mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO order_items'), [
      777,
      10,
      2,
      100,
      90,
      20,
      180,
      1,
      'Spring Sale',
    ]);

    expect(mocks.mockQuery).toHaveBeenNthCalledWith(3, expect.stringContaining('INSERT INTO order_items'), [
      777,
      20,
      1,
      50,
      45,
      5,
      45,
      2,
      'Promo',
    ]);

    expect(mocks.mockCommit).toHaveBeenCalled();
    expect(mocks.mockRollback).not.toHaveBeenCalled();
    expect(mocks.mockRelease).toHaveBeenCalled();

    expect(result).toEqual({
      orderId: 777,
      preview: {
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
          {
            productId: 20,
            quantity: 1,
            original_unit_price: 50,
            unit_price: 45,
            discount_amount: 5,
            total_price: 45,
            applied_discount_id: 2,
            applied_discount_name: 'Promo',
          },
        ],
        subtotal: 225,
        coupon: {
          id: 99,
          code: 'SAVE10',
          discountType: 'percent',
          discountValue: 10,
          discountAmount: 10,
        },
        grandTotal: 215,
      },
    });
  });

  it('creates order without coupon', async () => {
    mocks.mockBuildCheckoutPreview.mockResolvedValue({
      customerGroupCode: 'business',
      items: [
        {
          productId: 11,
          quantity: 1,
          original_unit_price: 80,
          unit_price: 80,
          discount_amount: 0,
          total_price: 80,
          applied_discount_id: null,
          applied_discount_name: null,
        },
      ],
      subtotal: 80,
      coupon: null,
      grandTotal: 80,
    });

    mocks.mockQuery.mockResolvedValueOnce([{ insertId: 123 }]).mockResolvedValueOnce([{}]);

    const result = await createOrderFromCheckout({
      userId: 8,
      items: [{ productId: 11, quantity: 1 }],
      currency: 'EUR',
    });

    expect(mocks.mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('INSERT INTO orders'), [
      8,
      null,
      null,
      'business',
      'EUR',
      'pending',
      null,
      null,
      null,
      80,
      0,
      0,
      0,
      80,
    ]);

    expect(result.orderId).toBe(123);
    expect(mocks.mockCommit).toHaveBeenCalled();
  });

  it('rolls back transaction when order insert fails', async () => {
    mocks.mockBuildCheckoutPreview.mockResolvedValue({
      customerGroupCode: 'retail',
      items: [],
      subtotal: 0,
      coupon: null,
      grandTotal: 0,
    });

    mocks.mockQuery.mockRejectedValue(new Error('DB error'));

    await expect(
      createOrderFromCheckout({
        userId: 1,
        items: [{ productId: 1, quantity: 1 }],
      }),
    ).rejects.toThrow('DB error');

    expect(mocks.mockBeginTransaction).toHaveBeenCalled();
    expect(mocks.mockRollback).toHaveBeenCalled();
    expect(mocks.mockCommit).not.toHaveBeenCalled();
    expect(mocks.mockRelease).toHaveBeenCalled();
  });

  it('rolls back transaction when item insert fails', async () => {
    mocks.mockBuildCheckoutPreview.mockResolvedValue({
      customerGroupCode: 'retail',
      items: [
        {
          productId: 10,
          quantity: 1,
          original_unit_price: 100,
          unit_price: 90,
          discount_amount: 10,
          total_price: 90,
          applied_discount_id: 1,
          applied_discount_name: 'Sale',
        },
      ],
      subtotal: 90,
      coupon: null,
      grandTotal: 90,
    });

    mocks.mockQuery.mockResolvedValueOnce([{ insertId: 555 }]).mockRejectedValueOnce(new Error('Item insert failed'));

    await expect(
      createOrderFromCheckout({
        userId: 2,
        items: [{ productId: 10, quantity: 1 }],
      }),
    ).rejects.toThrow('Item insert failed');

    expect(mocks.mockRollback).toHaveBeenCalled();
    expect(mocks.mockCommit).not.toHaveBeenCalled();
    expect(mocks.mockRelease).toHaveBeenCalled();
  });
});
