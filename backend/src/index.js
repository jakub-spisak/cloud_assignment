const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { config } = require('./config');
const { ensureSchema } = require('./db');
const { authRouter } = require('./routes/auth');
const { notesRouter } = require('./routes/notes');

async function start() {
  if (!config.jwtSecret) {
    throw new Error('Chýba JWT_SECRET v .env alebo App Service nastaveniach.');
  }

  await ensureSchema();

  const app = express();

  app.use(helmet());
  app.use(morgan('combined'));
  app.use(
    cors({
      origin: config.allowedOrigin === '*' ? true : config.allowedOrigin
    })
  );
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      app: 'Noteworthy API',
      env: config.nodeEnv,
      ocr: {
        provider: config.ocrProvider,
        authMode: config.googleCloudAuthMode,
        cloudDailyPerUserLimit: config.ocrMaxCloudRequestsPerUserPerDay,
        cloudDailyProjectLimit: config.ocrMaxCloudRequestsProjectPerDay
      },
      storage: {
        provider: config.storageProvider,
        storeSourceImages: config.storeSourceImages,
        azureBlobContainerName: config.azureBlobContainerName
      }
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/notes', notesRouter);

  app.use((error, req, res, next) => {
    console.error(error);
    const status = error.status || 500;
    res.status(status).json({
      message: error.message || 'Interná chyba servera.'
    });
  });

  app.listen(config.port, () => {
    console.log(`Noteworthy API beží na porte ${config.port}`);
  });
}

start().catch((error) => {
  console.error('Aplikácia sa nespustila:', error);
  process.exit(1);
});
