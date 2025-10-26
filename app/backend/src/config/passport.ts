import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import { pool } from './db';
dotenv.config();

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
        const [rows]: any = await pool.query('SELECT * FROM users WHERE provider = ? AND provider_id = ?', [
          'google',
          providerId,
        ]);

        let user = rows[0];

        if (!user) {
          const [result]: any = await pool.query(
            'INSERT INTO users (name, email, provider, provider_id, email_verified) VALUES (?, ?, ?, ?, ?)',
            [name, email, 'google', providerId, true],
          );

          const [newUserRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
          user = newUserRows[0];
        }

        done(null, user);
      } catch (err) {
        done(err);
      }
    },
  ),
);

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: number, done) => {
  const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  done(null, rows[0]);
});

export default passport;
