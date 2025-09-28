const jwt = require('jsonwebtoken');

const validateToken = (req, res, next) => {
    try {
        // Obtener el token de las cookies
        const token = req.cookies.jwt;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        // Verificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Agregar el email del usuario al request para uso posterior
        req.user = {
            email: decoded.email
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
    validateToken
};