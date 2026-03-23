import api from './axios';

export type CategoryOption = {
  id: number;
  name: string;
  slug: string;
};

export type SubcategoryOption = {
  id: number;
  category_id: number;
  name: string;
  slug: string;
};

export const fetchCategories = async () => {
  const res = await api.get('/categories');
  return res.data as CategoryOption[];
};

export const fetchSubcategories = async (categoryId: number) => {
  const res = await api.get('/subcategories', {
    params: { categoryId },
  });

  return res.data as SubcategoryOption[];
};
