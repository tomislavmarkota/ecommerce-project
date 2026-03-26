import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export type CategoryRow = RowDataPacket & {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  level: number;
  path: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const getCategoryById = async (id: number) => {
  const [rows] = await pool.query<CategoryRow[]>(
    `
    SELECT id, parent_id, name, slug, description, image_url, sort_order, level, path, is_active, created_at, updated_at
    FROM categories
    WHERE id = ?
    LIMIT 1
    `,
    [id],
  );

  return rows[0] ?? null;
};

export const getChildrenByParentId = async (parentId: number | null) => {
  const [rows] = await pool.query<CategoryRow[]>(
    `
    SELECT id, parent_id, name, slug, description, image_url, sort_order, level, path, is_active, created_at, updated_at
    FROM categories
    WHERE ${parentId === null ? 'parent_id IS NULL' : 'parent_id = ?'}
    ORDER BY sort_order ASC, name ASC
    `,
    parentId === null ? [] : [parentId],
  );

  return rows;
};

export const getCategoryTree = async () => {
  const [rows] = await pool.query<CategoryRow[]>(
    `
    SELECT id, parent_id, name, slug, description, image_url, sort_order, level, path, is_active, created_at, updated_at
    FROM categories
    WHERE is_active = 1
    ORDER BY path ASC
    `,
  );

  const byParent = new Map<number | null, any[]>();

  for (const row of rows) {
    const key = row.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push({ ...row, children: [] });
  }

  const build = (parentId: number | null): any[] => {
    const items = byParent.get(parentId) ?? [];
    return items.map((item) => ({
      ...item,
      children: build(item.id),
    }));
  };

  return build(null);
};

const buildPath = (parentPath: string | null, slug: string) => {
  return parentPath ? `${parentPath}/${slug}` : `/${slug}`;
};

export const createCategory = async ({
  name,
  parentId,
  description,
  imageUrl,
  sortOrder,
  isActive,
}: {
  name: string;
  parentId: number | null;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const slug = slugify(name);

    let parent: CategoryRow | null = null;
    if (parentId !== null) {
      const [parentRows] = await connection.query<CategoryRow[]>(`SELECT * FROM categories WHERE id = ? LIMIT 1`, [
        parentId,
      ]);

      parent = parentRows[0] ?? null;
      if (!parent) {
        throw new Error('Parent category not found');
      }
    }

    const level = parent ? parent.level + 1 : 0;
    const path = buildPath(parent?.path ?? null, slug);

    const [existing] = await connection.query<CategoryRow[]>(
      `
      SELECT id
      FROM categories
      WHERE ${parentId === null ? 'parent_id IS NULL' : 'parent_id = ?'}
        AND slug = ?
      LIMIT 1
      `,
      parentId === null ? [slug] : [parentId, slug],
    );

    if (existing.length > 0) {
      throw new Error('Category slug already exists under this parent');
    }

    const [result] = await connection.query<ResultSetHeader>(
      `
      INSERT INTO categories (
        parent_id, name, slug, description, image_url, sort_order, level, path, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [parentId, name, slug, description ?? null, imageUrl ?? null, sortOrder ?? 0, level, path, isActive ?? true],
    );

    await connection.commit();
    return await getCategoryById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateCategory = async ({
  id,
  name,
  description,
  imageUrl,
  sortOrder,
  isActive,
}: {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}) => {
  const existing = await getCategoryById(id);
  if (!existing) return null;

  const slug = slugify(name);
  const parent = existing.parent_id ? await getCategoryById(existing.parent_id) : null;
  const nextPath = buildPath(parent?.path ?? null, slug);

  await pool.query(
    `
    UPDATE categories
    SET
      name = ?,
      slug = ?,
      description = ?,
      image_url = ?,
      sort_order = ?,
      is_active = ?,
      path = ?
    WHERE id = ?
    `,
    [name, slug, description ?? null, imageUrl ?? null, sortOrder ?? 0, isActive ?? true, nextPath, id],
  );

  return await getCategoryById(id);
};

export const moveCategory = async ({ id, newParentId }: { id: number; newParentId: number | null }) => {
  const category = await getCategoryById(id);
  if (!category) return null;

  if (newParentId === id) {
    throw new Error('Category cannot be its own parent');
  }

  let newParent: CategoryRow | null = null;
  if (newParentId !== null) {
    newParent = await getCategoryById(newParentId);
    if (!newParent) {
      throw new Error('New parent category not found');
    }

    if (newParent.path.startsWith(`${category.path}/`)) {
      throw new Error('Cannot move category under its own descendant');
    }
  }

  const newLevel = newParent ? newParent.level + 1 : 0;
  const newPath = buildPath(newParent?.path ?? null, category.slug);
  const oldPath = category.path;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE categories
      SET parent_id = ?, level = ?, path = ?
      WHERE id = ?
      `,
      [newParentId, newLevel, newPath, id],
    );

    const [descendants] = await connection.query<CategoryRow[]>(
      `
      SELECT id, path, level
      FROM categories
      WHERE path LIKE ?
        AND id != ?
      `,
      [`${oldPath}/%`, id],
    );

    for (const descendant of descendants) {
      const replacedPath = descendant.path.replace(oldPath, newPath);
      const relativeDepth = replacedPath.split('/').filter(Boolean).length - 1;

      await connection.query(
        `
        UPDATE categories
        SET path = ?, level = ?
        WHERE id = ?
        `,
        [replacedPath, relativeDepth, descendant.id],
      );
    }

    await connection.commit();
    return await getCategoryById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deleteCategory = async (id: number) => {
  const [children] = await pool.query<RowDataPacket[]>(`SELECT id FROM categories WHERE parent_id = ? LIMIT 1`, [id]);

  if (children.length > 0) {
    throw new Error('Cannot delete category that has children');
  }

  const [products] = await pool.query<RowDataPacket[]>(
    `SELECT product_id FROM product_categories WHERE category_id = ? LIMIT 1`,
    [id],
  );

  if (products.length > 0) {
    throw new Error('Cannot delete category assigned to products');
  }

  const [result] = await pool.query<ResultSetHeader>(`DELETE FROM categories WHERE id = ?`, [id]);

  return result.affectedRows > 0;
};
