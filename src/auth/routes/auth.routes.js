const express = require('express');
const passport = require('passport');
const { handleGoogleCallback, handleAuthFailure } = require('../controllers/auth.controller');

const router = express.Router();

// Ruta para iniciar la autenticación con Google
router.get('/google',
  passport.authenticate('google', {
    scope: ['email', 'profile'],
    accessType: 'offline',
    prompt: 'consent',
    state: Math.random().toString(36).substring(7)
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

// Ruta para cerrar sesión
router.post('/logout', (req, res) => {
  res.clearCookie('jwt');
  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;