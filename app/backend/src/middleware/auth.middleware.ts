// src/middleware/auth.middleware.ts
import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

type AppJwtUser = {
  id: number;
  email: string;
  role: 'user' | 'admin' | 'superAdmin' | 'editor';
};

export interface AuthRequest extends Request {
  user?: AppJwtUser;
}

type AccessTokenPayload = JwtPayload & {
  user?: AppJwtUser;
};

const getBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  return token;
};

const verifyAccessToken = (token: string): AppJwtUser | null => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error('ACCESS_TOKEN_SECRET is not configured');
  }

  const decoded = jwt.verify(token, secret) as AccessTokenPayload;
  if (!decoded.user?.id || !decoded.user?.email || !decoded.user?.role) {
    return null;
  }

  return decoded.user;
};

export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const token = getBearerToken(req);
    if (!token) return next();

    const user = verifyAccessToken(token);
    if (user) req.user = user;

    return next();
  } catch {
    return next();
  }
};

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = verifyAccessToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = verifyAccessToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (user.role !== 'admin' && user.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
