import api from './axios';

export type CheckoutPreviewResponse = {
  customerType: 'b2c' | 'b2b';
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
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const url = `${API_BASE}/api`;
export const fetchCheckoutPreview = async ({
  items,
  couponCode,
}: {
  items: { productId: number; quantity: number }[];
  couponCode?: string;
}) => {
  const res = await api.post(`${url}/checkout/preview`, {
    items,
    couponCode,
  });

  return res.data as CheckoutPreviewResponse;
};

export const createOrder = async ({
  items,
  couponCode,
  billingAddress,
  shippingAddress,
  paymentMethod,
  currency = 'EUR',
}: {
  items: { productId: number; quantity: number }[];
  couponCode?: string;
  billingAddress?: string;
  shippingAddress?: string;
  paymentMethod?: string;
  currency?: string;
}) => {
  const res = await api.post(`${url}/orders`, {
    items,
    couponCode,
    billingAddress,
    shippingAddress,
    paymentMethod,
    currency,
  });

  return res.data as {
    message: string;
    orderId: number;
    order: CheckoutPreviewResponse;
  };
};
