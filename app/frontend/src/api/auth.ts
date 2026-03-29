import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const login = (email: string, password: string) => {
  return axios.post(`${API_URL}/api/auth/signin`, { email, password }, { withCredentials: true });
};

type RegisterB2BPayload = {
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

export const registerB2B = (payload: RegisterB2BPayload) => {
  return axios.post(`${API_URL}/api/auth/register-b2b`, payload, {
    withCredentials: true,
  });
};
