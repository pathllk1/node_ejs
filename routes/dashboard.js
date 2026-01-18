var express = require('express');
var router = express.Router();
const verifyToken = require('../middleware/authMiddleware');

/* GET inventory dashboard page. */
router.get('/inventory', verifyToken, function(req, res, next) {
  res.render('dashboard/inventory', { 
    title: 'Inventory Dashboard',
    user: req.user 
  });
});

/* GET accounting dashboard page. */
router.get('/accounting', verifyToken, function(req, res, next) {
  res.render('dashboard/accounting', { 
    title: 'Accounting Dashboard',
    user: req.user 
  });
});

module.exports = router;