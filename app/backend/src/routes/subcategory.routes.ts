import express from 'express';
import {
  createSubcategory,
  getSubcategories,
  getSubcategoryById,
  updateSubcategory,
  deleteSubcategory,
} from '../controllers/subcategoryController';

const router = express.Router();

router.post('/', createSubcategory);
router.get('/', getSubcategories);
router.get('/:id', getSubcategoryById);
router.put('/:id', updateSubcategory);
router.delete('/:id', deleteSubcategory);

export default router;
