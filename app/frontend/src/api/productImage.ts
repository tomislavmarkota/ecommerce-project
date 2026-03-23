import api from './axios';

export type ProductImage = {
  id: number;
  product_id: number;
  image_url: string;
  thumbnail_url: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: number;
};

export const getProductImages = async (productId: number) => {
  const res = await api.get(`/product-images/product/${productId}`);
  return res.data as { data: ProductImage[] };
};

export const uploadProductImages = async (productId: number, files: File[]) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('images', file);
  });

  const res = await api.post(`/product-images/product/${productId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return res.data;
};

export const setPrimaryProductImage = async (productId: number, imageId: number) => {
  const res = await api.patch(`/product-images/product/${productId}/primary/${imageId}`);
  return res.data;
};

export const reorderProductImages = async (productId: number, items: Array<{ id: number; sortOrder: number }>) => {
  const res = await api.patch(`/product-images/product/${productId}/reorder`, { items });
  return res.data;
};

export const updateProductImageAltText = async (imageId: number, altText: string) => {
  const res = await api.patch(`/product-images/${imageId}/alt-text`, { altText });
  return res.data;
};

export const deleteProductImage = async (imageId: number) => {
  const res = await api.delete(`/product-images/${imageId}`);
  return res.data;
};
