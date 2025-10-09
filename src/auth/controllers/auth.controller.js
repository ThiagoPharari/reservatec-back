const jwt = require('jsonwebtoken');

const generateToken = (email) => {
  return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const handleGoogleCallback = (req, res) => {
  // Generar token con el email del usuario
  const token = generateToken(req.user.email);
  
  // Establecer el token como una cookie http-only
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3600000 // 1 hora
  });

  // Establecer la URL de la imagen en una cookie accesible por JavaScript
  if (req.user.picture) {
    res.cookie('userPicture', req.user.picture, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000 // 1 hora
    });
  }

  // Establecer el correo en una cookie accesible por JavaScript
  if (req.user.email) {
    const userData = JSON.stringify({ email: req.user.email });
    res.cookie('userData', userData, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000 // 1 hora
    });
  }
  
  // Redirigir al frontend
  res.redirect(`${process.env.FRONTEND_URL}/user-info`);
};

const handleAuthFailure = (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
};

const handleLogout = (req, res) => {
  try {
    // Limpiar las cookies
    res.clearCookie('jwt');
    res.clearCookie('userPicture');
    res.clearCookie('userData');
    
    res.json({
      success: true,
      message: 'Logout exitoso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al cerrar sesión'
    });
  }
};

module.exports = {
  handleGoogleCallback,
  handleAuthFailure,
  handleLogout
};