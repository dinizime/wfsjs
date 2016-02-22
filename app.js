(function() {
  "use strict";
  
  var express = require('express');
  var path = require('path');
  var favicon = require('serve-favicon');
  // log requests - just for dev
  var logger = require('morgan');

  var routes = require('./routes/index');

  var app = express();

  app.use(favicon(__dirname + '/public/favicon.ico'));

  // view engine setup
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'jade');

  app.use(logger('dev'));

  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/bower_components', express.static(path.join(__dirname, '/bower_components')));


  //Lower case query parameters
  app.use(function(req, res, next) {
    for (var key in req.query)
    { 
      req.query[key.toLowerCase()] = req.query[key];
    }
    next();
  });

  app.use('/', routes);

  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });


  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {}
    });
  });

  module.exports = app;
})();