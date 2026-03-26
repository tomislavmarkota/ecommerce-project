import express from 'express';
import {
  createCategoryHandler,
  deleteCategoryHandler,
  getCategoriesTreeHandler,
  getCategoryByIdHandler,
  moveCategoryHandler,
  updateCategoryHandler,
} from '../controllers/categoryController';

const router = express.Router();

router.get('/tree', getCategoriesTreeHandler);
router.get('/:id', getCategoryByIdHandler);
router.post('/', createCategoryHandler);
router.put('/:id', updateCategoryHandler);
router.patch('/:id/move', moveCategoryHandler);
router.delete('/:id', deleteCategoryHandler);

export default router;
