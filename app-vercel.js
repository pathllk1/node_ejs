// Vercel-optimized version of app.js
require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const csp = require('./middleware/csp');
const sanitizer = require('./middleware/sanitizer');
const verifyToken = require('./middleware/authMiddleware');
const optionalAuth = require('./middleware/optionalAuth');
const requestLogger = require('./middleware/requestLogger');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var aiPyRouter = require('./routes/ai_py_route');
var adminRouter = require('./routes/admin');
var inventorySlsRouter = require('./routes/inventory/sls/inventory');
var inventoryPrsRouter = require('./routes/inventory/prs/inventory');
var inventoryDntRouter = require('./routes/inventory/dnt/inventory');
var inventoryCntRouter = require('./routes/inventory/cnt/inventory');
var inventoryDlnRouter = require('./routes/inventory/dln/inventory');
var inventoryRouter = require('./routes/inventory/sls/inventory');
var ledgerRouter = require('./routes/ledger');
var masterrollsRouter = require('./routes/masterrolls');

var app = express();

// View engine setup
const ejsMate = require('ejs-mate');
app.engine('ejs', ejsMate);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware for Vercel - reduced logging for better performance
if (process.env.NODE_ENV !== 'production') {
  app.use(logger('dev'));
}

app.use(express.json({ limit: '5mb' })); // Vercel payload limit
app.use(express.urlencoded({ extended: false, limit: '5mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Security Middleware
app.use(csp);
app.use(sanitizer);

// Authentication Middleware
app.use(optionalAuth);
app.use(requestLogger);

// Routes
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/ai', verifyToken, aiPyRouter);
app.use('/admin', verifyToken, adminRouter);
app.use('/inventory', verifyToken, inventoryRouter);
app.use('/inventory/sls', verifyToken, inventorySlsRouter);
app.use('/inventory/prs', verifyToken, inventoryPrsRouter);
app.use('/inventory/dnt', verifyToken, inventoryDntRouter);
app.use('/inventory/cnt', verifyToken, inventoryCntRouter);
app.use('/inventory/dln', verifyToken, inventoryDlnRouter);
app.use('/ledger', verifyToken, ledgerRouter);
app.use('/masterrolls', verifyToken, masterrollsRouter);

// Error handling
app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;