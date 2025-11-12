const jwt = require('jsonwebtoken');

const generateToken = (email, role, userId) => {
  return jwt.sign(
    { email, role, userId }, 
    process.env.JWT_SECRET, 
    { expiresIn: '1h' }
  );
};

const handleGoogleCallback = (req, res) => {
  const { email, picture, role, userId, nombre, apellido } = req.user;
  
  // Generar token con el email, rol y userId
  const token = generateToken(email, role, userId);
  
  // Establecer el token como una cookie http-only
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3600000 // 1 hora
  });

  // Establecer la URL de la imagen en una cookie accesible por JavaScript
  if (picture) {
    res.cookie('userPicture', picture, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000 // 1 hora
    });
  }

  // Establecer el correo y rol en una cookie accesible por JavaScript
  if (email) {
    const userData = JSON.stringify({ 
      email, 
      role,
      nombre,
      apellido
    });
    res.cookie('userData', userData, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000 // 1 hora
    });
  }
  
  // Redirigir según el rol del usuario
  if (role === 'encargado') {
    res.redirect(`${process.env.FRONTEND_URL}/encargado`);
  } else {
    res.redirect(`${process.env.FRONTEND_URL}/user-info`);
  }
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