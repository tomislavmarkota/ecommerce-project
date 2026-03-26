import { Response } from 'express';
import { buildCheckoutPreview } from '../services/checkoutService/checkout.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const getCheckoutPreview = async (req: AuthRequest, res: Response) => {
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

    if (!items.length) {
      return res.status(400).json({ message: 'Valid items are required' });
    }

    const result = await buildCheckoutPreview({
      items,
      userId: req.user?.id ?? null,
      couponCode: couponCode || undefined,
    });

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Checkout preview error:', err);
    return res.status(500).json({
      message: err?.message || 'Failed to calculate checkout preview',
    });
  }
};
