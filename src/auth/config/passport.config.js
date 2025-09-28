const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/auth/google/callback",
    passReqToCallback: true,
    proxy: true,
    scope: ['email', 'profile']
  },
  function(request, accessToken, refreshToken, profile, done) {
    // Guardamos el email y la foto de perfil
    console.log('Perfil de Google:', profile);
    return done(null, {
      email: profile.emails[0].value, // El correo está en profile.emails[0].value
      picture: profile.photos[0].value // La foto está en profile.photos[0].value
    });
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