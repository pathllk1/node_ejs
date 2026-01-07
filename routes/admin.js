const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const settingsController = require('../controllers/settingsController');

// Define the route
router.get('/logs', adminController.viewLogs);

// Settings routes
router.get('/settings', adminController.viewSettings);
router.get('/settings/:key', settingsController.getSetting);
router.put('/settings/:key', settingsController.updateSetting);

// GST-specific routes
router.get('/gst-status', settingsController.getGstStatus);
router.put('/gst-status', settingsController.toggleGstStatus);

module.exports = router;