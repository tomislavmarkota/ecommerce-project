import api from './axios';

export type CategoryTreeNode = {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  level: number;
  path: string;
  is_active: boolean | number;
  created_at: string;
  updated_at: string;
  children: CategoryTreeNode[];
};

export type CategoryDetails = {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  level: number;
  path: string;
  is_active: boolean | number;
  created_at: string;
  updated_at: string;
};

export type CreateCategoryPayload = {
  name: string;
  parentId: number | null;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateCategoryPayload = {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type MoveCategoryPayload = {
  parentId: number | null;
};

export type DeleteCategoryResponse = {
  message: string;
};

export const fetchCategoryTree = async (): Promise<CategoryTreeNode[]> => {
  const response = await api.get('/categories/tree');
  return response.data;
};

export const fetchCategoryById = async (id: number): Promise<CategoryDetails> => {
  const response = await api.get(`/categories/${id}`);
  return response.data;
};

export const createCategory = async (payload: CreateCategoryPayload): Promise<CategoryDetails> => {
  const response = await api.post('/categories', payload);
  return response.data;
};

export const updateCategory = async (id: number, payload: UpdateCategoryPayload): Promise<CategoryDetails> => {
  const response = await api.put(`/categories/${id}`, payload);
  return response.data;
};

export const moveCategory = async (id: number, payload: MoveCategoryPayload): Promise<CategoryDetails> => {
  const response = await api.patch(`/categories/${id}/move`, payload);
  return response.data;
};

export const deleteCategory = async (id: number): Promise<DeleteCategoryResponse> => {
  const response = await api.delete(`/categories/${id}`);
  return response.data;
};
