const jwt = require('jsonwebtoken');
const db = require('../../database/connection');

const validateToken = async (req, res, next) => {
    try {
        // Obtener el token de las cookies o del header Authorization
        let token = req.cookies.jwt;
        
        // Si no hay token en cookies, buscar en el header Authorization
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7); // Remover 'Bearer ' del inicio
            }
        }
        
        if (!token) {
            console.log('❌ [AUTH] No token found in cookies or Authorization header');
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        // Verificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ [AUTH] Token verified for user:', decoded.email);
        
        // Si es encargado, usar el userId del token
        if (decoded.role === 'encargado') {
            req.user = {
                email: decoded.email,
                role: 'encargado',
                id_admin: decoded.userId,
                id_usuario: null // Los encargados no tienen id_usuario
            };
            return next();
        }
        
        // Si es estudiante, obtener el id_usuario desde la base de datos
        const [users] = await db.query(
            'SELECT id_usuario, correo FROM usuarios WHERE correo = ?',
            [decoded.email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Agregar el email, rol y id_usuario del usuario al request para uso posterior
        req.user = {
            email: decoded.email,
            role: decoded.role || 'estudiante',
            id_usuario: users[0].id_usuario,
            id_admin: null
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Middleware para validar que el usuario sea encargado
const validateEncargado = async (req, res, next) => {
    try {
        // Primero validar el token
        const token = req.cookies.jwt;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar que el rol sea encargado
        if (decoded.role !== 'encargado') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only encargados can access this resource.'
            });
        }
        
        req.user = {
            email: decoded.email,
            role: 'encargado',
            id_admin: decoded.userId
        };
        
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

module.exports = {
    validateToken,
    validateEncargado
};