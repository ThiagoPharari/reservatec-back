const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const { validateToken } = require('../../shared/middlewares/auth.middleware');

const userController = new UserController();

// Rutas protegidas con token
router.get('/check-registration', validateToken, userController.checkRegistrationStatus.bind(userController));
router.post('/register', validateToken, userController.registerUser.bind(userController));
router.get('/carreras', validateToken, userController.getCarreras.bind(userController));
router.get('/:userId', validateToken, userController.getUserById.bind(userController));
router.put('/:userId', validateToken, userController.updateUser.bind(userController));

module.exports = router;