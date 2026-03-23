import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2/promise';

type CategoryRow = RowDataPacket & {
  id: number;
  name: string;
  slug: string;
};

type SubcategoryRow = RowDataPacket & {
  id: number;
  category_id: number;
  name: string;
  slug: string;
};

export const getActiveCategories = async () => {
  const [rows] = await pool.query<CategoryRow[]>(
    `
      SELECT id, name, slug
      FROM categories
      WHERE is_active = 1
      ORDER BY name ASC
    `,
  );

  return rows;
};

export const getActiveSubcategoriesByCategoryId = async (categoryId: number) => {
  const [rows] = await pool.query<SubcategoryRow[]>(
    `
      SELECT id, category_id, name, slug
      FROM subcategories
      WHERE is_active = 1
        AND category_id = ?
      ORDER BY name ASC
    `,
    [categoryId],
  );

  return rows;
};
