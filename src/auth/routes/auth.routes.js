const express = require('express');
const passport = require('passport');
const { handleGoogleCallback, handleAuthFailure } = require('../controllers/auth.controller');

const router = express.Router();

// Ruta para iniciar la autenticación con Google
router.get('/google',
  passport.authenticate('google', {
    scope: ['email', 'profile']
  })
);

// Callback de Google
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/auth/failure',
    session: false
  }),
  handleGoogleCallback
);

// Ruta para manejar fallos en la autenticación
router.get('/failure', handleAuthFailure);

module.exports = router;