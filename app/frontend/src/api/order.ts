import api from './axios';

export type AdminOrder = {
  id: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_group_code: string | null;
  status: string;
  payment_method: string | null;
  currency: string;
  subtotal: number;
  discount_total: number;
  grand_total: number;
  created_at: string;
  total_items: number;
};

export type OrdersResponse = {
  data: AdminOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const fetchOrders = async ({
  page = 1,
  limit = 10,
  search = '',
  sortBy = 'created_at',
  sortOrder = 'DESC',
}: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}) => {
  const res = await api.get(`${API_BASE}/api/orders`, {
    params: {
      page,
      limit,
      search: search || undefined,
      sortBy,
      sortOrder,
    },
  });

  return res.data as OrdersResponse;
};

export const fetchOrderById = async (id: number) => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};
