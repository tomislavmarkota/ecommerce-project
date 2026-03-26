// src/api/checkout.ts
import api from './axios';

export type CheckoutPreviewResponse = {
  customerGroupCode: string;
  items: Array<{
    productId: number;
    quantity: number;
    original_unit_price: number;
    unit_price: number;
    discount_amount: number;
    total_price: number;
    applied_discount_id: number | null;
    applied_discount_name: string | null;
  }>;
  subtotal: number;
  coupon: null | {
    id: number;
    code: string;
    discountType: 'fixed' | 'percent';
    discountValue: number;
    discountAmount: number;
  };
  grandTotal: number;
};

export type GuestCheckoutCustomer = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

export const fetchCheckoutPreview = async ({
  items,
  couponCode,
}: {
  items: { productId: number; quantity: number }[];
  couponCode?: string;
}) => {
  const res = await api.post('/checkout/preview', { items, couponCode });
  return res.data as CheckoutPreviewResponse;
};

export const createOrder = async ({
  items,
  couponCode,
  billingAddress,
  shippingAddress,
  paymentMethod,
  currency = 'EUR',
  guest,
}: {
  items: { productId: number; quantity: number }[];
  couponCode?: string;
  billingAddress?: string;
  shippingAddress?: string;
  paymentMethod?: string;
  currency?: string;
  guest?: GuestCheckoutCustomer;
}) => {
  const res = await api.post('/orders', {
    items,
    couponCode,
    billingAddress,
    shippingAddress,
    paymentMethod,
    currency,
    guest,
  });

  return res.data as { message: string; orderId: number; order: CheckoutPreviewResponse };
};
