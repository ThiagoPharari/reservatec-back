const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/google/callback",
    passReqToCallback: true
  },
  function(request, accessToken, refreshToken, profile, done) {
    // Aquí solo necesitamos el correo del usuario
    return done(null, {
      email: profile.email
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