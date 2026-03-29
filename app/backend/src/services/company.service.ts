import { pool } from '../config/db';

export const fetchCompanies = async () => {
  const [rows]: any = await pool.query(`
    SELECT id, name
    FROM companies
    WHERE is_active = 1
    ORDER BY name ASC
  `);

  return rows;
};
