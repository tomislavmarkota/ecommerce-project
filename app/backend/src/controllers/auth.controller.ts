import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import dotenv from 'dotenv';
dotenv.config();

export const signup = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password || password.length < 6)
    return res.status(400).json({ message: 'Email and password required (min 6 chars).' });

  try {
    const [existing]: any = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ message: 'User already exists.' });

    const hash = await bcrypt.hash(password, 10);
    const [result]: any = await pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hash]);

    res.status(201).json({ id: result.insertId, email });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

type User = {
  id: number;
  email: string;
  password: string;
  role: string;
};

export const signin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.password, r.name AS role
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email],
    );

    const users = rows as any[];
    if (users.length === 0) return res.status(401).json({ message: 'Invalid email or password.' });

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password.' });

    // --- Generate tokens ---
    const accessToken = jwt.sign(
      {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: '15m' },
    );

    const refreshToken = jwt.sign({ userId: user.id, email: user.email }, process.env.REFRESH_TOKEN_SECRET as string, {
      expiresIn: '7d',
    });

    // ✅ Store refresh token in DB
    await pool.query('UPDATE users SET refresh_token = ? WHERE id = ?', [refreshToken, user.id]);

    // ✅ Set refresh token cookie
    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // ✅ Send access token to frontend
    res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const logout = async (req: Request, res: Response) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204); // No content

  const refreshToken = cookies.jwt;

  try {
    // Check if token exists in DB
    const [rows] = await pool.query('SELECT id FROM users WHERE refresh_token = ?', [refreshToken]);
    const users = rows as any[];

    if (users.length > 0) {
      const userId = users[0].id;

      // 🧹 Remove refresh token from DB
      await pool.query('UPDATE users SET refresh_token = NULL WHERE id = ?', [userId]);
    }

    // 🧹 Clear cookie
    res.clearCookie('jwt', {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: 'Server error during logout' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(401);

  const refreshToken = cookies.jwt;

  try {
    // Verify token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as {
      userId: number;
      email: string;
    };

    // 🧩 Fetch user + role using JOIN (same as in signin)
    const [rows] = await pool.query(
      `SELECT u.id, u.email, r.name AS role
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND u.refresh_token = ?`,
      [decoded.userId, refreshToken],
    );

    const users = rows as any[];
    if (users.length === 0) return res.status(403).json({ message: 'Forbidden' });

    const user = users[0];

    // 🧩 Create new access token with user + role
    const accessToken = jwt.sign(
      {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: '15m' },
    );

    // ✅ Return token + full user object
    return res.status(200).json({
      message: 'Refresh successful',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(403).json({ message: 'Forbidden' });
  }
};
