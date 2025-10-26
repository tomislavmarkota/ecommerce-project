// src/utils/refreshManager.ts
import api from '../api/axios';

let refreshPromise: Promise<any> | null = null;

export const refreshSession = async () => {
  if (!refreshPromise) {
    refreshPromise = api
      .get('/auth/refresh', { withCredentials: true })
      .then((res) => res.data)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};
