import axios from 'axios';
import { ProductInput } from '../types/product';
import api from './axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// export const addProduct = async (product: ProductInput, token: string) => {
export const addProduct = async (product: ProductInput) => {
  const response = await axios.post(`${API_BASE}/api/products/add-product`, product, {
    headers: {
      Authorization: `Bearer ${product.categoryId}`,
      // Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export type FetchProductsParams = {
  pageIndex: number;
  pageSize: number;
  globalFilter?: string;
  sorting?: {
    id: string;
    desc: boolean;
  }[];
};

export type ProductRow = {
  id: number;
  name: string;
  price: number;
  stock: number;
  is_published: boolean;
  created_at: string;
  category_name: string | null;
  subcategory_name: string | null;
  thumbnail: string | null;
};

export type ProductsResponse = {
  data: ProductRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const fetchProducts = async ({
  pageIndex,
  pageSize,
  globalFilter = '',
  sorting = [],
}: FetchProductsParams): Promise<ProductsResponse> => {
  const sort = sorting[0];

  const params = {
    page: pageIndex + 1,
    limit: pageSize,
    search: globalFilter || undefined,
    sortBy: sort?.id || 'created_at',
    sortOrder: sort?.desc ? 'DESC' : 'ASC',
  };

  const res = await api.get('/products', { params });
  return res.data;
};
