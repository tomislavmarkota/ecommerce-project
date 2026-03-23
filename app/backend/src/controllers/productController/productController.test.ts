import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response } from 'express';
import type { AuthRequest } from '../../middleware/admin.middleware';

const mocks = vi.hoisted(() => ({
  mockCreateProduct: vi.fn(),
  mockDeleteProductsByIds: vi.fn(),
  mockGetProductsList: vi.fn(),
  mockUpdateProductPrices: vi.fn(),
  mockValidateSubcategoryBelongsToCategory: vi.fn(),
}));

vi.mock('../../services/product.service', () => ({
  createProduct: mocks.mockCreateProduct,
  deleteProductsByIds: mocks.mockDeleteProductsByIds,
  getProductsList: mocks.mockGetProductsList,
  updateProductPrices: mocks.mockUpdateProductPrices,
  validateSubcategoryBelongsToCategory: mocks.mockValidateSubcategoryBelongsToCategory,
}));

import {
  addProduct,
  deleteProductsBulk,
  getProducts,
  updateProductPricing,
} from '../productController/product.controller';

const createRes = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('product.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProducts', () => {
    it('returns product list', async () => {
      const req = { query: {} } as unknown as AuthRequest;
      const res = createRes();

      mocks.mockGetProductsList.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await getProducts(req, res);

      expect(mocks.mockGetProductsList).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: '',
        sortBy: 'created_at',
        sortOrder: 'DESC',
      });

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('addProduct', () => {
    it('returns 400 when required fields are missing', async () => {
      const req = { body: {} } as AuthRequest;
      const res = createRes();

      await addProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Name, stock, categoryId and pricing are required',
      });
    });

    it('returns 400 when stock is invalid', async () => {
      const req = {
        body: {
          name: 'Product A',
          stock: -1,
          categoryId: 1,
          pricing: {
            retail: { priceNet: 10, vatRate: 25, priceGross: 12.5 },
            business: { priceNet: 8, vatRate: 25, priceGross: 10 },
          },
        },
      } as AuthRequest;

      const res = createRes();

      await addProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Valid stock is required',
      });
    });

    it('returns 400 when retail/business pricing is invalid', async () => {
      const req = {
        body: {
          name: 'Product A',
          stock: 10,
          categoryId: 1,
          pricing: {
            retail: { priceNet: -1, vatRate: 25, priceGross: 12.5 },
            business: { priceNet: 8, vatRate: 25, priceGross: 10 },
          },
        },
      } as AuthRequest;

      const res = createRes();

      await addProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Valid retail and business pricing is required',
      });
    });

    it('returns 400 when subcategory does not belong to category', async () => {
      mocks.mockValidateSubcategoryBelongsToCategory.mockResolvedValue(false);

      const req = {
        body: {
          name: 'Product A',
          description: 'Desc',
          stock: 10,
          categoryId: 1,
          subcategoryId: 2,
          images: ['https://img.com/a.jpg'],
          isPublished: true,
          pricing: {
            retail: { priceNet: 10, vatRate: 25, priceGross: 12.5 },
            business: { priceNet: 8, vatRate: 25, priceGross: 10 },
          },
        },
      } as AuthRequest;

      const res = createRes();

      await addProduct(req, res);

      expect(mocks.mockValidateSubcategoryBelongsToCategory).toHaveBeenCalledWith(1, 2);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Selected subcategory does not belong to selected category',
      });
    });

    it('returns 201 for valid payload', async () => {
      mocks.mockValidateSubcategoryBelongsToCategory.mockResolvedValue(true);
      mocks.mockCreateProduct.mockResolvedValue({ productId: 123 });

      const req = {
        body: {
          name: 'Product A',
          description: 'Desc',
          stock: 10,
          categoryId: 1,
          subcategoryId: 2,
          images: ['https://img.com/a.jpg'],
          isPublished: true,
          pricing: {
            retail: { priceNet: 10, vatRate: 25, priceGross: 12.5 },
            business: { priceNet: 8, vatRate: 25, priceGross: 10 },
          },
        },
      } as AuthRequest;

      const res = createRes();

      await addProduct(req, res);

      expect(mocks.mockCreateProduct).toHaveBeenCalledWith({
        name: 'Product A',
        description: 'Desc',
        stock: 10,
        categoryId: 1,
        subcategoryId: 2,
        images: ['https://img.com/a.jpg'],
        isPublished: true,
        pricing: {
          retail: { priceNet: 10, vatRate: 25, priceGross: 12.5 },
          business: { priceNet: 8, vatRate: 25, priceGross: 10 },
        },
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Product added successfully',
        productId: 123,
        published: true,
      });
    });
  });

  describe('updateProductPricing', () => {
    it('returns 400 for invalid product id', async () => {
      const req = {
        params: { id: 'abc' },
        body: {},
      } as unknown as AuthRequest;

      const res = createRes();

      await updateProductPricing(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Valid product id is required',
      });
    });

    it('returns 400 for invalid pricing payload', async () => {
      const req = {
        params: { id: '5' },
        body: {
          pricing: {
            retail: { priceNet: 10, vatRate: 25, priceGross: -1 },
            business: { priceNet: 8, vatRate: 25, priceGross: 10 },
          },
        },
      } as unknown as AuthRequest;

      const res = createRes();

      await updateProductPricing(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Valid retail and business pricing is required',
      });
    });

    it('returns 200 for valid pricing update', async () => {
      mocks.mockUpdateProductPrices.mockResolvedValue({ updated: true });

      const req = {
        params: { id: '5' },
        body: {
          pricing: {
            retail: { priceNet: 10, vatRate: 25, priceGross: 12.5 },
            business: { priceNet: 8, vatRate: 25, priceGross: 10 },
          },
        },
      } as unknown as AuthRequest;

      const res = createRes();

      await updateProductPricing(req, res);

      expect(mocks.mockUpdateProductPrices).toHaveBeenCalledWith({
        productId: 5,
        pricing: {
          retail: { priceNet: 10, vatRate: 25, priceGross: 12.5 },
          business: { priceNet: 8, vatRate: 25, priceGross: 10 },
        },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Product pricing updated successfully',
      });
    });
  });

  describe('deleteProductsBulk', () => {
    it('returns 400 when ids are missing', async () => {
      const req = { body: {} } as AuthRequest;
      const res = createRes();

      await deleteProductsBulk(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Product ids are required',
      });
    });

    it('returns 200 when delete succeeds', async () => {
      mocks.mockDeleteProductsByIds.mockResolvedValue({ deletedCount: 2 });

      const req = {
        body: {
          ids: [1, 2, 2],
        },
      } as AuthRequest;

      const res = createRes();

      await deleteProductsBulk(req, res);

      expect(mocks.mockDeleteProductsByIds).toHaveBeenCalledWith([1, 2]);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Products deleted successfully',
        deletedCount: 2,
        ids: [1, 2],
      });
    });
  });
});
