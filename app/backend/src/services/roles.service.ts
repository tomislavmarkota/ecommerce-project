import { pool } from '../config/db';

export const getRoles = async () => {
  const [rows]: any = await pool.query('SELECT id, name FROM roles ORDER BY id');

  return rows;
};
