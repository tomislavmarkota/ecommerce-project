import { Router } from 'express';
import { deleteUsersBulk, getUserById, getUsers, updateUser } from '../controllers/userController';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getUsers);
router.delete('/bulk', requireAdmin, deleteUsersBulk);
router.get('/:id', getUserById);
router.put('/:id', requireAdmin, updateUser);

export default router;
