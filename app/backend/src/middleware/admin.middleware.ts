import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

// export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
//   console.log(req.headers);
//   const authHeader = req.headers.authorization;
//   console.log('authHeader', authHeader);
//   if (!authHeader) return res.status(401).json({ message: 'Missing token' });

//   const token = authHeader.split(' ')[1];
//   if (!token) return res.status(401).json({ message: 'Missing token' });

//   try {
//     const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
//     req.user = decoded;

//     if (decoded.role !== 'admin') {
//       return res.status(403).json({ message: 'Forbidden: Admins only' });
//     }

//     next();
//   } catch (err) {
//     console.error('Token verification error:', err);
//     return res.status(401).json({ message: 'Invalid token' });
//   }
// };

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Missing token' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    const decoded: any = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
    req.user = decoded;

    // ✅ Access role properly depending on JWT payload
    const role = decoded.user?.role || decoded.role;
    console.log(role);
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admins only' });
    }

    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ message: 'Invalid token' });
  }
};
