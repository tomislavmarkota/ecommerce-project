import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/admin.middleware';
import { createOrderFromCheckout, getOrdersList } from '../services/orderService/order.service';

const ALLOWED_SORT_FIELDS = new Set(['id', 'created_at', 'status', 'grand_total', 'subtotal']);

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { items, couponCode, billingAddress, shippingAddress, paymentMethod, currency } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Valid items are required' });
    }

    const invalidItem = items.some(
      (item) =>
        !Number.isInteger(Number(item.productId)) ||
        Number(item.productId) <= 0 ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) <= 0,
    );

    if (invalidItem) {
      return res.status(400).json({ message: 'Valid items are required' });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await createOrderFromCheckout({
      userId: req.user.id,
      items: items.map((item: any) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
      })),
      couponCode,
      billingAddress,
      shippingAddress,
      paymentMethod,
      currency,
    });

    return res.status(201).json({
      message: 'Order created successfully',
      orderId: result.orderId,
      order: result.preview,
    });
  } catch (err: any) {
    console.error('Create order error:', err);
    return res.status(500).json({ message: err.message || 'Order creation failed' });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const search = rawSearch || '';

    const rawSortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'created_at';
    const sortBy = ALLOWED_SORT_FIELDS.has(rawSortBy) ? rawSortBy : 'created_at';

    const rawSortOrder = typeof req.query.sortOrder === 'string' ? req.query.sortOrder.toUpperCase() : 'DESC';
    const sortOrder = rawSortOrder === 'ASC' ? 'ASC' : 'DESC';

    const result = await getOrdersList({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('Get orders error:', err);
    return res.status(500).json({ message: 'Failed to fetch orders' });
  }
};
