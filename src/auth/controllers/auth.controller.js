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
  
  // Codificar los datos del usuario
  const userData = {
    email,
    role,
    nombre,
    apellido,
    picture
  };
  
  // Redirigir al frontend con el token y datos en la URL (método temporal)
  // El frontend establecerá las cookies en su propio dominio
  const params = new URLSearchParams({
    token: token,
    userData: JSON.stringify(userData)
  });
  
  const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?${params.toString()}`;
  
  console.log('🔐 [AUTH] Redirecting to frontend with token');
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