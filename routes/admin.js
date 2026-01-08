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

// Firm management routes
router.get('/firms', settingsController.getAllFirms);
router.get('/firms/:id', settingsController.getFirm);
router.post('/firms', settingsController.createFirm);
router.put('/firms/:id', settingsController.updateFirm);
router.delete('/firms/:id', settingsController.deleteFirm);
router.post('/firms/assign-user', settingsController.assignUserToFirm);
router.get('/users-with-firms', settingsController.getAllUsersWithFirms);

module.exports = router;