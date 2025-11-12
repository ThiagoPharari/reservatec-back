const webpush = require('web-push');
const db = require('../../database/connection');

class VapidConfig {
  constructor() {
    this.publicKey = null;
    this.privateKey = null;
    this.contactEmail = 'admin@reservatec.com'; // Cambia esto por tu email real
  }

  async initialize() {
    try {
      // Intentar obtener claves existentes de la BD
      const [keys] = await db.query('SELECT public_key, private_key, contact_email FROM vapid_keys LIMIT 1');

      if (keys.length > 0) {
        // Usar claves existentes
        this.publicKey = keys[0].public_key;
        this.privateKey = keys[0].private_key;
        this.contactEmail = keys[0].contact_email;
        console.log('✅ Claves VAPID cargadas desde la base de datos');
      } else {
        // Generar nuevas claves
        const vapidKeys = webpush.generateVAPIDKeys();
        this.publicKey = vapidKeys.publicKey;
        this.privateKey = vapidKeys.privateKey;

        // Guardar en la BD
        await db.query(
          'INSERT INTO vapid_keys (public_key, private_key, contact_email) VALUES (?, ?, ?)',
          [this.publicKey, this.privateKey, this.contactEmail]
        );
        console.log('✅ Nuevas claves VAPID generadas y guardadas');
      }

      // Configurar web-push con las claves
      webpush.setVapidDetails(
        `mailto:${this.contactEmail}`,
        this.publicKey,
        this.privateKey
      );

      return true;
    } catch (error) {
      console.error('❌ Error al inicializar VAPID:', error);
      throw error;
    }
  }

  getPublicKey() {
    return this.publicKey;
  }
}

module.exports = new VapidConfig();
