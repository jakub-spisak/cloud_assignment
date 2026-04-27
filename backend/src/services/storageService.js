const path = require('path');
const { BlobServiceClient } = require('@azure/storage-blob');
const { config } = require('../config');

let blobServiceClient;
let containerPrepared = false;

function sanitizeFileName(fileName) {
  return String(fileName || 'upload.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function buildBlobName({ userId, noteId, originalName }) {
  const safeName = sanitizeFileName(originalName);
  const now = new Date();
  const datePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${String(
    now.getUTCDate()
  ).padStart(2, '0')}`;
  return `${userId}/${datePath}/${noteId}-${safeName}`;
}

function getBlobServiceClient() {
  if (blobServiceClient) {
    return blobServiceClient;
  }

  if (!config.azureBlobConnectionString) {
    throw new Error(
      'STORAGE_PROVIDER je azure_blob, ale chýba AZURE_BLOB_CONNECTION_STRING.'
    );
  }

  blobServiceClient = BlobServiceClient.fromConnectionString(config.azureBlobConnectionString);
  return blobServiceClient;
}

async function ensureContainer() {
  if (containerPrepared) {
    return;
  }

  const serviceClient = getBlobServiceClient();
  const containerClient = serviceClient.getContainerClient(config.azureBlobContainerName);

  if (config.azureBlobCreateContainerIfMissing) {
    await containerClient.createIfNotExists();
  }

  containerPrepared = true;
}

async function uploadSourceImage({ noteId, userId, originalName, mimeType, buffer }) {
  if (!config.storeSourceImages) {
    return {
      imageStorageProvider: 'disabled',
      imageObjectKey: null,
      imageUrl: null
    };
  }

  if (config.storageProvider !== 'azure_blob') {
    return {
      imageStorageProvider: config.storageProvider,
      imageObjectKey: path.posix.join(userId, `${noteId}-${sanitizeFileName(originalName)}`),
      imageUrl: null
    };
  }

  await ensureContainer();
  const serviceClient = getBlobServiceClient();
  const containerClient = serviceClient.getContainerClient(config.azureBlobContainerName);
  const blobName = buildBlobName({ userId, noteId, originalName });
  const blobClient = containerClient.getBlockBlobClient(blobName);

  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: mimeType || 'application/octet-stream'
    }
  });

  return {
    imageStorageProvider: 'azure_blob',
    imageObjectKey: blobName,
    imageUrl: blobClient.url
  };
}

async function deleteStoredSourceImage({ imageStorageProvider, imageObjectKey }) {
  if (imageStorageProvider !== 'azure_blob' || !imageObjectKey) {
    return false;
  }

  await ensureContainer();
  const serviceClient = getBlobServiceClient();
  const containerClient = serviceClient.getContainerClient(config.azureBlobContainerName);
  const blobClient = containerClient.getBlockBlobClient(imageObjectKey);
  await blobClient.deleteIfExists();
  return true;
}

module.exports = {
  uploadSourceImage,
  deleteStoredSourceImage
};
