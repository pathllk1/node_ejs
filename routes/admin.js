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

// Database management routes
router.post('/backup-db', adminController.backupDatabase);

// For file uploads, we need to set up multer middleware to handle database files
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Make sure this directory exists
    },
    filename: function (req, file, cb) {
        // Preserve original filename for database files
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Allow only database files (.db, .db-wal, .db-shm)
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.db' || ext === '.db-wal' || ext === '.db-shm' || ext === '') {
            // For files without extensions (or special handling), check if it's a known db file type
            const basename = path.basename(file.originalname, ext).toLowerCase();
            if (basename.endsWith('.db') || file.originalname.toLowerCase().includes('db')) {
                cb(null, true);
            } else {
                cb(new Error('Only database files are allowed')); 
            }
        } else {
            cb(new Error('Only database files (.db, .db-wal, .db-shm) are allowed')); 
        }
    }
});

// Handle multiple files for database restore (main db + wal + shm)
router.post('/restore-db', upload.any(), adminController.restoreDatabase);

module.exports = router;