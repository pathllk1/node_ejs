var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const csp = require('./middleware/csp');
const sanitizer = require('./middleware/sanitizer');
const optionalAuth = require('./middleware/optionalAuth');
const requestLogger = require('./middleware/requestLogger');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var aiPyRouter = require('./routes/ai_py_route');
var adminRouter = require('./routes/admin');

var app = express();

// view engine setup
const ejsMate = require('ejs-mate'); // <--- Import this

// View engine setup
app.engine('ejs', ejsMate);          // <--- Add this line
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Security Middleware - Apply CSP and other security headers FIRST
app.use(csp);

// Input Sanitization
app.use(sanitizer);

// Optional Auth - Extract user info if available (for logging purposes)
// This runs BEFORE requestLogger so req.user is available for authenticated requests
app.use(optionalAuth);

// Request Logging - Now can access req.user if authenticated
app.use(requestLogger);

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/ai', aiPyRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
