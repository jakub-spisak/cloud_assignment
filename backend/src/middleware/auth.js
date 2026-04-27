const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { getUserById } = require('../db');

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw createHttpError(401, 'Chýba alebo je neplatný autorizačný token.');
    }

    const payload = jwt.verify(token, config.jwtSecret);
    const user = await getUserById(payload.sub);

    if (!user) {
      throw createHttpError(401, 'Používateľ pre tento token neexistuje.');
    }

    req.user = user;
    return next();
  } catch (error) {
    if (!error.status) {
      error.status = 401;
      error.message = 'Neplatné prihlásenie. Prihlás sa znova.';
    }
    return next(error);
  }
}

module.exports = {
  requireAuth
};
