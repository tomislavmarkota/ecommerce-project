import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const getUsers = async ({ page, limit, search, sorting }: any) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search: search || '',
  });

  if (sorting.length) {
    params.append('sortBy', sorting[0].id);
    params.append('sortDir', sorting[0].desc ? 'desc' : 'asc');
  }

  const res = await axios.get(`${API_URL}/api/users?${params.toString()}`);

  if (!res) {
    throw new Error('Failed to fetch users');
  }

  return res.data;
};

export const deleteUsers = async (ids: number[], token: string) => {
  const res = await axios.delete(`${API_URL}/api/users/bulk`, {
    data: { ids },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data as {
    message: string;
    deletedCount: number;
    ids: number[];
  };
};
