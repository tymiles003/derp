exports.index = function (req, res) {
  res.render('index', { user: req.user });
};

exports.account = function (db) {
  return function (req, res) {
    var collection,
        queryName;
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
    } else {
      res.render('account', { user: req.user });
    }
  };
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
