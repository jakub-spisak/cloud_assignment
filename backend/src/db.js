const sql = require('mssql');
const { config } = require('./config');

let pool;

function getBaseSqlConfig(databaseName) {
  return {
    server: config.db.server,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: databaseName,
    options: {
      encrypt: config.db.encrypt,
      trustServerCertificate: config.db.trustServerCertificate
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };
}

async function createDatabaseIfMissing() {
  const bootstrapPool = await new sql.ConnectionPool(getBaseSqlConfig('master')).connect();

  try {
    await bootstrapPool
      .request()
      .input('dbName', sql.NVarChar(128), config.db.database)
      .query(`
        IF DB_ID(@dbName) IS NULL
        BEGIN
          DECLARE @statement NVARCHAR(MAX) = N'CREATE DATABASE [' + REPLACE(@dbName, ']', ']]') + N']';
          EXEC(@statement);
        END
      `);
  } finally {
    await bootstrapPool.close();
  }
}

async function connectWithRetry(maxAttempts = 20, delayMs = 4000) {
  if (pool) {
    return pool;
  }

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await createDatabaseIfMissing();
      pool = await new sql.ConnectionPool(getBaseSqlConfig(config.db.database)).connect();
      return pool;
    } catch (error) {
      lastError = error;
      console.warn(`DB connect attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

async function ensureSchema() {
  const connection = await connectWithRetry();
  await connection.request().query(`
    IF OBJECT_ID('dbo.Users', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Users (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        Name NVARCHAR(120) NOT NULL,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255) NOT NULL,
        CreatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSDATETIMEOFFSET()
      );
    END

    IF OBJECT_ID('dbo.Notes', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Notes (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL,
        Title NVARCHAR(255) NOT NULL,
        Subject NVARCHAR(120) NULL,
        SourceFileName NVARCHAR(255) NOT NULL,
        ExtractedText NVARCHAR(MAX) NOT NULL,
        Summary NVARCHAR(MAX) NOT NULL,
        ImageStorageProvider NVARCHAR(40) NULL,
        ImageObjectKey NVARCHAR(600) NULL,
        ImageUrl NVARCHAR(1200) NULL,
        CreatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_Notes_CreatedAt DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_Notes_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE
      );
      CREATE INDEX IX_Notes_UserId_CreatedAt ON dbo.Notes(UserId, CreatedAt DESC);
    END

    IF COL_LENGTH('dbo.Notes', 'ImageStorageProvider') IS NULL
      ALTER TABLE dbo.Notes ADD ImageStorageProvider NVARCHAR(40) NULL;

    IF COL_LENGTH('dbo.Notes', 'ImageObjectKey') IS NULL
      ALTER TABLE dbo.Notes ADD ImageObjectKey NVARCHAR(600) NULL;

    IF COL_LENGTH('dbo.Notes', 'ImageUrl') IS NULL
      ALTER TABLE dbo.Notes ADD ImageUrl NVARCHAR(1200) NULL;

    IF OBJECT_ID('dbo.OcrUsageEvents', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.OcrUsageEvents (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL,
        Provider NVARCHAR(40) NOT NULL,
        CreatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_OcrUsageEvents_CreatedAt DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_OcrUsageEvents_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE
      );
      CREATE INDEX IX_OcrUsageEvents_UserId_CreatedAt ON dbo.OcrUsageEvents(UserId, CreatedAt DESC);
      CREATE INDEX IX_OcrUsageEvents_Provider_CreatedAt ON dbo.OcrUsageEvents(Provider, CreatedAt DESC);
    END
  `);
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt
  };
}

function mapNote(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    subject: row.subject,
    sourceFileName: row.sourceFileName,
    summary: row.summary,
    extractedText: row.extractedText,
    imageStorageProvider: row.imageStorageProvider,
    imageObjectKey: row.imageObjectKey,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt
  };
}

async function createUser(user) {
  const connection = await connectWithRetry();
  await connection
    .request()
    .input('id', sql.UniqueIdentifier, user.id)
    .input('name', sql.NVarChar(120), user.name)
    .input('email', sql.NVarChar(255), user.email)
    .input('passwordHash', sql.NVarChar(255), user.passwordHash)
    .query(`
      INSERT INTO dbo.Users (Id, Name, Email, PasswordHash)
      VALUES (@id, @name, @email, @passwordHash)
    `);

  return getUserById(user.id);
}

async function getUserByEmail(email) {
  const connection = await connectWithRetry();
  const result = await connection
    .request()
    .input('email', sql.NVarChar(255), email)
    .query(`
      SELECT Id AS id, Name AS name, Email AS email, PasswordHash AS passwordHash, CreatedAt AS createdAt
      FROM dbo.Users
      WHERE Email = @email
    `);

  return result.recordset[0] || null;
}

async function getUserById(id) {
  const connection = await connectWithRetry();
  const result = await connection
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`
      SELECT Id AS id, Name AS name, Email AS email, CreatedAt AS createdAt
      FROM dbo.Users
      WHERE Id = @id
    `);

  return mapUser(result.recordset[0]);
}

async function saveNote(note) {
  const connection = await connectWithRetry();
  await connection
    .request()
    .input('id', sql.UniqueIdentifier, note.id)
    .input('userId', sql.UniqueIdentifier, note.userId)
    .input('title', sql.NVarChar(255), note.title)
    .input('subject', sql.NVarChar(120), note.subject || null)
    .input('sourceFileName', sql.NVarChar(255), note.sourceFileName)
    .input('extractedText', sql.NVarChar(sql.MAX), note.extractedText)
    .input('summary', sql.NVarChar(sql.MAX), note.summary)
    .input('imageStorageProvider', sql.NVarChar(40), note.imageStorageProvider || null)
    .input('imageObjectKey', sql.NVarChar(600), note.imageObjectKey || null)
    .input('imageUrl', sql.NVarChar(1200), note.imageUrl || null)
    .query(`
      INSERT INTO dbo.Notes (
        Id,
        UserId,
        Title,
        Subject,
        SourceFileName,
        ExtractedText,
        Summary,
        ImageStorageProvider,
        ImageObjectKey,
        ImageUrl
      )
      VALUES (
        @id,
        @userId,
        @title,
        @subject,
        @sourceFileName,
        @extractedText,
        @summary,
        @imageStorageProvider,
        @imageObjectKey,
        @imageUrl
      )
    `);

  return getNoteByIdForUser(note.id, note.userId);
}

async function getNotesByUserId(userId) {
  const connection = await connectWithRetry();
  const result = await connection
    .request()
    .input('userId', sql.UniqueIdentifier, userId)
    .query(`
      SELECT
        Id AS id,
        UserId AS userId,
        Title AS title,
        Subject AS subject,
        SourceFileName AS sourceFileName,
        Summary AS summary,
        ImageStorageProvider AS imageStorageProvider,
        ImageObjectKey AS imageObjectKey,
        ImageUrl AS imageUrl,
        CreatedAt AS createdAt
      FROM dbo.Notes
      WHERE UserId = @userId
      ORDER BY CreatedAt DESC
    `);

  return result.recordset.map(mapNote);
}

async function getNoteByIdForUser(id, userId) {
  const connection = await connectWithRetry();
  const result = await connection
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .input('userId', sql.UniqueIdentifier, userId)
    .query(`
      SELECT
        Id AS id,
        UserId AS userId,
        Title AS title,
        Subject AS subject,
        SourceFileName AS sourceFileName,
        ExtractedText AS extractedText,
        Summary AS summary,
        ImageStorageProvider AS imageStorageProvider,
        ImageObjectKey AS imageObjectKey,
        ImageUrl AS imageUrl,
        CreatedAt AS createdAt
      FROM dbo.Notes
      WHERE Id = @id AND UserId = @userId
    `);

  return mapNote(result.recordset[0]);
}

async function deleteNoteByIdForUser(id, userId) {
  const connection = await connectWithRetry();
  const result = await connection
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .input('userId', sql.UniqueIdentifier, userId)
    .query(`
      DELETE FROM dbo.Notes
      WHERE Id = @id AND UserId = @userId;

      SELECT @@ROWCOUNT AS deletedCount;
    `);

  return result.recordset[0]?.deletedCount > 0;
}

async function countOcrUsageSince({ userId = null, provider = null, sinceIso }) {
  const connection = await connectWithRetry();
  const request = connection.request().input('sinceIso', sql.DateTimeOffset, sinceIso);
  let whereClause = 'CreatedAt >= @sinceIso';

  if (userId) {
    request.input('userId', sql.UniqueIdentifier, userId);
    whereClause += ' AND UserId = @userId';
  }

  if (provider) {
    request.input('provider', sql.NVarChar(40), provider);
    whereClause += ' AND Provider = @provider';
  }

  const result = await request.query(`
    SELECT COUNT(*) AS usageCount
    FROM dbo.OcrUsageEvents
    WHERE ${whereClause}
  `);

  return Number(result.recordset[0]?.usageCount || 0);
}

async function logOcrUsageEvent({ id, userId, provider }) {
  const connection = await connectWithRetry();
  await connection
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .input('userId', sql.UniqueIdentifier, userId)
    .input('provider', sql.NVarChar(40), provider)
    .query(`
      INSERT INTO dbo.OcrUsageEvents (Id, UserId, Provider)
      VALUES (@id, @userId, @provider)
    `);
}

module.exports = {
  connectWithRetry,
  ensureSchema,
  createUser,
  getUserByEmail,
  getUserById,
  saveNote,
  getNotesByUserId,
  getNoteByIdForUser,
  deleteNoteByIdForUser,
  countOcrUsageSince,
  logOcrUsageEvent
};
