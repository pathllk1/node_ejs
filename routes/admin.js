const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const firmManagementController = require('../controllers/firmManagementController');
const systemConfigController = require('../controllers/systemConfigController');

// Define the route
router.get('/logs', adminController.viewLogs);
router.get('/firms-management', adminController.viewFirmsManagement);

// Settings routes
router.get('/settings', adminController.viewSettings);
router.get('/settings/:key', systemConfigController.getSetting);
router.put('/settings/:key', systemConfigController.updateSetting);

// GST-specific routes
router.get('/gst-status', systemConfigController.getGstStatus);
router.put('/gst-status', systemConfigController.toggleGstStatus);

// Firm management routes
router.get('/firms', firmManagementController.getAllFirms);
router.get('/firms/:id', firmManagementController.getFirm);
router.post('/firms', firmManagementController.createFirm);
router.put('/firms/:id', firmManagementController.updateFirm);
router.delete('/firms/:id', firmManagementController.deleteFirm);
router.post('/firms/assign-user', firmManagementController.assignUserToFirm);
router.get('/users-with-firms', firmManagementController.getAllUsersWithFirms);

module.exports = router;