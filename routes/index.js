exports.index = function (req, res) {
  res.render('index', { user: req.user });
};

exports.account = function (db) {
  return function (req, res) {
    var collection,
        queryToken,
        user = req.user,
        userRecognitions,
        employee,
        employeeRecognitions;

    if (req.query && req.query.name && req.query.name !== '') {
      queryToken = new RegExp('.*' + req.query.name + '.*', 'i');
      collection = db.get('usercollection').find({
        email: { $ne: user.email },
        $or: [
          { displayName: queryToken },
          { firstName: queryToken },
          { lastName: queryToken }
        ]
      }, '');
    } else if (req.query && req.query.id && req.query.id !== '') {
      queryToken = db.get('usercollection').id(req.query.id);
      collection = db.get('usercollection').find({
        email: { $ne: user.email },
        _id: queryToken
      }, '');
    } else {
      queryToken = db.get('usercollection').id(user._id);
      collection = db.get('recognitioncollection').find({}, '');

      collection.on('complete', function (err, docs) {
        user.recognitions = docs || [];
        return res.render('account', { user: user, error: err });
      });

      return;
    }

    collection.on('success', function(docs) {
      if (docs.length === 1) {
        // recognize this user
        employee = docs[0];
        var collection = db.get('recognitioncollection').find({
          to_id: db.get('usercollection').id(user._id),
          from_id: db.get('usercollection').id(employee._id)
        }, '');

        collection.on('complete', function (err, docs) {
          employee.recognitions = docs || [];

          collection = db.get('recognitioncollection').find({
            to_id: db.get('usercollection').id(employee._id),
            from_id: db.get('usercollection').id(user._id)
          }, '');

          collection.on('complete', function (err, docs) {
            user.recognitions = docs || [];
            return res.render('recognize', { user: user, employee: employee, error: err });
          });
        });
      } else {
        // display no results or list of employees
        return res.render('employees', { user: user, employees: docs });
      }
    });

    collection.on('error', function (err) {
      console.log(err);
      return res.render('employees', { user: user, employees: [], error: err });
    });
  };
};

exports.recognize = function (db, followup) {
  return function (req, res) {
    var collection,
        queryToken,
        user = req.user,
        employee,
        message = req.body.message || 'Just \'cuz.'
        to_coins = 100,
        from_coins = 25,
        serverdate = new Date(),
        thisdate = (new Date(serverdate.getUTCFullYear(), serverdate.getUTCMonth(), serverdate.getUTCDate(), serverdate.getUTCHours(), serverdate.getUTCMinutes(), serverdate.getUTCSeconds())).getTime();

    if (req.param && req.param('id') && req.param('id') != '') {
      queryToken = db.get('usercollection').id(req.param('id'));
      collection = db.get('recognitioncollection').find({
        email: { $ne: user.email },
        _id: queryToken
      }, '');

      collection.on('success', function (docs) {
        if (docs.length > 0) {
          employee = docs[0];

          // recognize this user
          collection = db.get('recognitioncollection').insert({
	    to_id: db.get('usercollection').id(employee._id),
	    from_id: db.get('usercollection').id(user._id),
	    message: message,
	    coins: to_coins,
	    date: thisdate
          });

          collection.on('success', function (docs) {
            // increment coins
            collection = db.get('usercollection').update({
              _id: db.get('usercollection').id(employee._id)
            }, {
              $inc: { coins: to_coins }
            });

            collection.on('success', function (docs) {
              res.locals.success = 'You just sent ' + employee.firstName + ' some swag, err, derpcoins. Karma+1';
              if (typeof followup === 'function') {
                req.query.id = employee._id;
                followup(req, res);
              } else {
                res.render('index', { user: user });
              }
            });

            collection.on('error', function (err) {
              res.render('index', { user: user, error: 'Something went terribly wrong and ' + employee.firstName + ' didn\'t get their derpcoins.' });
            });
          });

          collection.on('error', function (err) {
            res.render('index', { user: user, error: 'Something went terribly wrong and ' + employee.firstName + ' didn\'t get their derpcoins.' });
          });
        } else {
          // display no results or list of employees
          res.render('index', { user: user, error: 'One does not simply recognize an invalid user...' });
        }
      });

      collection.on('error', function (err) {
        res.render('index', { user: user, error: err });
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
