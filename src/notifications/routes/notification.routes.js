const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification.controller');
const { validateToken } = require('../../shared/middlewares/auth.middleware');

/**
 * @route GET /api/notifications/vapid-public-key
 * @desc Obtener la clave pública VAPID (no requiere autenticación)
 * @access Public
 */
router.get('/vapid-public-key', NotificationController.getPublicKey);

/**
 * @route POST /api/notifications/subscribe
 * @desc Suscribirse a notificaciones push
 * @access Private
 */
router.post('/subscribe', validateToken, NotificationController.subscribe);

/**
 * @route POST /api/notifications/unsubscribe
 * @desc Desuscribirse de notificaciones push
 * @access Private
 */
router.post('/unsubscribe', validateToken, NotificationController.unsubscribe);

/**
 * @route GET /api/notifications/preferences
 * @desc Obtener preferencias de notificaciones
 * @access Private
 */
router.get('/preferences', validateToken, NotificationController.getPreferences);

/**
 * @route PUT /api/notifications/preferences
 * @desc Actualizar preferencias de notificaciones
 * @access Private
 */
router.put('/preferences', validateToken, NotificationController.updatePreferences);

/**
 * @route GET /api/notifications/history
 * @desc Obtener historial de notificaciones
 * @access Private
 */
router.get('/history', validateToken, NotificationController.getHistory);

/**
 * @route POST /api/notifications/:notificationId/clicked
 * @desc Marcar notificación como clickeada
 * @access Private
 */
router.post('/:notificationId/clicked', validateToken, NotificationController.markAsClicked);

/**
 * @route GET /api/notifications/stats
 * @desc Obtener estadísticas de notificaciones
 * @access Private
 */
router.get('/stats', validateToken, NotificationController.getStats);

/**
 * @route POST /api/notifications/test
 * @desc Enviar notificación de prueba
 * @access Private
 */
router.post('/test', validateToken, NotificationController.sendTestNotification);

module.exports = router;
