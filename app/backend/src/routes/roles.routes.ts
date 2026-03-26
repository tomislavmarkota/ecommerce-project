import { Router } from 'express';
import { getRoles } from '../controllers/roles.controller';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', requireAdmin, getRoles);

export default router;
