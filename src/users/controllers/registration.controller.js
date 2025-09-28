const { UserService } = require('../services/user.service');

const checkUserRegistration = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ 
                isRegistered: false, 
                message: 'Email is required' 
            });
        }

        const userService = new UserService();
        const userData = await userService.findByEmail(email);

        if (userData) {
            // No enviamos datos sensibles al frontend
            const { password, ...safeUserData } = userData;
            return res.json({
                isRegistered: true,
                userData: safeUserData
            });
        }

        return res.json({
            isRegistered: false,
            userData: null
        });
    } catch (error) {
        console.error('Error checking user registration:', error);
        res.status(500).json({ 
            isRegistered: false, 
            message: 'Error checking registration status' 
        });
    }
};

module.exports = {
    checkUserRegistration
};