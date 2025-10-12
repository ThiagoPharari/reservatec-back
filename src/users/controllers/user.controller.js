const UserService = require('../services/user.service');
const UserRegisterDTO = require('../dtos/userRegister.dto');

class UserController {
    constructor() {
        this.userService = new UserService();
    }

    async registerUser(req, res) {
        try {
            const userDTO = new UserRegisterDTO(req.body);
            userDTO.validate();

            const userId = await this.userService.registerUser(userDTO);
            res.status(201).json({ 
                success: true, 
                message: 'Usuario registrado exitosamente',
                userId 
            });
        } catch (error) {
            res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    async checkRegistrationStatus(req, res) {
        try {
            const { email } = req.query;
            
            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'El correo electrónico es requerido'
                });
            }

            const result = await this.userService.checkRegistrationStatus(email);
            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getUserById(req, res) {
        try {
            const { userId } = req.params;
            const user = await this.userService.getUserById(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateUser(req, res) {
        try {
            const { userId } = req.params;
            const userDTO = new UserRegisterDTO(req.body, true);
            userDTO.validate();

            const success = await this.userService.updateUser(userId, userDTO);
            
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Usuario actualizado exitosamente'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getCarreras(req, res) {
        try {
            const carreras = await this.userService.getCarreras();
            res.json({ 
                success: true, 
                data: carreras 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: 'Error al obtener carreras' 
            });
        }
    }

    // Obtener todos los usuarios
    async getUsuarios(req, res) {
        try {
            const usuarios = await this.userService.getUsuarios();
            res.json({
                success: true,
                data: usuarios
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Cambiar estado de usuario (activo/suspendido)
    async cambiarEstadoUsuario(req, res) {
        try {
            const { id } = req.params;
            const { estado } = req.body;

            if (!['activo', 'suspendido'].includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado inválido. Debe ser "activo" o "suspendido"'
                });
            }

            await this.userService.cambiarEstadoUsuario(id, estado);
            
            res.json({
                success: true,
                message: `Usuario ${estado === 'activo' ? 'activado' : 'suspendido'} correctamente`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = UserController;