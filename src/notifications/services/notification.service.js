const db = require('../../database/connection');
const webpush = require('web-push');

class NotificationService {
  
  // ============================================================================
  // SUSCRIPCIONES
  // ============================================================================
  
  async subscribe(userId, subscription, deviceInfo) {
    try {
      const { endpoint, keys } = subscription;
      const { p256dh, auth } = keys;
      const { deviceType = 'desktop', browser = 'unknown' } = deviceInfo;

      // Verificar si ya existe esta suscripción
      const [existing] = await db.query(
        'SELECT id_subscription FROM notification_subscriptions WHERE endpoint = ?',
        [endpoint]
      );

      if (existing.length > 0) {
        // Actualizar suscripción existente
        await db.query(
          `UPDATE notification_subscriptions 
           SET is_active = 1, device_type = ?, browser = ?, updated_at = NOW()
           WHERE endpoint = ?`,
          [deviceType, browser, endpoint]
        );
        return { success: true, message: 'Suscripción actualizada', subscriptionId: existing[0].id_subscription };
      }

      // Crear nueva suscripción
      const [result] = await db.query(
        `INSERT INTO notification_subscriptions 
         (id_usuario, endpoint, p256dh_key, auth_key, device_type, browser) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, endpoint, p256dh, auth, deviceType, browser]
      );

      // Crear preferencias por defecto si no existen
      await db.query(
        `INSERT IGNORE INTO notification_preferences (id_usuario) VALUES (?)`,
        [userId]
      );

      return { success: true, message: 'Suscripción creada', subscriptionId: result.insertId };
    } catch (error) {
      console.error('Error al guardar suscripción:', error);
      throw error;
    }
  }

  async unsubscribe(userId, endpoint) {
    try {
      await db.query(
        'UPDATE notification_subscriptions SET is_active = 0 WHERE id_usuario = ? AND endpoint = ?',
        [userId, endpoint]
      );
      return { success: true, message: 'Suscripción desactivada' };
    } catch (error) {
      console.error('Error al desactivar suscripción:', error);
      throw error;
    }
  }

  async getUserSubscriptions(userId) {
    try {
      const [subscriptions] = await db.query(
        `SELECT endpoint, p256dh_key, auth_key 
         FROM notification_subscriptions 
         WHERE id_usuario = ? AND is_active = 1`,
        [userId]
      );
      return subscriptions;
    } catch (error) {
      console.error('Error al obtener suscripciones:', error);
      throw error;
    }
  }

  // ============================================================================
  // ENVÍO DE NOTIFICACIONES
  // ============================================================================

  async sendNotification(userId, notificationData) {
    try {
      const { tipo, titulo, mensaje, data = {}, url = '/dashboard' } = notificationData;

      // Verificar preferencias del usuario
      const [preferences] = await db.query(
        `SELECT ${tipo} as enabled FROM notification_preferences WHERE id_usuario = ?`,
        [userId]
      );

      if (preferences.length === 0 || !preferences[0].enabled) {
        console.log(`Usuario ${userId} tiene deshabilitadas las notificaciones de tipo: ${tipo}`);
        return { success: false, message: 'Notificaciones deshabilitadas por el usuario' };
      }

      // Obtener suscripciones activas
      const subscriptions = await this.getUserSubscriptions(userId);

      if (subscriptions.length === 0) {
        console.log(`Usuario ${userId} no tiene suscripciones activas`);
        return { success: false, message: 'Sin suscripciones activas' };
      }

      // Preparar payload de la notificación
      const payload = JSON.stringify({
        title: titulo,
        body: mensaje,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        image: data.image || null,
        data: {
          url: url,
          tipo: tipo,
          timestamp: Date.now(),
          ...data
        },
        actions: [
          {
            action: 'open',
            title: 'Ver detalles',
            icon: '/icon-check.png'
          },
          {
            action: 'close',
            title: 'Cerrar',
            icon: '/icon-close.png'
          }
        ],
        requireInteraction: tipo === 'suspension' || tipo === 'material_vencido',
        vibrate: [200, 100, 200],
        tag: `${tipo}-${userId}-${Date.now()}`
      });

      // Guardar en historial
      const [historyResult] = await db.query(
        `INSERT INTO notification_history 
         (id_usuario, tipo, titulo, mensaje, data_extra, status) 
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [userId, tipo, titulo, mensaje, JSON.stringify(data)]
      );

      const notificationId = historyResult.insertId;
      let successCount = 0;
      let failureCount = 0;
      const errors = [];

      // Enviar a todas las suscripciones
      const sendPromises = subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key
          }
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          successCount++;
        } catch (error) {
          failureCount++;
          errors.push({ endpoint: sub.endpoint, error: error.message });

          // Si el endpoint es inválido (410 Gone), desactivar suscripción
          if (error.statusCode === 410) {
            await db.query(
              'UPDATE notification_subscriptions SET is_active = 0 WHERE endpoint = ?',
              [sub.endpoint]
            );
          }
        }
      });

      await Promise.all(sendPromises);

      // Actualizar estado en historial
      const finalStatus = successCount > 0 ? 'sent' : 'failed';
      const errorMessage = errors.length > 0 ? JSON.stringify(errors) : null;

      await db.query(
        `UPDATE notification_history 
         SET status = ?, sent_at = NOW(), error_message = ? 
         WHERE id_notification = ?`,
        [finalStatus, errorMessage, notificationId]
      );

      return {
        success: successCount > 0,
        message: `Enviado a ${successCount} dispositivos, ${failureCount} fallos`,
        stats: { successCount, failureCount, errors }
      };

    } catch (error) {
      console.error('Error al enviar notificación:', error);
      throw error;
    }
  }

  // ============================================================================
  // NOTIFICACIONES ESPECÍFICAS POR EVENTO
  // ============================================================================

  async notifyReservaAprobada(userId, reserva) {
    return await this.sendNotification(userId, {
      tipo: 'reserva_aprobada',
      titulo: '✅ Reserva Aprobada',
      mensaje: `Tu reserva para ${reserva.nombreArea} el ${reserva.fecha} a las ${reserva.hora} fue aprobada`,
      data: { id_reserva: reserva.id_reserva },
      url: '/mis-reservas'
    });
  }

  async notifyReservaRechazada(userId, reserva, motivo) {
    return await this.sendNotification(userId, {
      tipo: 'reserva_rechazada',
      titulo: '❌ Reserva Rechazada',
      mensaje: `Tu reserva fue rechazada. Motivo: ${motivo}`,
      data: { id_reserva: reserva.id_reserva, motivo },
      url: '/mis-reservas'
    });
  }

  async notifyRecordatorio(userId, reserva) {
    return await this.sendNotification(userId, {
      tipo: 'recordatorio',
      titulo: '⏰ Recordatorio de Reserva',
      mensaje: `Tu reserva en ${reserva.nombreArea} es en 1 hora (${reserva.hora})`,
      data: { id_reserva: reserva.id_reserva },
      url: '/mis-reservas'
    });
  }

  async notifyMaterialDevolver(userId, material) {
    return await this.sendNotification(userId, {
      tipo: 'material_devolver',
      titulo: '⚽ Devolver Material',
      mensaje: `No olvides devolver el material deportivo antes de las ${material.hora_limite}`,
      data: { id_material: material.id_material },
      url: '/mis-reservas'
    });
  }

  async notifySuspension(userId, motivo, diasSuspension) {
    return await this.sendNotification(userId, {
      tipo: 'suspension',
      titulo: '🚫 Cuenta Suspendida',
      mensaje: `Has sido suspendido por ${diasSuspension} días. Motivo: ${motivo}`,
      data: { dias: diasSuspension, motivo },
      url: '/perfil'
    });
  }

  async notifyNuevaReserva(encargadoId, reserva) {
    return await this.sendNotification(encargadoId, {
      tipo: 'nueva_reserva',
      titulo: '📋 Nueva Reserva Pendiente',
      mensaje: `${reserva.nombreUsuario} solicita reserva en ${reserva.nombreArea}`,
      data: { id_reserva: reserva.id_reserva },
      url: '/encargado/reservas'
    });
  }

  async notifyMaterialVencido(encargadoId, material) {
    return await this.sendNotification(encargadoId, {
      tipo: 'material_vencido',
      titulo: '⚠️ Material No Devuelto',
      mensaje: `${material.nombreUsuario} no devolvió el material a tiempo`,
      data: { id_material: material.id_material, id_usuario: material.id_usuario },
      url: '/encargado/materiales'
    });
  }

  // ============================================================================
  // PREFERENCIAS
  // ============================================================================

  async getPreferences(userId) {
    try {
      const [prefs] = await db.query(
        'SELECT * FROM notification_preferences WHERE id_usuario = ?',
        [userId]
      );
      return prefs[0] || null;
    } catch (error) {
      console.error('Error al obtener preferencias:', error);
      throw error;
    }
  }

  async updatePreferences(userId, preferences) {
    try {
      const fields = [];
      const values = [];

      Object.keys(preferences).forEach(key => {
        fields.push(`${key} = ?`);
        values.push(preferences[key]);
      });

      values.push(userId);

      await db.query(
        `UPDATE notification_preferences SET ${fields.join(', ')} WHERE id_usuario = ?`,
        values
      );

      return { success: true, message: 'Preferencias actualizadas' };
    } catch (error) {
      console.error('Error al actualizar preferencias:', error);
      throw error;
    }
  }

  // ============================================================================
  // ESTADÍSTICAS Y HISTORIAL
  // ============================================================================

  async getHistory(userId, limit = 50) {
    try {
      const [history] = await db.query(
        `SELECT * FROM notification_history 
         WHERE id_usuario = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [userId, limit]
      );
      return history;
    } catch (error) {
      console.error('Error al obtener historial:', error);
      throw error;
    }
  }

  async markAsClicked(notificationId) {
    try {
      await db.query(
        `UPDATE notification_history 
         SET status = 'clicked', clicked_at = NOW() 
         WHERE id_notification = ?`,
        [notificationId]
      );
    } catch (error) {
      console.error('Error al marcar notificación:', error);
    }
  }

  async getStats(userId) {
    try {
      const [stats] = await db.query(
        'SELECT * FROM notification_stats WHERE id_usuario = ?',
        [userId]
      );
      return stats[0] || null;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
