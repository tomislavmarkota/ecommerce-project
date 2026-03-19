import api from './axios';

export type PublicCatalogProduct = {
  id: number;
  name: string;
  description: string | null;
  stock: number;
  isPublished: boolean;
  categoryId: number | null;
  subcategoryId: number | null;
  categoryName: string | null;
  subcategoryName: string | null;
  thumbnail: string | null;
  pricing: {
    productId: number;
    customerType: 'b2c' | 'b2b';
    currency: string;
    originalNet: number;
    originalGross: number;
    vatRate: number;
    discountAmountNet: number;
    discountAmountGross: number;
    finalNet: number;
    finalGross: number;
    appliedDiscount: null | {
      id: number;
      name: string;
      type: 'percentage' | 'fixed';
      value: number;
    };
  };
};

export type CatalogProductsResponse = {
  data: PublicCatalogProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const fetchCatalogProducts = async ({
  page = 1,
  limit = 12,
  search = '',
}: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const res = await api.get(`${API_BASE}/api/catalog/products`, {
    params: {
      page,
      limit,
      search: search || undefined,
    },
  });

  return res.data as CatalogProductsResponse;
};

export const fetchCatalogProduct = async (productId: number) => {
  const res = await api.get(`${API_BASE}/api/catalog/products/${productId}`);
  return res.data as PublicCatalogProduct;
};
