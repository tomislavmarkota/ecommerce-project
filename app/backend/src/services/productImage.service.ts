import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export type ProductImageRow = RowDataPacket & {
  id: number;
  product_id: number;
  blob_name: string;
  image_url: string;
  thumbnail_blob_name: string | null;
  thumbnail_url: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: number;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  created_at: Date;
  updated_at: Date;
};

type ProductRow = RowDataPacket & {
  id: number;
};

type CountRow = RowDataPacket & {
  total: number;
};

type InsertProductImageInput = {
  productId: number;
  blobName: string;
  imageUrl: string;
  thumbnailBlobName?: string | null;
  thumbnailUrl?: string | null;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
};

export async function findProductById(connection: PoolConnection, productId: number): Promise<ProductRow[]> {
  const [rows] = await connection.execute<ProductRow[]>('SELECT id FROM products WHERE id = ? LIMIT 1', [productId]);

  return rows;
}

export async function countProductImages(connection: PoolConnection, productId: number): Promise<number> {
  const [rows] = await connection.execute<CountRow[]>(
    'SELECT COUNT(*) AS total FROM product_images WHERE product_id = ?',
    [productId],
  );

  return Number(rows[0]?.total || 0);
}

export async function insertProductImage(connection: PoolConnection, data: InsertProductImageInput): Promise<number> {
  const [result] = await connection.execute<ResultSetHeader>(
    `
      INSERT INTO product_images (
        product_id,
        blob_name,
        image_url,
        thumbnail_blob_name,
        thumbnail_url,
        alt_text,
        sort_order,
        is_primary,
        mime_type,
        file_size,
        width,
        height
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.productId,
      data.blobName,
      data.imageUrl,
      data.thumbnailBlobName ?? null,
      data.thumbnailUrl ?? null,
      data.altText ?? null,
      data.sortOrder,
      data.isPrimary ? 1 : 0,
      data.mimeType ?? null,
      data.fileSize ?? null,
      data.width ?? null,
      data.height ?? null,
    ],
  );

  return result.insertId;
}

export async function getImagesByProductId(connection: PoolConnection, productId: number): Promise<ProductImageRow[]> {
  const [rows] = await connection.execute<ProductImageRow[]>(
    `
      SELECT
        id,
        product_id,
        blob_name,
        image_url,
        thumbnail_blob_name,
        thumbnail_url,
        alt_text,
        sort_order,
        is_primary,
        mime_type,
        file_size,
        width,
        height,
        created_at,
        updated_at
      FROM product_images
      WHERE product_id = ?
      ORDER BY is_primary DESC, sort_order ASC, id ASC
    `,
    [productId],
  );

  return rows;
}

export async function unsetPrimaryImages(connection: PoolConnection, productId: number): Promise<void> {
  await connection.execute('UPDATE product_images SET is_primary = 0 WHERE product_id = ?', [productId]);
}

export async function setPrimaryImage(connection: PoolConnection, productId: number, imageId: number): Promise<void> {
  await connection.execute(
    `
      UPDATE product_images
      SET is_primary = 1
      WHERE id = ? AND product_id = ?
    `,
    [imageId, productId],
  );
}

export async function findImageById(connection: PoolConnection, imageId: number): Promise<ProductImageRow[]> {
  const [rows] = await connection.execute<ProductImageRow[]>(
    `
      SELECT
        id,
        product_id,
        blob_name,
        image_url,
        thumbnail_blob_name,
        thumbnail_url,
        alt_text,
        sort_order,
        is_primary,
        mime_type,
        file_size,
        width,
        height,
        created_at,
        updated_at
      FROM product_images
      WHERE id = ?
      LIMIT 1
    `,
    [imageId],
  );

  return rows;
}

export async function deleteImageById(connection: PoolConnection, imageId: number): Promise<void> {
  await connection.execute('DELETE FROM product_images WHERE id = ?', [imageId]);
}

export async function updateImageSortOrder(
  connection: PoolConnection,
  productId: number,
  imageId: number,
  sortOrder: number,
): Promise<void> {
  await connection.execute(
    `
      UPDATE product_images
      SET sort_order = ?
      WHERE id = ? AND product_id = ?
    `,
    [sortOrder, imageId, productId],
  );
}

export async function updateImageAltText(
  connection: PoolConnection,
  imageId: number,
  altText: string | null,
): Promise<void> {
  await connection.execute(
    `
      UPDATE product_images
      SET alt_text = ?
      WHERE id = ?
    `,
    [altText, imageId],
  );
}
