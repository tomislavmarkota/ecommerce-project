import { ResultSetHeader } from 'mysql2';
import { pool } from '../config/db';
import { buildUserQuery } from '../utils/queryBuilder';

type UserQuery = {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

export const fetchUsers = async ({ page, limit, search, role, sortBy = 'id', sortDir = 'asc' }: UserQuery) => {
  const offset = (page - 1) * limit;

  const { where, params } = buildUserQuery({ search, role });

  // whitelist sortable columns
  const allowedSort: Record<string, string> = {
    id: 'u.id',
    name: 'u.name',
    email: 'u.email',
    role: 'r.name',
  };

  const safeSort = allowedSort[sortBy] || 'u.id';
  const safeSortDir = sortDir === 'desc' ? 'DESC' : 'ASC';

  const query = `
    SELECT
      u.id,
      u.name,
      u.email,
      r.name as role
    FROM users u
    JOIN roles r ON r.id = u.role_id
    ${where}
    ORDER BY ${safeSort} ${safeSortDir}
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM users u
    JOIN roles r ON r.id = u.role_id
    ${where}
  `;

  const [rows]: any = await pool.query(query, [...params, limit, offset]);
  const [count]: any = await pool.query(countQuery, params);

  return {
    data: rows,
    total: count[0].total,
  };
};

export const fetchUserById = async (id: number) => {
  const query = `
    SELECT
      u.id,
      u.name,
      u.email,
      u.city,
      u.role_id,
      r.name AS role
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = ?
  `;

  const [rows]: any = await pool.query(query, [id]);

  if (!rows.length) {
    return null;
  }

  return rows[0];
};
export const updateUser = async (id: number, data: any, currentUserRole: string) => {
  const filteredData: any = {};

  const allowedFields = ['name', 'email', 'city'];

  for (const key of Object.keys(data)) {
    if (allowedFields.includes(key)) {
      filteredData[key] = data[key];
    }

    console.log('Updating fields:', filteredData);
    console.log('currentUserRole:', currentUserRole);
    if (key === 'role_id' && currentUserRole === 'superAdmin') {
      filteredData.role_id = data.role_id;
    }
  }

  const fields = Object.keys(filteredData);

  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }

  const values = Object.values(filteredData);

  const setClause = fields.map((f) => `${f} = ?`).join(', ');

  const query = `
    UPDATE users
    SET ${setClause}
    WHERE id = ?
  `;

  await pool.query(query, [...values, id]);

  const [rows]: any = await pool.query(
    `SELECT u.*, r.name as role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?`,
    [id],
  );

  return rows[0];
};

export const deleteUsersByIds = async (ids: number[]) => {
  const placeholders = ids.map(() => '?').join(', ');

  const [result] = await pool.query<ResultSetHeader>(`DELETE FROM users WHERE id IN (${placeholders})`, ids);

  return {
    deletedCount: result.affectedRows,
  };
};
