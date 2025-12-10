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
  
  console.log('🔐 [AUTH] Google callback - User:', { email, role, userId });
  console.log('🔐 [AUTH] NODE_ENV:', process.env.NODE_ENV);
  console.log('🔐 [AUTH] FRONTEND_URL:', process.env.FRONTEND_URL);
  
  // Generar token con el email, rol y userId
  const token = generateToken(email, role, userId);
  
  const cookieOptions = {
    httpOnly: true,
    secure: true, // Siempre true en producción
    sameSite: 'none', // Permitir cross-site
    path: '/',
    maxAge: 3600000 // 1 hora
  };
  
  console.log('🔐 [AUTH] Cookie options:', cookieOptions);
  
  // Establecer el token como una cookie http-only
  res.cookie('jwt', token, cookieOptions);

  // Establecer la URL de la imagen en una cookie accesible por JavaScript
  if (picture) {
    res.cookie('userPicture', picture, {
      httpOnly: false,
      secure: true,
      sameSite: 'none',
      path: '/',
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
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 3600000 // 1 hora
    });
    console.log('🔐 [AUTH] userData cookie set:', userData);
  }
  
  // Redirigir a una página intermedia de callback que verificará las cookies
  const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback`;
  
  console.log('🔐 [AUTH] Redirecting to:', redirectUrl);
  res.redirect(redirectUrl);
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