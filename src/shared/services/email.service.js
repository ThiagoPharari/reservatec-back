/**
 * @file Servicio de Correos
 * @description Envía correos electrónicos usando nodemailer
 */

const nodemailer = require('nodemailer');
const db = require('../../database/connection');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialize();
    }

    /**
     * Inicializa el transportador de nodemailer
     */
    initialize() {
        // Configurar el transportador de correo
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros puertos
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Verificar la configuración
        this.transporter.verify((error, success) => {
            if (error) {
                console.error('❌ Error al configurar el servicio de correos:', error);
            } else {
                console.log('✅ Servicio de correos configurado correctamente');
            }
        });
    }

    /**
     * Obtiene una plantilla de correo de la base de datos
     * @param {string} tipo - Tipo de plantilla
     * @returns {Promise<object>} Plantilla de correo
     */
    async getTemplate(tipo) {
        try {
            const [templates] = await db.query(
                'SELECT * FROM email_templates WHERE tipo = ? AND activo = 1',
                [tipo]
            );

            if (templates.length === 0) {
                throw new Error(`Plantilla de correo "${tipo}" no encontrada`);
            }

            return templates[0];
        } catch (error) {
            console.error('Error al obtener plantilla:', error);
            throw error;
        }
    }

    /**
     * Reemplaza variables en la plantilla
     * @param {string} template - Plantilla con variables
     * @param {object} data - Datos para reemplazar
     * @returns {string} Plantilla con variables reemplazadas
     */
    replaceVariables(template, data) {
        let result = template;
        for (const [key, value] of Object.entries(data)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, value || '');
        }
        return result;
    }

    /**
     * Envía un correo electrónico
     * @param {string} destinatario - Email del destinatario
     * @param {string} asunto - Asunto del correo
     * @param {string} cuerpoHtml - Contenido HTML del correo
     * @param {object} metadata - Metadata adicional (id_usuario, id_reserva, tipo)
     * @returns {Promise<boolean>} True si se envió correctamente
     */
    async sendEmail(destinatario, asunto, cuerpoHtml, metadata = {}) {
        try {
            const mailOptions = {
                from: `"ReservaTec" <${process.env.SMTP_USER}>`,
                to: destinatario,
                subject: asunto,
                html: cuerpoHtml
            };

            const info = await this.transporter.sendMail(mailOptions);

            // Registrar en el log
            await this.logEmail({
                destinatario,
                asunto,
                tipo: metadata.tipo || 'general',
                estado: 'enviado',
                id_usuario: metadata.id_usuario || null,
                id_reserva: metadata.id_reserva || null,
                error_mensaje: null
            });

            console.log('✅ Correo enviado:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Error al enviar correo:', error);

            // Registrar el error en el log
            await this.logEmail({
                destinatario,
                asunto,
                tipo: metadata.tipo || 'general',
                estado: 'fallido',
                id_usuario: metadata.id_usuario || null,
                id_reserva: metadata.id_reserva || null,
                error_mensaje: error.message
            });

            return false;
        }
    }

    /**
     * Registra el envío de un correo en la base de datos
     * @param {object} logData - Datos del log
     */
    async logEmail(logData) {
        try {
            await db.query(
                `INSERT INTO email_logs 
                (destinatario, tipo, asunto, estado, error_mensaje, id_usuario, id_reserva) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    logData.destinatario,
                    logData.tipo,
                    logData.asunto,
                    logData.estado,
                    logData.error_mensaje,
                    logData.id_usuario,
                    logData.id_reserva
                ]
            );
        } catch (error) {
            console.error('Error al registrar log de correo:', error);
        }
    }

    /**
     * Envía correo de reserva aprobada
     * @param {object} reservaData - Datos de la reserva
     * @returns {Promise<boolean>}
     */
    async enviarCorreoReservaAprobada(reservaData) {
        try {
            const template = await this.getTemplate('reserva_aprobada');
            
            const data = {
                nombre_usuario: `${reservaData.usuario_nombre} ${reservaData.usuario_apellido}`,
                area_nombre: reservaData.area_nombre,
                fecha: new Date(reservaData.fecha).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                horario: `${reservaData.horario_inicio} - ${reservaData.horario_fin}`,
                participantes: reservaData.participantes
            };

            const cuerpoHtml = this.replaceVariables(template.cuerpo_html, data);

            return await this.sendEmail(
                reservaData.usuario_correo,
                template.asunto,
                cuerpoHtml,
                {
                    tipo: 'reserva_aprobada',
                    id_usuario: reservaData.id_usuario,
                    id_reserva: reservaData.id_reserva
                }
            );
        } catch (error) {
            console.error('Error al enviar correo de reserva aprobada:', error);
            return false;
        }
    }

    /**
     * Envía correo de reserva rechazada
     * @param {object} reservaData - Datos de la reserva
     * @returns {Promise<boolean>}
     */
    async enviarCorreoReservaRechazada(reservaData) {
        try {
            const template = await this.getTemplate('reserva_rechazada');
            
            const data = {
                nombre_usuario: `${reservaData.usuario_nombre} ${reservaData.usuario_apellido}`,
                area_nombre: reservaData.area_nombre,
                fecha: new Date(reservaData.fecha).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                horario: `${reservaData.horario_inicio} - ${reservaData.horario_fin}`,
                comentario: reservaData.comentario || 'No se especificó un motivo'
            };

            const cuerpoHtml = this.replaceVariables(template.cuerpo_html, data);

            return await this.sendEmail(
                reservaData.usuario_correo,
                template.asunto,
                cuerpoHtml,
                {
                    tipo: 'reserva_rechazada',
                    id_usuario: reservaData.id_usuario,
                    id_reserva: reservaData.id_reserva
                }
            );
        } catch (error) {
            console.error('Error al enviar correo de reserva rechazada:', error);
            return false;
        }
    }

    /**
     * Envía correo de suspensión de usuario
     * @param {object} userData - Datos del usuario suspendido
     * @returns {Promise<boolean>}
     */
    async enviarCorreoSuspension(userData) {
        try {
            const template = await this.getTemplate('suspension_usuario');
            
            const data = {
                nombre_usuario: `${userData.nombre} ${userData.apellido}`,
                motivo: userData.motivo_suspension || 'No especificado',
                duracion: userData.duracion_texto || 'Indefinida',
                fecha_fin: userData.fecha_fin_suspension 
                    ? new Date(userData.fecha_fin_suspension).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Indefinida'
            };

            const cuerpoHtml = this.replaceVariables(template.cuerpo_html, data);

            return await this.sendEmail(
                userData.correo,
                template.asunto,
                cuerpoHtml,
                {
                    tipo: 'suspension_usuario',
                    id_usuario: userData.id_usuario
                }
            );
        } catch (error) {
            console.error('Error al enviar correo de suspensión:', error);
            return false;
        }
    }
}

// Exportar una única instancia del servicio
const emailService = new EmailService();
module.exports = emailService;
