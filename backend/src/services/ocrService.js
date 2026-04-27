const vision = require('@google-cloud/vision');
const { config } = require('../config');

let visionClient;

function getMockText() {
  return config.ocrMockText.trim();
}

function parseServiceAccountCredentials() {
  if (config.googleServiceAccountJsonBase64) {
    const json = Buffer.from(config.googleServiceAccountJsonBase64, 'base64').toString('utf8');
    return JSON.parse(json);
  }

  if (config.googleServiceAccountJson) {
    return JSON.parse(config.googleServiceAccountJson);
  }

  throw new Error(
    'Google OCR v service account režime vyžaduje GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 alebo GOOGLE_SERVICE_ACCOUNT_JSON.'
  );
}

function getVisionClient() {
  if (visionClient) {
    return visionClient;
  }

  if (config.googleCloudAuthMode !== 'service_account') {
    throw new Error(`Nepodporovaný GOOGLE_CLOUD_AUTH_MODE pre klienta: ${config.googleCloudAuthMode}`);
  }

  const credentials = parseServiceAccountCredentials();
  visionClient = new vision.ImageAnnotatorClient({
    projectId: config.googleServiceAccountProjectId || credentials.project_id,
    credentials
  });

  return visionClient;
}

async function extractTextWithServiceAccount(buffer) {
  const client = getVisionClient();
  const [result] = await client.documentTextDetection({
    image: {
      content: buffer
    },
    imageContext: {
      languageHints: ['sk', 'cs', 'en']
    }
  });

  const text = result?.fullTextAnnotation?.text || result?.textAnnotations?.[0]?.description || '';

  if (!text.trim()) {
    throw new Error('OCR nenašiel v obrázku žiadny text.');
  }

  return text.trim();
}

async function extractTextWithApiKey(buffer) {
  if (!config.googleVisionApiKey) {
    throw new Error('OCR_PROVIDER je google, ale chýba GOOGLE_CLOUD_VISION_API_KEY.');
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${config.googleVisionApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: buffer.toString('base64')
            },
            features: [
              {
                type: 'DOCUMENT_TEXT_DETECTION'
              }
            ],
            imageContext: {
              languageHints: ['sk', 'cs', 'en']
            }
          }
        ]
      })
    }
  );

  const payload = await response.json();

  if (!response.ok) {
    const message = payload?.error?.message || 'OCR request zlyhal.';
    throw new Error(message);
  }

  const text =
    payload?.responses?.[0]?.fullTextAnnotation?.text ||
    payload?.responses?.[0]?.textAnnotations?.[0]?.description ||
    '';

  if (!text.trim()) {
    throw new Error('OCR nenašiel v obrázku žiadny text.');
  }

  return text.trim();
}

async function extractTextFromImage(buffer) {
  if (config.ocrProvider !== 'google') {
    return getMockText();
  }

  if (config.googleCloudAuthMode === 'service_account') {
    return extractTextWithServiceAccount(buffer);
  }

  if (config.googleCloudAuthMode === 'api_key') {
    return extractTextWithApiKey(buffer);
  }

  throw new Error(
    'Nepodporovaný GOOGLE_CLOUD_AUTH_MODE. Použi service_account alebo api_key.'
  );
}

module.exports = {
  extractTextFromImage
};
