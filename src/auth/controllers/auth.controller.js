const jwt = require('jsonwebtoken');

const generateToken = (email) => {
  return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

const handleGoogleCallback = (req, res) => {
  // Generar token con el email del usuario
  const token = generateToken(req.user.email);
  
  // Redirigir al frontend con el token
  res.redirect(`${process.env.FRONTEND_URL}/user-info?token=${token}`);
};

const handleAuthFailure = (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
};

module.exports = {
  handleGoogleCallback,
  handleAuthFailure
};