import { Router } from 'express';
import { getRoles } from '../controllers/roles.controller';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();

// router.get('/', getRoles);
router.get('/', requireAdmin, getRoles);

export default router;
