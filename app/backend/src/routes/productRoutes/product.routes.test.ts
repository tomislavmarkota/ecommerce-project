import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../../app';
import * as productService from '../../services/product.service';

vi.mock('../../services/product.service', async () => {
  const actual = await vi.importActual<typeof import('../../services/product.service')>(
    '../../services/product.service',
  );

  return {
    ...actual,
    getProductsList: vi.fn(),
  };
});

describe('GET /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns product list with 200 status', async () => {
    vi.mocked(productService.getProductsList).mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Product A',
          stock: 12,
          is_published: true,
          created_at: '2026-03-20T10:00:00.000Z',
          category_name: 'Tools',
          subcategory_name: 'Power Tools',
          thumbnail: 'https://example.com/image.jpg',
          b2c_price_gross: 120,
          b2b_price_gross: 100,
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [
        {
          id: 1,
          name: 'Product A',
          stock: 12,
          is_published: true,
          created_at: '2026-03-20T10:00:00.000Z',
          category_name: 'Tools',
          subcategory_name: 'Power Tools',
          thumbnail: 'https://example.com/image.jpg',
          b2c_price_gross: 120,
          b2b_price_gross: 100,
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    expect(productService.getProductsList).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: '',
      sortBy: 'created_at',
      sortOrder: 'DESC',
    });
  });

  it('passes query params to product service', async () => {
    vi.mocked(productService.getProductsList).mockResolvedValue({
      data: [],
      total: 0,
      page: 2,
      limit: 20,
      totalPages: 0,
    });

    const res = await request(app).get('/api/products?page=2&limit=20&search=drill&sortBy=name&sortOrder=ASC');

    expect(res.status).toBe(200);

    expect(productService.getProductsList).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
      search: 'drill',
      sortBy: 'name',
      sortOrder: 'ASC',
    });
  });
});
