import { Router } from 'express';
import { signup, signin, refresh, logout } from '../controllers/auth.controller';
import { authRateLimit } from '../config/rateLimiter';
import { registerB2B } from '../controllers/userController';

const router = Router();

router.post('/signin', authRateLimit, signin);
router.post('/signup', authRateLimit, signup);
router.get('/refresh', refresh);
router.post('/logout', logout);
router.post('/register-b2b', registerB2B);

export default router;
