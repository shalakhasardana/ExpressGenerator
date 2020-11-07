// we'll import the passport middleware by requiring it
const passport = require('passport');
// we'll import the strategy constructor from the passport-local library using require
const localStrategy = require('passport-local');
// we'll import the User model using require as well. Since we created it with the user
// schema, we have access to the passport local mongoose plugin already.
const User = require('./models/user');
// we'll import the jwt strategy constructor from the passport jwt library
const JwtStrategy = require('passport-jwt').Strategy;
// we'll import another module from passport.jwt called ExtractJwt. This is an object that
// will provide us with several helper methods.
const ExtractJwt = require('passport-jwt').ExtractJwt;
// we'll import the json-web-token node module which we'll use to create signed and
// verified tokens.
const jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
// we'll import the config file that we just created via config.js
const FacebookTokenStrategy = require('passport-facebook-token');
const config = require('./config.js');

// We'll export a property named local from this module and for it's value, we'll use
// a passport method called, passport.use(), which is how we add the specific strategy
// plugin that we want to use to our passport implementation. We want to use the
// local strategy, so we create a new instance of local strategy and pass that in.
// the local strategy instance requires a verify callback function, a function that will
// verify the username and password against the locally stored usernames and passwords.
// We'll use the authenticate method provided by the passport local mongoose plugin for
// that, which is a method on the user model, so all we have to do is pass in
// User.authenticate()
exports.local = passport.use(new localStrategy(User.authenticate()));

// Whenever we use sessions with passport, we need to do a couple of operations on the
// user called serialization and de-serialization. When a user has been successfully
// verified, the user data has to be grabbed from the session and added to the request
// object. There's a process called de-serialization that needs to happen to that data
// in order for that to be possible, and when we receive data about the user from the
// request object and need to convert it to store in the session data, then a corresponding
// process called serialization needs to happen.

// So whenever we use sessions with passport, we'll need to serialize and de-serialize
// the user instance which we can handle using methods provided by passport and
// passport-local-mongoose like so.
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// we'll export a get token method from this module which will be a function that receives
// an object that we'll call user. This user object will contain an id for a user document.
exports.getToken = function (user) {
  // we'll return a token created by this jwt.sign() method. This sign method, which
  // comes from the jwt web token api, will take the user object that was passed in
  // as the first argument. The second argument will be the secret key string from the
  // config module that we created (config.js). We'll supply an additional argument to
  // configure this token to expire in 3600 seconds which is an hour.
  return jwt.sign(user, config.secretKey, { expiresIn: 3600 });
};

// we'll configure the json web token strategy for passport. We'll create a const named
// opts which will be the options for the jwt strategy. We initialize it as an empty
// object and set two properties on this opts object which will be used to configure this
// jwt strategy.
const opts = {};
// the first property will be called jwtFromRequest. We'll set it to the ExtractJwt object
// that we imported earlier, and one of it's methods called .fromAuthHeaderAsBearerToken().
// This option specifies how the json web token should be extracted from the incoming
// request message. A json web token can be sent from the client in various ways. It can
// be sent as a request header, a request body, or even as a url query parameter. This
// option will set the method in which the server expects the server to be set.
// .fromAuthHeaderAsBearerToken() specifically expects the token to be sent to the server
// in an authorization header and as a bearer token.
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
// The second property is called secretOrKey. This option lets us apply the Jwt strategy
// with the key which we'll assign this token. We'll set that to the config secret key
// property we set up in config.js
opts.secretOrKey = config.secretKey;

// we'll export the jwt strategy as jwtPassport, and we'll assign to it the passport.use()
// method, which takes an instance of the jwt strategy as an argument. We'll create that
// using the jwt strategy constructor with 'new JwtStrategy'. The constructor is going
// to need two arguments itself: The first one would be an object with configuration options
// which we created previously as 'opts'. The second one will be a verify callback function
// The verify function, as stated in the passport-jwt documentation, says it takes parameters
// of 'jwt_payload' and 'done'. 'jwt_payload' is an object literal containing the decoded
// jwt payload, and 'done' is a passport error first callback accepting arguments: error,
// user, and info. In the documentation, we can create a verify function by using the
// .findOne() method on the User collection to check for a user document with an id that
// matches the one in the jwt payload object. Depending on the results from that, it returns
// the done callback with different values.
exports.jwtPassport = passport.use(
  new JwtStrategy(opts, (jwt_payload, done) => {
    console.log('JWT payload:', jwt_payload);
    // we use .findOne() on the user's collection to try and find a user with the
    // same id as what's in the token. We'll also set up an error callback.
    User.findOne({ _id: jwt_payload._id }, (err, user) => {
      // if there was an error, we'll send the error to the done callback, and
      // say false to the second argument to say that no user was found
      if (err) {
        return done(err, false);
        // if there wasn't an error then we'll check if a user was found and if so,
        // we'll return the done callback with null as the first arugment to say no
        // error. We'll also pass in the user document as the second argument.
        // Passport will be using this done callback to access the user document
        // so that it can load information from it to the request object. The done
        // method is a function that's written in the passport-jwt-module, so it
        // will do the work for you. We don't need to write it ourselves.
      } else if (user) {
        return done(null, user);
        // The last else block is if there was no error but no user document was
        // found that matched what's in the token. We'll return the done callback
        // with null as the first argument to say there was no error. We'll add
        // false as the second argument to say no user was found.
      } else {
        return done(null, false);
      }
    });
  })
);

exports.facebookPassport = passport.use(
  new FacebookTokenStrategy(
    {
      clientID: config.facebook.clientId,
      clientSecret: config.facebook.clientSecret,
    },
    (accessToken, refreshToken, profile, done) => {
      User.findOne({ facebookId: profile.id }, (err, user) => {
        if (err) {
          return done(err, false);
        }
        if (!err && user) {
          return done(null, user);
        } else {
          user = new User({ username: profile.displayName });
          user.facebookId = profile.id;
          user.firstname = profile.name.givenName;
          user.lastname = profile.name.familyName;
          user.save((err, user) => {
            if (err) {
              return done(err, false);
            } else {
              return done(null, user);
            }
          });
        }
      });
    }
  )
);

// we'll export verifyUser which we'll use to verify that an incoming request is from an
// authenticated user. We'll use passport.authenticate() and give it the argument of
// 'jwt' to say that we want to use the json web token strategy. We'll give it an option
// of session and set it to false, so that we're not using sessions. We set this up as
// a shortcut that we can use for other modules whenever we want to authenticate with the
// jwt strategy.
exports.verifyUser = passport.authenticate('jwt', { session: false });

exports.verifyAdmin = (req, res, next) => {
  if (req.user.admin) {
    return next();
  } else {
    const err = new Error('You are not authorized to perform this operation!');
    err.status = 403;
    return next(err);
  }
};
