import express, { Request, Response, Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mysql, { RowDataPacket } from 'mysql2/promise';
import session from 'express-session';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax', // or 'none' for cross-origin (HTTPS only)
      secure: false, // use true in production w/ HTTPS
    },
  }),
);

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }),
);

app.get('/', (req: Request, res: Response) => {
  // res.send(JSON.stringify({ message: 'Welcome to Express & TypeScript Server' }));
  res.status(200).send({ message: 'Welcome to Express & TypeScript Server' });
});

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test DB connection on startup
(async (): Promise<void> => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database!');
    connection.release(); // release back to pool
  } catch (err) {
    console.error('❌ Failed to connect to the database:', err);
    process.exit(1); // stop server if DB fails
  }
})();

app.get('/', (req: Request, res: Response) => {
  res.status(200).send({ message: 'Welcome to Express & TypeScript Server' });
});

app.get('/products', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    console.log('test');
    res.status(200).json(rows);
  } catch (err) {
    console.error('DB query error:', err);
    res.status(500).send('Error fetching products');
  }
});

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken, refreshToken, profile, done) => {
      const email = profile.emails?.[0].value;
      const name = profile.displayName;
      const providerId = profile.id;

      try {
        const [rows] = await pool.query('SELECT * FROM users WHERE provider = ? AND provider_id = ?', [
          'google',
          providerId,
        ]);
        let user = rows[0];

        if (!user) {
          // Create user if not exists
          const [result]: any = await pool.query(
            'INSERT INTO users (name, email, provider, provider_id, email_verified) VALUES (?, ?, ?, ?, ?)',
            [name, email, 'google', providerId, true],
          );
          const [newUserRows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
          user = newUserRows[0];
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  done(null, rows[0]);
});

app.use(passport.initialize());
app.use(passport.session());

app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account', // 👈 forces user to pick an account
  }),
);

// app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: true,
  }),
  (req, res) => {
    res.redirect('/profile'); // or send a token if using JWT
  },
);

type User = {
  id: number;
  email: string;
  passwordHash: string;
};

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  // 1. Validate input
  if (!email || !password || password.length < 6) {
    return res.status(400).json({
      message: 'Email and password are required. Password must be at least 6 characters.',
    });
  }

  try {
    // 2. Check if user already exists
    const [existingUsers] = await pool.execute<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [email]);

    if ((existingUsers as User[]).length > 0) {
      return res.status(409).json({ message: 'User already exists.' });
    }

    // 3. Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Insert new user
    const [result] = await pool.execute('INSERT INTO users (email, password) VALUES (?, ?)', [email, passwordHash]);

    res.status(201).json({
      message: 'User created successfully.',
      user: {
        id: (result as any).insertId,
        email,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

app.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [email]);

    const users = rows as User[];

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, {
      expiresIn: '1h',
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/logout', (req, res, next) => {
  console.log('Attempting logout...');

  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return next(err);
    }

    req.session.destroy((err) => {
      if (err) console.error('Session destroy error:', err);

      res.clearCookie('connect.sid'); // Ensure session cookie is cleared
      console.log('Logout successful. Redirecting to frontend...');
      res.redirect('http://localhost:5173');
    });
  });
});

app.get('/profile', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).send('Not logged in');
  }
});

app.listen(port, () => {
  console.log(`Server is Fire at http://localhost:${port}`);
});
