// routes/masterrolls.js
// Routes for masterrolls (employee) management

var express = require('express');
var router = express.Router();
const masterrollsController = require('../controllers/prisma/mongo/masterrollsController');
const verifyToken = require('../middleware/authMiddleware');

// Route to render the masterrolls page
router.get('/', verifyToken, masterrollsController.renderMasterRollsPage);

// API route to get all masterrolls with pagination and search
router.get('/api/masterrolls', verifyToken, masterrollsController.getAllMasterRolls);

// API route to get a single masterroll by ID
router.get('/api/masterrolls/:id', verifyToken, masterrollsController.getMasterRollById);

// API route to create a new masterroll
router.post('/api/masterrolls', verifyToken, masterrollsController.createMasterRoll);

// API route to update a masterroll
router.put('/api/masterrolls/:id', verifyToken, masterrollsController.updateMasterRoll);

// API route to delete a masterroll
router.delete('/api/masterrolls/:id', verifyToken, masterrollsController.deleteMasterRoll);

module.exports = router;