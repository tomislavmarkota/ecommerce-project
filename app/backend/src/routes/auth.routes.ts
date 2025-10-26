import { Router } from 'express';
import { signup, signin, refresh, logout } from '../controllers/auth.controller';

const router = Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/logout', logout);
router.get('/refresh', refresh);

export default router;
