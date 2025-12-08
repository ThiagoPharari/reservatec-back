const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const db = require('../../database/connection');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/auth/google/callback",
    passReqToCallback: true,
    proxy: true,
    scope: ['email', 'profile']
  },
  async function(request, accessToken, refreshToken, profile, done) {
    try {
      const email = profile.emails[0].value;
      const picture = profile.photos[0].value;
      // Obtener nombre de Google (given_name y family_name)
      const googleNombre = profile.name?.givenName || profile.displayName?.split(' ')[0] || '';
      const googleApellido = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '';
      
      // Verificar si el correo está en la tabla de administradores (encargados)
      const [encargados] = await db.query(
        'SELECT id_admin, nombre, apellido FROM administradores WHERE correo = ?',
        [email]
      );
      
      let role = 'estudiante'; // Por defecto es estudiante
      let userId = null;
      let nombre = googleNombre; // Usar nombre de Google por defecto
      let apellido = googleApellido; // Usar apellido de Google por defecto
      
      if (encargados && encargados.length > 0) {
        // Es un encargado - usar nombre de la BD
        role = 'encargado';
        userId = encargados[0].id_admin;
        nombre = encargados[0].nombre;
        apellido = encargados[0].apellido;
      }
      
      // Guardamos el email, foto, rol, nombre y apellido
      return done(null, {
        email,
        picture,
        role,
        userId,
        nombre,
        apellido
      });
    } catch (error) {
      console.error('Error al verificar rol del usuario:', error);
      // En caso de error, permitir el login como estudiante con datos de Google
      return done(null, {
        email: profile.emails[0].value,
        picture: profile.photos[0].value,
        role: 'estudiante',
        userId: null,
        nombre: profile.name?.givenName || profile.displayName?.split(' ')[0] || '',
        apellido: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || ''
      });
    }
  }
));

// Serialización del usuario
passport.serializeUser(function(user, done) {
    done(null, user);
});

// Deserialización del usuario
passport.deserializeUser(function(user, done) {
    done(null, user);
});