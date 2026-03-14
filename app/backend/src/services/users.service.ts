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

export const fetchUsers = async ({ page, limit, search, role, sortBy = 'u.id', sortDir = 'asc' }: UserQuery) => {
  const offset = (page - 1) * limit;

  const { where, params } = buildUserQuery({ search, role });

  const query = `
    SELECT
      u.id,
      u.name,
      u.email,
      r.name as role
    FROM users u
    JOIN roles r ON r.id = u.role_id
    ${where}
    ORDER BY ${sortBy} ${sortDir.toUpperCase()}
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
