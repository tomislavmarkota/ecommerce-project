import api from './axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const url = `${API_BASE}/api/products`;

export type ProductRow = {
  id: number;
  name: string;
  stock: number;
  is_published: boolean;
  created_at: string;
  category_name: string | null;
  subcategory_name: string | null;
  thumbnail: string | null;
  b2c_price_gross: number | null;
  b2b_price_gross: number | null;
};

export type ProductsResponse = {
  data: ProductRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

export type CreateProductPayload = {
  name: string;
  description: string;
  stock: number;
  categoryId: number;
  subcategoryId: number | null;
  images: string[];
  isPublished: boolean;
  pricing: {
    currency: string;
    b2c: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
    b2b: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
  };
};

export type UpdateProductPricingPayload = {
  pricing: {
    currency: string;
    b2c: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
    b2b: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
  };
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

export const createProduct = async (payload: CreateProductPayload) => {
  const res = await api.post(`${url}/add`, payload);
  return res.data;
};

export const updateProductPricing = async (productId: number, payload: UpdateProductPricingPayload) => {
  const res = await api.patch(`${url}/products/${productId}/pricing`, payload);
  return res.data;
};

export const deleteProducts = async (ids: number[]) => {
  const res = await api.delete(`${url}/products/bulk`, {
    data: { ids },
  });

  return res.data as {
    message: string;
    deletedCount: number;
    ids: number[];
  };
};
