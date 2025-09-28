const express = require('express');
const { checkUserRegistration } = require('../controllers/registration.controller');
const { verifyToken } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

// Ruta protegida para verificar el registro del usuario
router.get('/check-registration', verifyToken, checkUserRegistration);

module.exports = router;