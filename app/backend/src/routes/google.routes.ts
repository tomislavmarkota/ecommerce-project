import { Router } from 'express';
import passport from '../config/passport';

const router = Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' }));
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: true }),
  (req, res) => res.redirect('/profile'),
);

export default router;
