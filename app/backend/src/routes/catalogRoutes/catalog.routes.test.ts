import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGetPriceListContextForUser: vi.fn(),
  mockGetCatalogProductsList: vi.fn(),
  mockGetCatalogProductWithPricing: vi.fn(),
}));

vi.mock('../../services/product-pricing.service', () => ({
  getPriceListContextForUser: mocks.mockGetPriceListContextForUser,
  getCatalogProductsList: mocks.mockGetCatalogProductsList,
  getCatalogProductWithPricing: mocks.mockGetCatalogProductWithPricing,
}));

import app from '../../app';

describe('GET /api/catalog/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns catalog products with 200 status', async () => {
    mocks.mockGetPriceListContextForUser.mockResolvedValue({
      customerGroupId: 1,
      customerGroupCode: 'retail',
      priceListId: 10,
      currency: 'EUR',
    });

    mocks.mockGetCatalogProductsList.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Product A',
          description: 'Desc',
          stock: 12,
          isPublished: true,
          categoryId: 1,
          subcategoryId: 2,
          categoryName: 'Tools',
          subcategoryName: 'Power Tools',
          thumbnail: 'https://example.com/image.jpg',
          pricing: {
            productId: 1,
            customerGroupCode: 'retail',
            priceListId: 10,
            currency: 'EUR',
            originalNet: 80,
            originalGross: 100,
            vatRate: 25,
            discountAmountNet: 8,
            discountAmountGross: 10,
            finalNet: 72,
            finalGross: 90,
            appliedDiscount: {
              id: 9,
              name: 'Spring Sale',
              type: 'percentage',
              value: 10,
            },
          },
        },
      ],
      total: 1,
      page: 1,
      limit: 12,
      totalPages: 1,
    });

    const res = await request(app).get('/api/catalog/products');

    expect(res.status).toBe(200);

    expect(mocks.mockGetPriceListContextForUser).toHaveBeenCalledWith(null);
    expect(mocks.mockGetCatalogProductsList).toHaveBeenCalledWith({
      page: 1,
      limit: 12,
      search: '',
      pricingContext: {
        customerGroupId: 1,
        customerGroupCode: 'retail',
        priceListId: 10,
        currency: 'EUR',
      },
    });

    expect(res.body).toEqual({
      data: [
        {
          id: 1,
          name: 'Product A',
          description: 'Desc',
          stock: 12,
          isPublished: true,
          categoryId: 1,
          subcategoryId: 2,
          categoryName: 'Tools',
          subcategoryName: 'Power Tools',
          thumbnail: 'https://example.com/image.jpg',
          pricing: {
            productId: 1,
            customerGroupCode: 'retail',
            priceListId: 10,
            currency: 'EUR',
            originalNet: 80,
            originalGross: 100,
            vatRate: 25,
            discountAmountNet: 8,
            discountAmountGross: 10,
            finalNet: 72,
            finalGross: 90,
            appliedDiscount: {
              id: 9,
              name: 'Spring Sale',
              type: 'percentage',
              value: 10,
            },
          },
        },
      ],
      total: 1,
      page: 1,
      limit: 12,
      totalPages: 1,
    });
  });

  it('passes query params correctly', async () => {
    mocks.mockGetPriceListContextForUser.mockResolvedValue({
      customerGroupId: 1,
      customerGroupCode: 'retail',
      priceListId: 10,
      currency: 'EUR',
    });

    mocks.mockGetCatalogProductsList.mockResolvedValue({
      data: [],
      total: 0,
      page: 2,
      limit: 20,
      totalPages: 0,
    });

    const res = await request(app).get('/api/catalog/products?page=2&limit=20&search=drill');

    expect(res.status).toBe(200);

    expect(mocks.mockGetCatalogProductsList).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
      search: 'drill',
      pricingContext: {
        customerGroupId: 1,
        customerGroupCode: 'retail',
        priceListId: 10,
        currency: 'EUR',
      },
    });
  });
});
