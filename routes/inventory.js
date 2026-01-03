const express = require('express');
const router = express.Router();
// Adjust path if your folder structure is different
const controller = require('../controllers/inventory/inventory');

// View Route
router.get('/stocks', controller.renderStocksPage);

// API Routes
router.get('/api/stocks', controller.getAllStocks);
router.post('/api/stocks', controller.createStock);
router.put('/api/stocks/:id', controller.updateStock);
router.delete('/api/stocks/:id', controller.deleteStock);

module.exports = router;