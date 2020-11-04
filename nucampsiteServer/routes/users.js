const express = require('express');
const User = require('../models/user');
// We'll import passport using require
const passport = require('passport');
// we'll import the authenticate module
const authenticate = require('../authenticate');

const router = express.Router();

/* GET users listing. */
router.get('/', authenticate.verifyUser, authenticate.verifyAdmin, function (
  req,
  res,
  next
) {
  res.send('respond with a resource');
});

// The passport-local-mongoose plugin provides us with methods that are useful for
// registering and logging in users.
router.post('/signup', (req, res) => {
  // This register method takes three arguments: The first will be a new User() that we
  // create with the name given to us from the client. The second will be the password
  // which we can plug directly from the incoming request from the client. The third will
  // be a callback method which will receive an error if there was one from the register
  // method, or this error variable will be null if there was no error
  User.register(
    new User({ username: req.body.username }),
    req.body.password,
    // we need to add a second user argument for when if the registration was successful,
    // would contain the user document that was created.
    (err, user) => {
      if (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.json({ err: err });
      } else {
        // We need to check if a first name was sent in the request body
        if (req.body.firstname) {
          // if so, we need to set the user.firstname to that value
          user.firstname = req.body.firstname;
        }
        // We need to also check if a last name was sent in the request body
        if (req.body.lastname) {
          // if so, we need to set the user.lastname to that value
          user.lastname = req.body.lastname;
        }
        // We need to save this to the database, so we use user.save() and handle
        // any potential errors in a callback
        user.save((err) => {
          // if there was an error we'll send back a response
          if (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.json({ err: err });
            return;
          }
          // if there was no error, we'll use passport to authenticate the newly
          // registered user. This will ensure the registration was successful. This
          // authenticate method will return a function and we'll need to call that
          // function by setting up a second argument list here which will pass the req
          // and res objects, along with a callback function that will set up a
          // response to the client.
          passport.authenticate('local')(req, res, () => {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json({ success: true, status: 'Registration Successful!' });
          });
        });
      }
    }
  );
});

// We'll also simply the login process using passport. First we'll add another
// middlware to this post method. Remember, it's possible to insert multiple
// middleware functions in a http routing method. We'll insert it after the first
// argument and we'll pass in passport.authenticate() and pass in string of 'local'.
// this will enable passport authentication on this route, and if there's no error
// with this middleware, then it will just continue on to this next middleware
router.post('/login', passport.authenticate('local'), (req, res) => {
  // Once we authenticate with a username and passport, then we'll issue a token
  // to the user using the get token method that we imported from the authenticate
  // module and passing in an object that contains a payload. For the payload,
  // we'll include the user id from the request object.
  const token = authenticate.getToken({ _id: req.user._id });
  // we will assume that there was no error, as any error will be handled by the
  // passport middleware, so all we have to do here is set a response to the client
  // for if the login was successful.
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  // We'll include the token in the response object.
  res.json({
    success: true,
    token: token,
    status: 'You are successfully logged in!',
  });
});

// We will add the endpoint for logging out the user. For this we'll use a get, because
// the client is not submitting any information to the server. We are simply logging out.
// We'll set up the path and the middleware function as arguments.
router.get('/logout', (req, res, next) => {
  // First thing we do is check if a session exists.
  if (req.session) {
    // if it does, we have to destroy the session using req.session.destroy(). This will
    // delete the session file on the server side. And if the client tries to authenticate
    // using that session's id, it will not be recognized by the server as a valid session.
    req.session.destroy();
    // Now, we are going to use an express method on the response object called clearCookie()
    // We will pass in the name of the session that we configured in app.js which was
    // 'session-id'. This will clear the cookie that's been stored on the client.
    res.clearCookie('session-id');
    // Then, we will call a method on the response object called redirect(). This will
    // redirect the user to this route path which will just be localhost:3000/
    res.redirect('/');
    // else block for when session does not exist. (basically when someone tries to logout
    // when they're not even logged in)
  } else {
    const err = new Error('You are not logged in!');
    err.status = 401;
    return next(Err);
  }
});

module.exports = router;
