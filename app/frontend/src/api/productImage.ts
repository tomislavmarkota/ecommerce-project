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

type UploadFailedFile = {
  fileName: string;
  message?: string;
};

type UploadProductImagesResult = {
  uploadedCount: number;
  failedFiles: UploadFailedFile[];
};

export const getProductImages = async (productId: number) => {
  const res = await api.get(`/product-images/product/${productId}`);
  return res.data as { data: ProductImage[] };
};

export const uploadProductImages = async (
  productId: number,
  files: File[],
  onProgress?: (file: File, progress: number) => void,
): Promise<UploadProductImagesResult> => {
  const results = await Promise.all(
    files.map(async (file) => {
      const formData = new FormData();
      formData.append('images', file);

      try {
        await api.post(`/product-images/product/${productId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) return;

            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress?.(file, progress);
          },
        });

        return {
          success: true as const,
          file,
        };
      } catch (error: any) {
        return {
          success: false as const,
          file,
          message: error?.response?.data?.message || 'Upload failed',
        };
      }
    }),
  );

  return {
    uploadedCount: results.filter((result) => result.success).length,
    failedFiles: results
      .filter((result) => !result.success)
      .map((result) => ({
        fileName: result.file.name,
        message: result.message,
      })),
  };
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
