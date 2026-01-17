var express = require('express');
var router = express.Router();
const authController = require('../controllers/turso/authController');
const verifyToken = require('../middleware/authMiddleware');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

/* GET login page. */
// URL: /users/login
router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Login' });
});

/* GET signup page. */
// URL: /users/signup
router.get('/signup', function(req, res, next) {
  res.render('signup', { title: 'Sign Up' });
});

// GET profile page (no token verification needed - client will fetch data with token)
router.get('/profile', verifyToken, function(req, res) {
  res.render('dashboard', { title: 'Dashboard' });
});

// POST API Endpoints
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// API endpoint for fetching user profile (protected by token)
router.get('/api/profile', verifyToken, authController.getUserProfile);

module.exports = router;