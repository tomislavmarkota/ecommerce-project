import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockCreateOrderFromCheckout: vi.fn(),
}));

vi.mock('../../middleware/admin.middleware.ts', () => ({
  requireAdmin: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: 'Missing token' });
    }

    req.user = { id: 1, role: 'customer' };
    next();
  },
}));

vi.mock('../../services/orderService/order.service', () => ({
  createOrderFromCheckout: mocks.mockCreateOrderFromCheckout,
}));

import app from '../../app';

describe('POST /api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when authorization header is missing', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        items: [{ productId: 1, quantity: 2 }],
      });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Missing token' });
  });

  it('returns 400 when items are missing', async () => {
    const res = await request(app).post('/api/orders').set('Authorization', 'Bearer valid-token').send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      message: 'Valid items are required',
    });
  });

  it('returns 400 when items are invalid', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid-token')
      .send({
        items: [{ productId: 'abc', quantity: 0 }],
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      message: 'Valid items are required',
    });
  });

  it('returns 201 when order is created successfully', async () => {
    mocks.mockCreateOrderFromCheckout.mockResolvedValue({
      orderId: 555,
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
        ],
        subtotal: 180,
        coupon: {
          id: 99,
          code: 'SAVE10',
          discountType: 'percent',
          discountValue: 10,
          discountAmount: 18,
        },
        grandTotal: 162,
      },
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid-token')
      .send({
        items: [{ productId: 10, quantity: 2 }],
        couponCode: 'SAVE10',
        billingAddress: 'Billing Street 1',
        shippingAddress: 'Shipping Street 2',
        paymentMethod: 'card',
        currency: 'EUR',
      });

    expect(res.status).toBe(201);

    expect(mocks.mockCreateOrderFromCheckout).toHaveBeenCalledWith({
      userId: 1,
      items: [{ productId: 10, quantity: 2 }],
      couponCode: 'SAVE10',
      billingAddress: 'Billing Street 1',
      shippingAddress: 'Shipping Street 2',
      paymentMethod: 'card',
      currency: 'EUR',
    });

    expect(res.body).toEqual({
      message: 'Order created successfully',
      orderId: 555,
      order: {
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
        coupon: {
          id: 99,
          code: 'SAVE10',
          discountType: 'percent',
          discountValue: 10,
          discountAmount: 18,
        },
        grandTotal: 162,
      },
    });
  });

  it('returns 500 when order service throws', async () => {
    mocks.mockCreateOrderFromCheckout.mockRejectedValue(new Error('Order creation failed'));

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid-token')
      .send({
        items: [{ productId: 10, quantity: 1 }],
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      message: 'Order creation failed',
    });
  });
});
