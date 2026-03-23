import { Request, Response } from 'express';
import { pool } from '../config/db';
import { deleteBlobByName, uploadBufferToBlob } from '../services/azureBlob.service';
import {
  countProductImages,
  deleteImageById,
  findImageById,
  findProductById,
  getImagesByProductId,
  insertProductImage,
  setPrimaryImage,
  unsetPrimaryImages,
  updateImageAltText,
  updateImageSortOrder,
} from '../services/productImage.service';
import { processProductImage } from '../services/imageProcessing.service';

export async function uploadImagesForProduct(req: Request, res: Response) {
  const productId = Number(req.params.productId);

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ message: 'Invalid productId' });
  }

  const files = req.files as Express.Multer.File[] | undefined;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  const connection = await pool.getConnection();
  const uploadedBlobNames: string[] = [];

  try {
    await connection.beginTransaction();

    const productRows = await findProductById(connection, productId);

    if (productRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    const existingCount = await countProductImages(connection, productId);
    const savedImages = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];

      const isPrimary = existingCount === 0 && index === 0;
      const sortOrder = existingCount + index;

      const processed = await processProductImage(file);

      const mainUpload = await uploadBufferToBlob({
        productId,
        buffer: processed.mainBuffer,
        contentType: processed.mimeType,
        suffix: 'main',
      });

      uploadedBlobNames.push(mainUpload.blobName);

      const thumbUpload = await uploadBufferToBlob({
        productId,
        buffer: processed.thumbnailBuffer,
        contentType: processed.mimeType,
        suffix: 'thumb',
      });

      uploadedBlobNames.push(thumbUpload.blobName);

      const imageId = await insertProductImage(connection, {
        productId,
        blobName: mainUpload.blobName,
        imageUrl: mainUpload.imageUrl,
        thumbnailBlobName: thumbUpload.blobName,
        thumbnailUrl: thumbUpload.imageUrl,
        altText: null,
        sortOrder,
        isPrimary,
        mimeType: processed.mimeType,
        fileSize: file.size,
        width: processed.width,
        height: processed.height,
      });

      savedImages.push({
        id: imageId,
        productId,
        blobName: mainUpload.blobName,
        imageUrl: mainUpload.imageUrl,
        thumbnailBlobName: thumbUpload.blobName,
        thumbnailUrl: thumbUpload.imageUrl,
        sortOrder,
        isPrimary,
        mimeType: processed.mimeType,
        fileSize: file.size,
        width: processed.width,
        height: processed.height,
      });
    }

    await connection.commit();

    return res.status(201).json({
      message: 'Images uploaded successfully',
      data: savedImages,
    });
  } catch (error) {
    await connection.rollback();

    for (const blobName of uploadedBlobNames) {
      try {
        await deleteBlobByName(blobName);
      } catch (cleanupError) {
        console.error('Blob cleanup failed:', cleanupError);
      }
    }

    console.error(error);
    return res.status(500).json({ message: 'Failed to upload product images' });
  } finally {
    connection.release();
  }
}

export async function getProductImages(req: Request, res: Response) {
  const productId = Number(req.params.productId);

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ message: 'Invalid productId' });
  }

  const connection = await pool.getConnection();

  try {
    const rows = await getImagesByProductId(connection, productId);

    return res.status(200).json({ data: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch product images' });
  } finally {
    connection.release();
  }
}

export async function updatePrimaryImage(req: Request, res: Response) {
  const productId = Number(req.params.productId);
  const imageId = Number(req.params.imageId);

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ message: 'Invalid productId' });
  }

  if (!Number.isInteger(imageId) || imageId <= 0) {
    return res.status(400).json({ message: 'Invalid imageId' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await unsetPrimaryImages(connection, productId);
    await setPrimaryImage(connection, productId, imageId);

    await connection.commit();

    return res.status(200).json({ message: 'Primary image updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return res.status(500).json({ message: 'Failed to update primary image' });
  } finally {
    connection.release();
  }
}

export async function removeProductImage(req: Request, res: Response) {
  const imageId = Number(req.params.imageId);

  if (!Number.isInteger(imageId) || imageId <= 0) {
    return res.status(400).json({ message: 'Invalid imageId' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const rows = await findImageById(connection, imageId);

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Image not found' });
    }

    const image = rows[0];

    await deleteBlobByName(image.blob_name);

    if (image.thumbnail_blob_name) {
      await deleteBlobByName(image.thumbnail_blob_name);
    }

    await deleteImageById(connection, imageId);

    await connection.commit();

    return res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return res.status(500).json({ message: 'Failed to delete image' });
  } finally {
    connection.release();
  }
}

export async function reorderProductImages(req: Request, res: Response) {
  const productId = Number(req.params.productId);
  const items = req.body.items as Array<{ id: number; sortOrder: number }>;

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ message: 'Invalid productId' });
  }

  if (!Array.isArray(items)) {
    return res.status(400).json({ message: 'Invalid payload' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const item of items) {
      await updateImageSortOrder(connection, productId, item.id, item.sortOrder);
    }

    await connection.commit();

    return res.status(200).json({ message: 'Image order updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return res.status(500).json({ message: 'Failed to reorder images' });
  } finally {
    connection.release();
  }
}

export async function updateProductImageAltText(req: Request, res: Response) {
  const imageId = Number(req.params.imageId);
  const altText = typeof req.body.altText === 'string' ? req.body.altText.trim() : null;

  if (!Number.isInteger(imageId) || imageId <= 0) {
    return res.status(400).json({ message: 'Invalid imageId' });
  }

  const connection = await pool.getConnection();

  try {
    const rows = await findImageById(connection, imageId);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }

    await updateImageAltText(connection, imageId, altText || null);

    return res.status(200).json({
      message: 'Alt text updated successfully',
      data: {
        imageId,
        altText: altText || null,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to update alt text' });
  } finally {
    connection.release();
  }
}
