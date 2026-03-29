import api from './axios';

export type PublicCatalogProduct = {
  id: number;
  name: string;
  description: string | null;
  stock: number;
  isPublished: boolean;
  categoryId: number | null;
  categoryName: string | null;
  thumbnail: string | null;
  pricing: {
    productId: number;
    currency: string;
    originalNet: number;
    originalGross: number;
    vatRate: number;
    discountPercent: number;
    discountAmountNet: number;
    discountAmountGross: number;
    finalNet: number;
    finalGross: number;
    source: string;
    companyId: number | null;
    customerType: 'b2c' | 'b2b';
  };
};

export type CatalogProductsResponse = {
  data: PublicCatalogProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
  const response = await api.get<CatalogProductsResponse>('/catalog/products', {
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
  const res = await api.get<PublicCatalogProduct>(`/catalog/products/${productId}`);
  return res.data;
};
