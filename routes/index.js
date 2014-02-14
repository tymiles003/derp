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
        from_coins = 50,
        serverdate = new Date(),
        thisdate = (new Date(serverdate.getUTCFullYear(), serverdate.getUTCMonth(), serverdate.getUTCDate(), serverdate.getUTCHours(), serverdate.getUTCMinutes(), serverdate.getUTCSeconds())).getTime();

    if (req.param && req.param('id') && req.param('id') != '') {
      queryToken = db.get('usercollection').id(req.param('id'));
      collection = db.get('usercollection').find({
        email: { $ne: user.email },
        _id: queryToken
      }, '');

      collection.on('success', function (docs) {
        if (docs.length > 0) {
          employee = docs[0];

          // find employees recent activity
          collection = db.get('recognitioncollection').find({
            to_id: db.get('usercollection').id(employee._id),
            date: { $gt: thisdate-36000000 }
          }, '');

          collection.on('complete', function (err, docs) {
            if (docs) {
              to_coins = Math.floor(to_coins * Math.pow(.9, docs.length));
            }

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
                // reward user for recognizing
                collection = db.get('recognitioncollection').find({
                  from_id: db.get('usercollection').id(user._id),
                  date: { $gt: thisdate-36000000 }
                }, '');

                collection.on('complete', function (err, docs) {
                  if (docs) {
                    from_coins = Math.floor(from_coins * Math.pow(.75, docs.length-1));
                  }

                  collection = db.get('usercollection').update({
                    _id: db.get('usercollection').id(user._id)
                  }, {
                    $inc: { coins: from_coins }
                  })

                  collection.on('complete', function (err, docs) {
                    user.coins += from_coins;
                    req.user = user;
                    req.query.id = employee._id;

                    if (typeof followup === 'function') {
                      followup(req, res);
                    } else {
                      return res.render('index', { user: user });
                    }
                  });
                });
              });

              collection.on('error', function (err) {
                return res.render('index', { user: user, error: 'Something went terribly wrong and ' + employee.firstName + ' didn\'t get their derpcoins.' });
              });
            });

            collection.on('error', function (err) {
              return res.render('index', { user: user, error: 'Something went terribly wrong and ' + employee.firstName + ' didn\'t get their derpcoins.' });
            });
          });
        } else {
          // display no results or list of employees
          return res.render('index', { user: user, error: 'One does not simply recognize an invalid user...' });
        }
      });

      collection.on('error', function (err) {
        return res.render('index', { user: user, error: err });
      });
    } else {
      return res.render('index', { user: req.user, error: 'Dude, I don\'t know what you\'re talking about...' });
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

exports.updateUser = function (db) {
  return function (req, res, next) {
    if (req && req.user && req.user._id) {
      var collection = db.get('usercollection').findOne({ _id: req.user._id });

      collection.on('complete', function (err, doc) {
        if (doc) {
          req.user = doc;
        }
        return next();
      });
    } else {
      return next();
    }
  };
};
