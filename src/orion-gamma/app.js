var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var debug = require('debug')('orion-gamma:app');

// Express
// --------------------
var index = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// Routes
// ----------
app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    debug('404 not found: %o', req);
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    debug(err);
    
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;


// Mongoose
// --------------------
var db = require('./db/db-setup');
var dbLogstart = require('./db/logstart');
dbLogstart.logstart();

console.log('Up and running...');

// Message Dispatcher
// for sending jobs to the Worker Nodes
// --------------------
var disp = require('./dispatcher');
disp.initiate()
    .then(done => { return disp.sendTest(3);})
    .catch(err => {
        console.log('Dispatcher startup error: ' + err);
        // TODO Swallow for now
    });
