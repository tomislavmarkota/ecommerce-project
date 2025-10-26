// utils/refreshAccessToken.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const res = await axios.get(`${API_URL}/api/auth/refresh`, { withCredentials: true });
    return res.data?.accessToken || null;
  } catch (err) {
    console.error('Failed to refresh token', err);
    return null;
  }
};
