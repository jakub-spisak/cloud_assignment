const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 3000),
  allowedOrigin: process.env.ALLOWED_ORIGIN || 'http://localhost:8080',
  googleVisionApiKey: process.env.GOOGLE_CLOUD_VISION_API_KEY || '',
  googleCloudAuthMode: (process.env.GOOGLE_CLOUD_AUTH_MODE || 'api_key').toLowerCase(),
  googleServiceAccountJsonBase64: process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 || '',
  googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
  googleServiceAccountProjectId: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID || '',
  ocrProvider: (process.env.OCR_PROVIDER || 'mock').toLowerCase(),
  ocrMockText:
    process.env.OCR_MOCK_TEXT ||
    [
      'Ukážkový OCR výstup v mock režime.',
      'Tento režim je zámerne bez volania Google Cloud Vision, takže negeneruje cloudové náklady.',
      'Pred reálnym OCR vedome prepni OCR_PROVIDER=google a nastav service account alebo API kľúč.'
    ].join('\n'),
  ocrMaxCloudRequestsPerUserPerDay: toNumber(process.env.OCR_MAX_CLOUD_REQUESTS_PER_USER_PER_DAY, 3),
  ocrMaxCloudRequestsProjectPerDay: toNumber(process.env.OCR_MAX_CLOUD_REQUESTS_PROJECT_PER_DAY, 12),
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  storageProvider: (process.env.STORAGE_PROVIDER || 'local').toLowerCase(),
  storeSourceImages: toBoolean(process.env.STORE_SOURCE_IMAGES, true),
  azureBlobConnectionString: process.env.AZURE_BLOB_CONNECTION_STRING || '',
  azureBlobContainerName: process.env.AZURE_BLOB_CONTAINER_NAME || 'note-images',
  azureBlobCreateContainerIfMissing: toBoolean(process.env.AZURE_BLOB_CREATE_CONTAINER_IF_MISSING, true),
  db: {
    server: process.env.DB_SERVER || 'localhost',
    port: toNumber(process.env.DB_PORT, 1433),
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || process.env.SA_PASSWORD || '',
    database: process.env.DB_NAME || 'NoteworthyDb',
    encrypt: String(process.env.DB_ENCRYPT || 'false').toLowerCase() === 'true',
    trustServerCertificate:
      String(process.env.DB_TRUST_SERVER_CERTIFICATE || 'true').toLowerCase() === 'true'
  }
};

module.exports = { config };
