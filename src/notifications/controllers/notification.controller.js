const NotificationService = require('../services/notification.service');
const vapidConfig = require('../config/vapid.config');

class NotificationController {
  
  // Obtener la clave pública VAPID para el frontend
  async getPublicKey(req, res) {
    try {
      const publicKey = vapidConfig.getPublicKey();
      res.json({ success: true, publicKey });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Suscribirse a notificaciones push
  async subscribe(req, res) {
    try {
      const { subscription, deviceInfo } = req.body;
      const userId = req.user.id_usuario; // Asume que tienes autenticación

      const result = await NotificationService.subscribe(userId, subscription, deviceInfo);
      res.json(result);
    } catch (error) {
      console.error('Error en subscribe:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Desuscribirse de notificaciones
  async unsubscribe(req, res) {
    try {
      const { endpoint } = req.body;
      const userId = req.user.id_usuario;

      const result = await NotificationService.unsubscribe(userId, endpoint);
      res.json(result);
    } catch (error) {
      console.error('Error en unsubscribe:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Obtener preferencias de notificaciones
  async getPreferences(req, res) {
    try {
      const userId = req.user.id_usuario;
      const preferences = await NotificationService.getPreferences(userId);
      
      if (!preferences) {
        return res.status(404).json({ success: false, message: 'Preferencias no encontradas' });
      }

      res.json({ success: true, preferences });
    } catch (error) {
      console.error('Error en getPreferences:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Actualizar preferencias de notificaciones
  async updatePreferences(req, res) {
    try {
      const userId = req.user.id_usuario;
      const preferences = req.body;

      const result = await NotificationService.updatePreferences(userId, preferences);
      res.json(result);
    } catch (error) {
      console.error('Error en updatePreferences:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Obtener historial de notificaciones
  async getHistory(req, res) {
    try {
      const userId = req.user.id_usuario;
      const limit = parseInt(req.query.limit) || 50;

      const history = await NotificationService.getHistory(userId, limit);
      res.json({ success: true, history });
    } catch (error) {
      console.error('Error en getHistory:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Marcar notificación como clickeada
  async markAsClicked(req, res) {
    try {
      const { notificationId } = req.params;
      await NotificationService.markAsClicked(notificationId);
      res.json({ success: true, message: 'Notificación marcada como leída' });
    } catch (error) {
      console.error('Error en markAsClicked:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Obtener estadísticas de notificaciones
  async getStats(req, res) {
    try {
      const userId = req.user.id_usuario;
      const stats = await NotificationService.getStats(userId);
      res.json({ success: true, stats });
    } catch (error) {
      console.error('Error en getStats:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Enviar notificación de prueba (solo para testing)
  async sendTestNotification(req, res) {
    try {
      const userId = req.user.id_usuario;
      const result = await NotificationService.sendNotification(userId, {
        tipo: 'custom',
        titulo: '🔔 Notificación de Prueba',
        mensaje: 'Esta es una notificación de prueba del sistema ReservaTec',
        data: { test: true },
        url: '/dashboard'
      });

      res.json(result);
    } catch (error) {
      console.error('Error en sendTestNotification:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new NotificationController();
