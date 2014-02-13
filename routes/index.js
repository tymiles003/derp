exports.index = function (req, res) {
  res.render('index', { user: req.user });
};

exports.account = function (db) {
  return function (req, res) {
    var collection,
        queryName,
        queryId;
    if (req.query && req.query.name && req.query.name !== '') {
      queryName = new RegExp('.*' + req.query.name + '.*', 'i');
      collection = db.get('usercollection').find({
        email: { $ne: req.user.email },
        $or: [
          { displayName: queryName },
          { firstName: queryName },
          { lastName: queryName }
        ]
      }, '', function(err, docs) {
        if (err) {
          // log the error and display no results
          console.log(err);
          res.render('employees', { user: req.user, employees: [], error: err });
        } else if (docs.length === 1) {
          // recognize this user
          res.render('recognize', { user: req.user, employee: docs[0] });
        } else {
          // display no results or list of employees
          res.render('employees', { user: req.user, employees: docs });
        }
      });
    } else if (req.query && req.query.id && req.query.id !== '') {
      queryId = req.query.id;
      collection = db.get('usercollection').find({
        email: { $ne: req.user.email },
        _id: queryId
      }, '', function(err, docs) {
        if (err) {
          // log the error and display no results
          console.log(err);
          res.render('employees', { user: req.user, employees: [], error: err });
        } else if (docs.length === 1) {
          // recognize this user
          res.render('recognize', { user: req.user, employee: docs[0] });
        } else {
          // display no results or list of employees
          res.render('employees', { user: req.user, employees: [] });
        }
      });
    } else {
      res.render('account', { user: req.user });
    }
  };
};

exports.recognize = function (db) {
  var collection,
      queryId;
  return function (req, res) {
    if (req.param && req.param('id') && req.param('id') != '') {
      queryId = req.param('id');
      collection = db.get('usercollection').find({
        email: { $ne: req.user.email },
        _id: queryId
      }, '', function(err, docs) {
        if (err) {
          // log the error and display no results
          console.log(err);
          res.render('index', { user: req.user, error: err });
        } else if (docs.length > 0) {
          // recognize this user
          res.render('recognize', { user: req.user, employee: docs[0], error: 'Unfortunately, you can\'t do that yet...' });
        } else {
          // display no results or list of employees
          res.render('index', { user: req.user, error: 'Dude, I don\'t know what you\'re talking about...' });
        }
      });
    } else {
      res.render('index', { user: req.user, error: 'Dude, I don\'t know what you\'re talking about...' });
    }
  }
};

exports.logout = function (req, res) {
  req.logout();
  res.redirect('/');
};

exports.auth = function (req, res) {
  res.redirect('/');
};

exports.unknown = function (req, res) {
  res.redirect('/');
};

exports.ensureAuthenticated = function (req, res, next) {
  if (req.isAuthenticated()) { 
    return next();
  }
  res.render('index', { error: 'You must be logged in to continue.' });
};
