import bcrypt from 'bcrypt';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';

type RegisterB2BInput = {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  company_name: string;
  vat_number: string;
};

type ExistingUserRow = RowDataPacket & {
  id: number;
};

type ExistingCompanyRow = RowDataPacket & {
  id: number;
  name: string;
  vat_number: string | null;
  customer_group_id: number | null;
};

type CustomerGroupRow = RowDataPacket & {
  id: number;
  code: string;
};

const createHttpError = (statusCode: number, message: string) => {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
};

const findB2BCustomerGroupId = async (): Promise<number | null> => {
  const [rows] = await pool.query<CustomerGroupRow[]>(
    `
      SELECT id, code
      FROM customer_groups
      WHERE code IN ('b2b', 'business')
      ORDER BY FIELD(code, 'b2b', 'business')
      LIMIT 1
    `,
  );

  return rows[0]?.id ?? null;
};

const findCompanyByNameOrVat = async (companyName: string, vatNumber: string): Promise<ExistingCompanyRow | null> => {
  const [rows] = await pool.query<ExistingCompanyRow[]>(
    `
      SELECT id, name, vat_number, customer_group_id
      FROM companies
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
         OR (vat_number IS NOT NULL AND vat_number = ?)
      LIMIT 1
    `,
    [companyName, vatNumber],
  );

  return rows[0] ?? null;
};

const createCompany = async ({
  name,
  vatNumber,
  customerGroupId,
}: {
  name: string;
  vatNumber: string;
  customerGroupId: number | null;
}): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO companies (
        name,
        vat_number,
        customer_group_id,
        is_active
      )
      VALUES (?, ?, ?, 1)
    `,
    [name, vatNumber, customerGroupId],
  );

  return result.insertId;
};

export const registerB2B = async (input: RegisterB2BInput) => {
  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  const password = input.password;
  const phone = input.phone?.trim() || null;
  const addressLine1 = input.address_line1?.trim() || null;
  const addressLine2 = input.address_line2?.trim() || null;
  const city = input.city?.trim() || null;
  const postalCode = input.postal_code?.trim() || null;
  const country = input.country?.trim() || null;
  const companyName = input.company_name?.trim();
  const vatNumber = input.vat_number?.trim();

  if (!name) {
    throw createHttpError(400, 'Name is required');
  }

  if (!email) {
    throw createHttpError(400, 'Email is required');
  }

  if (!password) {
    throw createHttpError(400, 'Password is required');
  }

  if (password.length < 8) {
    throw createHttpError(400, 'Password must be at least 8 characters');
  }

  if (!companyName) {
    throw createHttpError(400, 'Company name is required');
  }

  if (!vatNumber) {
    throw createHttpError(400, 'VAT number is required');
  }

  const [existingUsers] = await pool.query<ExistingUserRow[]>(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email]);

  if (existingUsers.length > 0) {
    throw createHttpError(409, 'User with this email already exists');
  }

  const b2bCustomerGroupId = await findB2BCustomerGroupId();

  let companyId: number;
  let finalCompanyName = companyName;

  const existingCompany = await findCompanyByNameOrVat(companyName, vatNumber);

  if (existingCompany) {
    companyId = existingCompany.id;
    finalCompanyName = existingCompany.name;
  } else {
    companyId = await createCompany({
      name: companyName,
      vatNumber,
      customerGroupId: b2bCustomerGroupId,
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO users (
        name,
        email,
        password,
        phone,
        address_line1,
        address_line2,
        city,
        postal_code,
        country,
        company_name,
        vat_number,
        is_verified,
        is_active,
        provider,
        email_verified,
        role_id,
        customer_group_id,
        company_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      name,
      email,
      hashedPassword,
      phone,
      addressLine1,
      addressLine2,
      city,
      postalCode,
      country,
      finalCompanyName,
      vatNumber,
      0,
      1,
      'local',
      0,
      1,
      b2bCustomerGroupId,
      companyId,
    ],
  );

  const insertedUserId = result.insertId;

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.address_line1,
        u.address_line2,
        u.city,
        u.postal_code,
        u.country,
        u.company_name,
        u.vat_number,
        u.customer_group_id,
        u.company_id,
        r.name AS role,
        CASE
          WHEN u.company_id IS NOT NULL THEN 'b2b'
          ELSE 'b2c'
        END AS customerType
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = ?
      LIMIT 1
    `,
    [insertedUserId],
  );

  return {
    user: rows[0],
  };
};
