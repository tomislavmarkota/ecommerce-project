// src/controllers/orderController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createOrderFromCheckout,
  getOrderById as getOrderByIdService,
  getOrdersList,
} from '../services/orderService/order.service';

const ALLOWED_SORT_FIELDS = new Set(['id', 'created_at', 'status', 'grand_total', 'subtotal']);

const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { items, couponCode, billingAddress, shippingAddress, paymentMethod, currency, guest } = req.body;

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

    const isGuest = !req.user?.id;
    const guestEmail = normalizeEmail(guest?.email);

    if (isGuest) {
      if (!guestEmail || typeof guest?.firstName !== 'string' || typeof guest?.lastName !== 'string') {
        return res.status(400).json({ message: 'Guest customer details are required' });
      }
    }

    const result = await createOrderFromCheckout({
      userId: req.user?.id ?? null,
      items: items.map((item: any) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
      })),
      couponCode: typeof couponCode === 'string' ? couponCode.trim() : undefined,
      billingAddress: typeof billingAddress === 'string' ? billingAddress.trim() : null,
      shippingAddress: typeof shippingAddress === 'string' ? shippingAddress.trim() : null,
      paymentMethod: typeof paymentMethod === 'string' ? paymentMethod.trim() : null,
      currency: typeof currency === 'string' ? currency.trim().toUpperCase() : 'EUR',
      guest: isGuest
        ? {
            email: guestEmail,
            firstName: guest.firstName.trim(),
            lastName: guest.lastName.trim(),
            phone: typeof guest?.phone === 'string' ? guest.phone.trim() : null,
          }
        : null,
    });

    return res.status(201).json({
      message: 'Order created successfully',
      orderId: result.orderId,
      order: result.preview,
    });
  } catch (err: any) {
    console.error('Create order error:', err);
    return res.status(500).json({ message: 'Order creation failed' });
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

    const result = await getOrdersList({ page, limit, search, sortBy, sortOrder });
    return res.status(200).json(result);
  } catch (err) {
    console.error('Get orders error:', err);
    return res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Valid order id is required' });
    }

    const order = await getOrderByIdService(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.status(200).json(order);
  } catch (err) {
    console.error('Get order by id error:', err);
    return res.status(500).json({ message: 'Failed to fetch order' });
  }
};
