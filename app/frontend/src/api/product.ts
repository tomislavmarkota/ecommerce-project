import api from './axios';

export type ProductRow = {
  id: number;
  name: string;
  stock: number;
  is_published: boolean;
  created_at: string;
  category_name: string | null;
  subcategory_name: string | null;
  thumbnail: string | null;
  retail_price_gross: number | null;
  business_price_gross: number | null;
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

export type ProductDetailsResponse = {
  id: number;
  name: string;
  description: string | null;
  stock: number;
  categoryId: number | null;
  subcategoryId: number | null;
  isPublished: boolean;
  createdAt: string;
  images: string[];
  pricing: {
    retail: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    } | null;
    business: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    } | null;
  };
};

export type UpdateProductPricingPayload = {
  pricing: {
    retail: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
    business: {
      priceNet: number;
      vatRate: number;
      priceGross: number;
    };
  };
};

export type ProductPricingPayload = {
  retail: {
    priceNet: number;
    vatRate: number;
    priceGross: number;
  };
  business: {
    priceNet: number;
    vatRate: number;
    priceGross: number;
  };
};

export type CreateProductPayload = {
  name: string;
  description: string;
  stock: number;
  categoryId: number;
  isPublished: boolean;
  pricing: ProductPricingPayload;
};

export type UpdateProductPayload = {
  name: string;
  description: string;
  stock: number;
  categoryId: number;
  isPublished: boolean;
  pricing: ProductPricingPayload;
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
  const response = await api.post('/products', payload);
  return response.data;
};

export const updateProduct = async (id: number, payload: UpdateProductPayload) => {
  const response = await api.put(`/products/${id}`, payload);
  return response.data;
};

export const fetchProductById = async (id: number) => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

export const updateProductPricing = async (productId: number, payload: UpdateProductPricingPayload) => {
  const res = await api.patch(`/products/${productId}/pricing`, payload);
  return res.data;
};

export const deleteProducts = async (ids: number[]) => {
  const res = await api.delete('/products/bulk', {
    data: { ids },
  });

  return res.data as {
    message: string;
    deletedCount: number;
    ids: number[];
  };
};
