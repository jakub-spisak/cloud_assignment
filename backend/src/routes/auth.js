const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { createUser, getUserByEmail, getUserById } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function issueToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

function validateRegisterBody(body) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (name.length < 2) {
    throw createHttpError(400, 'Meno musí mať aspoň 2 znaky.');
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw createHttpError(400, 'Zadaj platný e-mail.');
  }

  if (password.length < 8) {
    throw createHttpError(400, 'Heslo musí mať aspoň 8 znakov.');
  }

  return { name, email, password };
}

function validateLoginBody(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    throw createHttpError(400, 'Vyplň e-mail aj heslo.');
  }

  return { email, password };
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = validateRegisterBody(req.body);
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      throw createHttpError(409, 'Účet s týmto e-mailom už existuje.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash
    });

    const token = issueToken(user);
    res.status(201).json({ user: sanitizeUser(user), token });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = validateLoginBody(req.body);
    const existingUser = await getUserByEmail(email);

    if (!existingUser) {
      throw createHttpError(401, 'Nesprávny e-mail alebo heslo.');
    }

    const passwordMatches = await bcrypt.compare(password, existingUser.passwordHash);
    if (!passwordMatches) {
      throw createHttpError(401, 'Nesprávny e-mail alebo heslo.');
    }

    const user = await getUserById(existingUser.id);
    const token = issueToken(user);
    res.json({ user: sanitizeUser(user), token });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

module.exports = { authRouter: router };
