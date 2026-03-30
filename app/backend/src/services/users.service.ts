import { ResultSetHeader, RowDataPacket } from 'mysql2';
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

type CompanyRow = RowDataPacket & {
  id: number;
  name: string;
};

const findCompanyByName = async (companyName: string): Promise<CompanyRow | null> => {
  const [rows] = await pool.query<CompanyRow[]>(
    `
      SELECT id, name
      FROM companies
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
      LIMIT 1
    `,
    [companyName],
  );

  return rows[0] ?? null;
};

const createCompanyForUserUpdate = async (companyName: string, vatNumber?: string | null): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO companies (
        name,
        vat_number,
        is_active
      )
      VALUES (?, ?, 1)
    `,
    [companyName, vatNumber ?? null],
  );

  return result.insertId;
};

const customerTypeExpr = `
  CASE
    WHEN u.company_id IS NOT NULL THEN 'b2b'
    ELSE 'b2c'
  END
`;

export const updateUser = async (id: number, data: any, currentUserRole: string) => {
  const filteredData: any = {};
  const allowedFields = [
    'name',
    'email',
    'city',
    'address',
    'postal_code',
    'country',
    'delivery_address',
    'delivery_city',
    'delivery_postal_code',
    'delivery_country',
    'vat_number',
  ];

  for (const key of Object.keys(data)) {
    if (allowedFields.includes(key)) {
      filteredData[key] = typeof data[key] === 'string' ? data[key].trim() || null : data[key];
    }

    if (key === 'role_id' && currentUserRole === 'superAdmin') {
      filteredData.role_id = Number(data.role_id);
    }
  }

  const rawCompanyName = typeof data.company_name === 'string' ? data.company_name.trim() : '';

  if (rawCompanyName) {
    const existingCompany = await findCompanyByName(rawCompanyName);

    if (existingCompany) {
      filteredData.company_id = existingCompany.id;
    } else {
      const newCompanyId = await createCompanyForUserUpdate(
        rawCompanyName,
        typeof data.vat_number === 'string' ? data.vat_number.trim() : null,
      );
      filteredData.company_id = newCompanyId;
    }
  } else if (data.customerType === 'b2c' || data.company_name === null) {
    filteredData.company_id = null;
  }

  const fields = Object.keys(filteredData);

  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }

  const values = Object.values(filteredData);
  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const query = `UPDATE users SET ${setClause} WHERE id = ?`;

  await pool.query(query, [...values, id]);

  const [rows]: any = await pool.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.address,
        u.city,
        u.postal_code,
        u.country,
        u.delivery_address,
        u.delivery_city,
        u.delivery_postal_code,
        u.delivery_country,
        u.created_at,
        u.role_id,
        u.vat_number,
        u.company_id,
        c.name AS companyName,
        r.name AS role,
        ${customerTypeExpr} AS customerType
      FROM users u
      LEFT JOIN companies c ON c.id = u.company_id
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = ?
    `,
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

export const fetchUsers = async ({ page, limit, search, role, sortBy = 'id', sortDir = 'asc' }: UserQuery) => {
  const offset = (page - 1) * limit;
  const { where, params } = buildUserQuery({ search, role });

  const allowedSort: Record<string, string> = {
    id: 'u.id',
    name: 'u.name',
    email: 'u.email',
    role: 'r.name',
    customerType: customerTypeExpr,
    companyName: 'c.name',
  };

  const safeSort = allowedSort[sortBy] || 'u.id';
  const safeSortDir = sortDir === 'desc' ? 'DESC' : 'ASC';

  const query = `
    SELECT
      u.id,
      u.name,
      u.email,
      r.name AS role,
      ${customerTypeExpr} AS customerType,
      u.company_id AS company_id,
      c.name AS companyName
    FROM users u
    LEFT JOIN companies c ON c.id = u.company_id
    JOIN roles r ON r.id = u.role_id
    ${where}
    ORDER BY ${safeSort} ${safeSortDir}
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM users u
    LEFT JOIN companies c ON c.id = u.company_id
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
      u.phone,
      u.address,
      u.city,
      u.postal_code,
      u.country,
      u.delivery_address,
      u.delivery_city,
      u.delivery_postal_code,
      u.delivery_country,
      u.created_at,
      u.role_id,
      u.vat_number,
      u.company_id,
      c.name AS companyName,
      r.name AS role,
      CASE
        WHEN u.company_id IS NOT NULL THEN 'b2b'
        ELSE 'b2c'
      END AS customerType
    FROM users u
    LEFT JOIN companies c ON c.id = u.company_id
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = ?
    LIMIT 1
  `;

  const [rows]: any = await pool.query(query, [id]);

  if (!rows.length) {
    return null;
  }

  return rows[0];
};
