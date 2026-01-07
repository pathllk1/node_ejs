const express = require('express');
const router = express.Router();
// Adjust path if your folder structure is different
const controller = require('../controllers/inventory/inventory');
const invoicePdfController = require('../controllers/inventory/invoicePdfController');

// View Route
router.get('/stocks', controller.renderStocksPage);

router.get('/bills', controller.renderBillsPage);

router.get('/sales-report', controller.renderSalesReportPage);

// API Routes
router.get('/api/stocks', controller.getAllStocks);
router.post('/api/stocks', controller.createStock);
router.put('/api/stocks/:id', controller.updateStock);
router.delete('/api/stocks/:id', controller.deleteStock);

// --- API Routes: Stock Batches ---
router.get('/api/stocks/:id/batches', controller.getStockBatches);

// --- API Routes: Parties ---
router.get('/api/parties', controller.getAllParties);
router.post('/api/parties', controller.createParty);

// --- API Routes: Bills (Sales) ---
router.get('/api/bills', controller.getAllBills);
router.post('/api/bills', controller.createBill);
router.get('/api/bills/next-number', controller.getNextBillNumber);
router.get('/api/bills/:id', controller.getBillById);
router.get('/api/bills/:id/pdf', invoicePdfController.getBillPdfById);

// --- API Routes: History ---
router.get('/api/history/party-item', controller.getPartyItemHistory);

// --- API Routes: Other Charges ---
router.get('/api/other-charges/types', controller.getOtherChargesTypes);

router.get('/api/gst-lookup', controller.lookupGST);

module.exports = router;