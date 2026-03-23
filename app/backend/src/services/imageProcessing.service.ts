import sharp from 'sharp';

export type ProcessedImageResult = {
  mainBuffer: Buffer;
  thumbnailBuffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
};

export async function processProductImage(file: Express.Multer.File): Promise<ProcessedImageResult> {
  const input = sharp(file.buffer).rotate();

  const metadata = await input.metadata();

  const mainBuffer = await sharp(file.buffer)
    .rotate()
    .resize({
      width: 1600,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .webp({ quality: 80 })
    .toBuffer();

  const thumbnailBuffer = await sharp(file.buffer)
    .rotate()
    .resize(400, 400, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 72 })
    .toBuffer();

  return {
    mainBuffer,
    thumbnailBuffer,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    mimeType: 'image/webp',
  };
}
