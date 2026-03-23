import { BlobServiceClient, BlockBlobUploadOptions } from '@azure/storage-blob';
import { randomUUID } from 'crypto';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER;
const publicBaseUrl = process.env.AZURE_STORAGE_PUBLIC_BASE_URL;

if (!connectionString) throw new Error('AZURE_STORAGE_CONNECTION_STRING is missing');
if (!containerName) throw new Error('AZURE_STORAGE_CONTAINER is missing');
if (!publicBaseUrl) throw new Error('AZURE_STORAGE_PUBLIC_BASE_URL is missing');

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

export async function ensureBlobContainer(): Promise<void> {
  await containerClient.createIfNotExists();
  await containerClient.setAccessPolicy('blob');
}

export async function uploadBufferToBlob(params: {
  productId: number;
  buffer: Buffer;
  contentType: string;
  suffix: string;
}): Promise<{
  blobName: string;
  imageUrl: string;
}> {
  const blobName = `products/${params.productId}/${randomUUID()}-${params.suffix}.webp`;

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const options: BlockBlobUploadOptions = {
    blobHTTPHeaders: {
      blobContentType: params.contentType,
    },
  };

  await blockBlobClient.uploadData(params.buffer, options);

  return {
    blobName,
    imageUrl: `${publicBaseUrl}/${blobName}`,
  };
}

export async function deleteBlobByName(blobName: string): Promise<void> {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}
