const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const { validateToken } = require('../../shared/middlewares/auth.middleware');

const userController = new UserController();

// Rutas para encargados (temporalmente sin autenticación para pruebas)
router.get('/usuarios', userController.getUsuarios.bind(userController));
router.put('/usuarios/:id/estado', userController.cambiarEstadoUsuario.bind(userController));

// Rutas protegidas con token
router.use(validateToken); // Aplicar middleware de autenticación a todas las rutas siguientes

router.get('/check-registration', userController.checkRegistrationStatus.bind(userController));
router.post('/register', userController.registerUser.bind(userController));
router.get('/carreras', userController.getCarreras.bind(userController));
router.get('/:userId', userController.getUserById.bind(userController));
router.put('/:userId', userController.updateUser.bind(userController));

module.exports = router;