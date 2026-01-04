const express = require('express');
const router = express.Router();
// Adjust path if your folder structure is different
const controller = require('../controllers/inventory/inventory');

// View Route
router.get('/stocks', controller.renderStocksPage);

router.get('/bills', controller.renderBillsPage);

// API Routes
router.get('/api/stocks', controller.getAllStocks);
router.post('/api/stocks', controller.createStock);
router.put('/api/stocks/:id', controller.updateStock);
router.delete('/api/stocks/:id', controller.deleteStock);

// --- API Routes: Parties ---
router.get('/api/parties', controller.getAllParties);
router.post('/api/parties', controller.createParty);

// --- API Routes: Bills (Sales) ---
router.get('/api/bills', controller.getAllBills);
router.post('/api/bills', controller.createBill);

router.get('/api/gst-lookup', controller.lookupGST);

module.exports = router;