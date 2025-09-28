const db = require('../../database/connection');

class UserService {
    async registerUser(userData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            // Verificar si existe el usuario
            const [existingUser] = await connection.query(
                'SELECT * FROM usuarios WHERE dni = ? OR codigo = ? OR correo = ?',
                [userData.dni, userData.codigo, userData.correo]
            );

            if (existingUser.length > 0) {
                throw new Error('Usuario ya registrado');
            }

            // Insertar nuevo usuario
            const [result] = await connection.query(
                'INSERT INTO usuarios (nombre, apellido, dni, codigo, id_carrera, condicion_med, correo, activo) VALUES (?, ?, ?, ?, ?, ?, ?, true)',
                [userData.nombre, userData.apellido, userData.dni, userData.codigo, 
                 userData.id_carrera, userData.condicion_med, userData.correo]
            );

            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async getUserById(userId) {
        const [user] = await db.query(
            'SELECT * FROM usuarios WHERE id_usuario = ?',
            [userId]
        );
        return user[0];
    }

    async checkRegistrationStatus(email) {
        const [user] = await db.query(
            'SELECT id_usuario, nombre, apellido, dni, codigo, id_carrera, condicion_med, correo FROM usuarios WHERE correo = ?',
            [email]
        );
        return {
            isRegistered: user.length > 0,
            userData: user[0] || null
        };
    }

    async updateUser(userId, userData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            // Verificar duplicados excluyendo el usuario actual
            const [existing] = await connection.query(
                'SELECT * FROM usuarios WHERE (dni = ? OR codigo = ? OR correo = ?) AND id_usuario != ?',
                [userData.dni, userData.codigo, userData.correo, userId]
            );

            if (existing.length > 0) {
                throw new Error('Datos ya registrados para otro usuario');
            }

            // Actualizar usuario
            const [result] = await connection.query(
                `UPDATE usuarios SET 
                    nombre = ?, 
                    apellido = ?, 
                    dni = ?, 
                    codigo = ?, 
                    id_carrera = ?, 
                    condicion_med = ?, 
                    correo = ?
                WHERE id_usuario = ?`,
                [userData.nombre, userData.apellido, userData.dni, 
                 userData.codigo, userData.id_carrera, 
                 userData.condicion_med, userData.correo, userId]
            );

            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async getCarreras() {
        const [carreras] = await db.query('SELECT * FROM Carreras');
        return carreras;
    }
}

module.exports = UserService;