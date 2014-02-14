
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var passport = require('passport');
var util = require('util');
var GoogleStrategy = require('passport-google').Strategy;
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/derp');


// TODO: Implement Config
var Tw = {
  Config: {
    basePath: function (service) {
      return 'http://imac1.msws.trnswrks.com:3000' + service;
    }
  }
};

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Google profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Use the GoogleStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.
passport.use(new GoogleStrategy({
    returnURL: Tw.Config.basePath('/auth/google/return'),
    realm: Tw.Config.basePath('')
  },
  function(identifier, profile, done) {
    // To keep the example simple, the user's Google profile is returned to
    // represent the logged-in user.  In a typical application, you would want
    // to associate the Google account with a user record in your database,
    // and return that user instead.

    var collection = db.get('usercollection');
    var user = {};

    collection.findOne({ identifier: identifier }, function(err, doc) {
      if (err) {
        // something broke
        done(err);
      } else if (doc !== null) {
        // update db
        done(null, doc);
      } else {
        console.log('INSERT: ' + identifier);
//        collection.insert({
//          "identifier": identifier,
//          "email": profile.emails[0].value,
//          "displayName": profile.displayName,
//          "firstName": profile.name.givenName,
//          "lastName": profile.name.familyName
//        });
        done(null, {
          _id: null,
          email: profile.emails[0].value,
          displayName: profile.displayName,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName
        });
      }
    });
  }
));

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon(path.join(__dirname, 'public/images/favicon.ico')));
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.use(routes.unknown);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/account', routes.ensureAuthenticated(db), routes.account(db));
app.get('/auth/google', passport.authenticate('google', { failureRedirect: '/login' }), routes.auth);
app.get('/auth/google/return', passport.authenticate('google', { failureRedirect: '/login' }), routes.auth);
app.get('/logout', routes.logout);

app.post('/recognize/:id*', routes.ensureAuthenticated(db), routes.recognize(db, routes.account(db)));

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
