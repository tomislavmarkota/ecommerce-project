import axios from 'axios';

export const getUsers = async ({ page, limit, search, sorting }: any) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
