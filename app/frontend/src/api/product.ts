import axios from 'axios';
import { ProductInput } from '../types/product';
import api from './axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// export const addProduct = async (product: ProductInput, token: string) => {
export const addProduct = async (product: ProductInput) => {
  const response = await axios.post(`${API_BASE}/api/products/add-product`, product, {
    headers: {
      Authorization: `Bearer ${product.categoryId}`,
      // Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const fetchProducts = async () => {
  try {
    const res = await api.get('/products');
    return res;
  } catch (err: any) {
    return err;
  }
};
