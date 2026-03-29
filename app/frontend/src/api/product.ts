import api from './axios';

export type ProductPricingPayload = {
  priceNet: number;
  vatRate: number;
  priceGross: number;
};

export type ProductImage = {
  id: number;
  product_id: number;
  blob_name: string;
  image_url: string;
  thumbnail_blob_name: string | null;
  thumbnail_url: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: number;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
};

export type ProductCategoryAssignment = {
  categoryId: number;
  categoryName: string | null;
  isPrimary: boolean;
};

export type ProductRow = {
  id: number;
  name: string;
  stock: number;
  is_published: boolean;
  created_at: string;
  price_net: number;
  vat_rate: number;
  price_gross: number;
  category_name: string | null;
  thumbnail: string | null;
};

export type ProductsResponse = {
  data: ProductRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ProductDetailsResponse = {
  id: number;
  name: string;
  description: string | null;
  stock: number;
  categoryId: number | null;
  categoryIds: number[];
  primaryCategoryId: number | null;
  categories: ProductCategoryAssignment[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string | null;
  images: ProductImage[];
  pricing: ProductPricingPayload;
};

export type CreateProductPayload = {
  name: string;
  description: string;
  stock: number;
  categoryIds: number[];
  primaryCategoryId: number;
  isPublished: boolean;
  pricing: ProductPricingPayload;
};

export type UpdateProductPayload = {
  name: string;
  description: string;
  stock: number;
  categoryIds: number[];
  primaryCategoryId: number;
  isPublished: boolean;
  pricing: ProductPricingPayload;
};

export type UpdateProductPricingPayload = {
  pricing: ProductPricingPayload;
};

export type GetProductsParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
};

export const fetchProducts = async (params: GetProductsParams = {}): Promise<ProductsResponse> => {
  const response = await api.get<ProductsResponse>('/products', { params });
  return response.data;
};

export const fetchProductById = async (productId: number): Promise<ProductDetailsResponse> => {
  const response = await api.get<ProductDetailsResponse>(`/products/${productId}`);
  return response.data;
};

export const createProduct = async (payload: CreateProductPayload) => {
  const response = await api.post('/products/add', payload);
  return response.data;
};

export const updateProduct = async (productId: number, payload: UpdateProductPayload) => {
  const response = await api.put(`/products/${productId}`, payload);
  return response.data;
};

export const updateProductPricing = async (productId: number, payload: UpdateProductPricingPayload) => {
  const response = await api.patch(`/products/${productId}/pricing`, payload);
  return response.data;
};

export const deleteProductsBulk = async (ids: number[]) => {
  const response = await api.delete('/products/bulk', {
    data: { ids },
  });
  return response.data;
};
