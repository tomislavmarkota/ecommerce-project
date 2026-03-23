import { Router } from 'express';
import { getCheckoutPreview } from '../../controllers/checkoutController';
import { requireAdmin } from '../../middleware/admin.middleware';
const router = Router();

router.post('/preview', requireAdmin, getCheckoutPreview);

export default router;
