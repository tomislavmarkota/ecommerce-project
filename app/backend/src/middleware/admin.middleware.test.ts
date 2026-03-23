import jwt from 'jsonwebtoken';
import type { Response, NextFunction } from 'express';
import { requireAdmin, type AuthRequest } from './admin.middleware';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

describe('requireAdmin', () => {
  const createRes = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it('returns 401 when authorization header is missing', () => {
    const req = {
      headers: {},
    } as AuthRequest;

    const res = createRes();
    const next = vi.fn() as NextFunction;

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Missing token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', () => {
    const req = {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    } as AuthRequest;

    const res = createRes();
    const next = vi.fn() as NextFunction;

    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user is not admin or superAdmin', () => {
    const req = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as AuthRequest;

    const res = createRes();
    const next = vi.fn() as NextFunction;

    vi.mocked(jwt.verify).mockReturnValue({
      user: {
        id: 1,
        role: 'customer',
      },
    } as never);

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Admins only' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and sets req.user for admin', () => {
    const req = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as AuthRequest;

    const res = createRes();
    const next = vi.fn() as NextFunction;

    vi.mocked(jwt.verify).mockReturnValue({
      user: {
        id: 2,
        role: 'admin',
      },
    } as never);

    requireAdmin(req, res, next);

    expect(req.user).toEqual({
      id: 2,
      role: 'admin',
    });
    expect(next).toHaveBeenCalled();
  });

  it('calls next and sets req.user for superAdmin', () => {
    const req = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as AuthRequest;

    const res = createRes();
    const next = vi.fn() as NextFunction;

    vi.mocked(jwt.verify).mockReturnValue({
      user: {
        id: 3,
        role: 'superAdmin',
      },
    } as never);

    requireAdmin(req, res, next);

    expect(req.user).toEqual({
      id: 3,
      role: 'superAdmin',
    });
    expect(next).toHaveBeenCalled();
  });
});
