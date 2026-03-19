import { Response } from 'express';
import { AuthRequest } from '../middleware/admin.middleware';
import { createOrderFromCheckout } from '../services/order.service';

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    const couponCode = typeof req.body.couponCode === 'string' ? req.body.couponCode.trim() : '';

    const items = rawItems
      .map((item: any) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
      }))
      .filter(
        (item: { productId: number; quantity: number }) =>
          Number.isInteger(item.productId) &&
          item.productId > 0 &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0,
      );

    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!items.length) {
      return res.status(400).json({ message: 'Valid items are required' });
    }

    const result = await createOrderFromCheckout({
      userId: req.user.id,
      items,
      couponCode: couponCode || undefined,
      billingAddress: typeof req.body.billingAddress === 'string' ? req.body.billingAddress : null,
      shippingAddress: typeof req.body.shippingAddress === 'string' ? req.body.shippingAddress : null,
      paymentMethod: typeof req.body.paymentMethod === 'string' ? req.body.paymentMethod : null,
      currency: typeof req.body.currency === 'string' ? req.body.currency : 'EUR',
    });

    return res.status(201).json({
      message: 'Order created successfully',
      orderId: result.orderId,
      order: result.preview,
    });
  } catch (err: any) {
    console.error('Create order error:', err);
    return res.status(500).json({
      message: err?.message || 'Failed to create order',
    });
  }
};
