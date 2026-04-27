const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { config } = require('../config');
const { extractTextFromImage } = require('../services/ocrService');
const { uploadSourceImage, deleteStoredSourceImage } = require('../services/storageService');
const { buildSummary, getTitle } = require('../services/summarizer');
const {
  getNotesByUserId,
  getNoteByIdForUser,
  saveNote,
  deleteNoteByIdForUser,
  countOcrUsageSince,
  logOcrUsageEvent
} = require('../db');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function startOfUtcDayIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

async function enforceCloudOcrGuards(userId) {
  if (config.ocrProvider !== 'google') {
    return {
      provider: config.ocrProvider,
      perUserToday: 0,
      projectToday: 0
    };
  }

  const sinceIso = startOfUtcDayIso();
  const [perUserToday, projectToday] = await Promise.all([
    countOcrUsageSince({ userId, provider: 'google', sinceIso }),
    countOcrUsageSince({ provider: 'google', sinceIso })
  ]);

  if (perUserToday >= config.ocrMaxCloudRequestsPerUserPerDay) {
    throw createHttpError(
      429,
      `Dosiahol si denný limit cloud OCR pre jeden účet (${config.ocrMaxCloudRequestsPerUserPerDay}). To je zámerná ochrana proti nákladom.`
    );
  }

  if (projectToday >= config.ocrMaxCloudRequestsProjectPerDay) {
    throw createHttpError(
      429,
      `Projekt dosiahol denný cloud OCR limit (${config.ocrMaxCloudRequestsProjectPerDay}). To je zámerná ochrana proti nákladom.`
    );
  }

  return {
    provider: config.ocrProvider,
    perUserToday,
    projectToday
  };
}

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const notes = await getNotesByUserId(req.user.id);
    res.json(notes);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const note = await getNoteByIdForUser(req.params.id, req.user.id);
    if (!note) {
      throw createHttpError(404, 'Poznámka neexistuje alebo nepatrí tomuto účtu.');
    }

    res.json(note);
  } catch (error) {
    next(error);
  }
});

router.post('/process', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw createHttpError(400, 'Nahraj obrázok tabule alebo skrípt.');
    }

    if (!String(req.file.mimetype || '').startsWith('image/')) {
      throw createHttpError(400, 'Podporované sú iba obrázky.');
    }

    await enforceCloudOcrGuards(req.user.id);

    const noteId = crypto.randomUUID();
    const storedImage = await uploadSourceImage({
      noteId,
      userId: req.user.id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer
    });

    let extractedText;
    try {
      extractedText = await extractTextFromImage(req.file.buffer);
    } catch (error) {
      await deleteStoredSourceImage(storedImage).catch(() => {});
      throw error;
    }

    const titleInput = String(req.body.title || '').trim();
    const subjectInput = String(req.body.subject || '').trim();

    if (config.ocrProvider === 'google') {
      await logOcrUsageEvent({
        id: crypto.randomUUID(),
        userId: req.user.id,
        provider: 'google'
      });
    }

    const note = await saveNote({
      id: noteId,
      userId: req.user.id,
      title: titleInput || getTitle(extractedText),
      subject: subjectInput || null,
      sourceFileName: req.file.originalname,
      extractedText,
      summary: buildSummary(extractedText),
      imageStorageProvider: storedImage.imageStorageProvider,
      imageObjectKey: storedImage.imageObjectKey,
      imageUrl: storedImage.imageUrl
    });

    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const note = await getNoteByIdForUser(req.params.id, req.user.id);
    if (!note) {
      throw createHttpError(404, 'Poznámka neexistuje alebo už bola odstránená.');
    }

    await deleteStoredSourceImage(note).catch(() => {});
    const deleted = await deleteNoteByIdForUser(req.params.id, req.user.id);
    if (!deleted) {
      throw createHttpError(404, 'Poznámka neexistuje alebo už bola odstránená.');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = { notesRouter: router };
