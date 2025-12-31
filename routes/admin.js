const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Define the route
router.get('/logs', adminController.viewLogs);

module.exports = router;