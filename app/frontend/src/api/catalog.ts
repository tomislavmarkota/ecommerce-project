import api from './axios';

export type CatalogProductsResponse = {
  data: PublicCatalogProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type PublicCatalogProduct = {
  id: number;
  name: string;
  description: string | null;
  stock: number;
  thumbnail: string | null;
  retail_price_gross: number | null;
  business_price_gross: number | null;
};

export type FetchCatalogProductsParams = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number | null;
};

export const fetchCatalogProducts = async ({
  page = 1,
  limit = 12,
  search = '',
  categoryId = null,
}: FetchCatalogProductsParams) => {
  const response = await api.get('/catalog/products', {
    params: {
      page,
      limit,
      search: search || undefined,
      categoryId: categoryId ?? undefined,
    },
  });

  return response.data;
};

export const fetchCatalogProduct = async (productId: number) => {
  const res = await api.get(`${API_BASE}/api/catalog/products/${productId}`);
  return res.data as PublicCatalogProduct;
};
