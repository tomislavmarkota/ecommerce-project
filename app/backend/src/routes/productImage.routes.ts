import { Router } from 'express';
import { uploadProductImages } from '../middleware/uploadProductImages';
import {
  getProductImages,
  removeProductImage,
  reorderProductImages,
  updatePrimaryImage,
  updateProductImageAltText,
  uploadImagesForProduct,
} from '../controllers/productImage.controller';

const router = Router();

router.post('/product/:productId', uploadProductImages.array('images', 10), uploadImagesForProduct);

router.get('/product/:productId', getProductImages);
router.patch('/product/:productId/primary/:imageId', updatePrimaryImage);
router.patch('/product/:productId/reorder', reorderProductImages);
router.patch('/:imageId/alt-text', updateProductImageAltText);
router.delete('/:imageId', removeProductImage);

export default router;
