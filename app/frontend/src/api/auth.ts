import api from './axios';

export const login = async (email: string, password: string) => {
  try {
    const res = await api.post(`/auth/signin`, { email, password }, { withCredentials: true });

    if (res) return res;
  } catch (err) {
    return err;
  }
};
