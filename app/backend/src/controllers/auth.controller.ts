import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const isProd = process.env.NODE_ENV === 'production';
const REFRESH_COOKIE_NAME = isProd ? '__Host-rt' : 'rt';

const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

const signAccessToken = (user: { id: number; email: string; role: string | null }) => {
  return jwt.sign(
    {
      user: {
        id: user.id,
        email: user.email,
        role: user.role ?? 'user',
      },
    },
    process.env.ACCESS_TOKEN_SECRET as string,
    { expiresIn: ACCESS_TOKEN_TTL },
  );
};

const signRefreshToken = (user: { id: number; email: string }) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      jti: crypto.randomUUID(),
    },
    process.env.REFRESH_TOKEN_SECRET as string,
    { expiresIn: '7d' },
  );
};

const getRefreshCookieOptions = () => {
  if (isProd) {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    };
  }

  return {
    httpOnly: true,
    secure: false,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  };
};

export const signup = async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!email || password.length < 10) {
    return res.status(400).json({ message: 'Invalid signup data' });
  }

  try {
    const [existing]: any = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Unable to create account' });
    }

    const hash = await bcrypt.hash(password, 12);

    const [result]: any = await pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hash]);

    return res.status(201).json({
      id: result.insertId,
      email,
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const signin = async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    return res.status(400).json({ message: 'Invalid email or password' });
  }

  try {
    const [rows]: any = await pool.query(
      `
      SELECT u.id, u.email, u.password, r.name AS role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ?
      LIMIT 1
      `,
      [email],
    );

    const user = rows[0] ?? null;

    const passwordHash = user?.password ?? '$2b$12$wJw2k7mP3pR6F1VvI6nM2e4cr6M5h8QW9g4hV4xE4D4M4I4Y4oI8K';

    const isMatch = await bcrypt.compare(password, passwordHash);

    if (!user || !isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await pool.query('UPDATE users SET refresh_token = ? WHERE id = ?', [refreshToken, user.id]);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role ?? 'user',
      },
    });
  } catch (err) {
    console.error('Signin error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!refreshToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as {
      sub: number;
      email: string;
      jti: string;
    };

    const [rows]: any = await pool.query(
      `
      SELECT u.id, u.email, r.name AS role, u.refresh_token
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
      LIMIT 1
      `,
      [decoded.sub],
    );

    const user = rows[0] ?? null;

    if (!user || user.refresh_token !== refreshToken) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    await pool.query('UPDATE users SET refresh_token = ? WHERE id = ?', [newRefreshToken, user.id]);

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions());

    return res.status(200).json({
      message: 'Refresh successful',
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role ?? 'user',
      },
    });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(403).json({ message: 'Forbidden' });
  }
};

export const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  try {
    if (refreshToken) {
      await pool.query('UPDATE users SET refresh_token = NULL WHERE refresh_token = ?', [refreshToken]);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
