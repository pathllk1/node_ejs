const express = require('express');
const router = express.Router();

const controller = require('../../../controllers/turso/inventory/cnt/inventory');
const pdfMakeController = require('../../../controllers/turso/inventory/pdfMakeController');
const { verifyFirmAccess } = require('../../../middleware/firmMiddleware');

// API Routes: Stocks
router.get('/api/stocks', verifyFirmAccess, controller.getAllStocks);
router.post('/api/stocks', verifyFirmAccess, controller.createStock);
router.put('/api/stocks/:id', verifyFirmAccess, controller.updateStock);
router.delete('/api/stocks/:id', verifyFirmAccess, controller.deleteStock);

// API Routes: Stock Batches
router.get('/api/stocks/:id/batches', verifyFirmAccess, controller.getStockBatches);

// API Routes: Parties
router.get('/api/parties', verifyFirmAccess, controller.getAllParties);
router.post('/api/parties', verifyFirmAccess, controller.createParty);
router.get('/api/parties/:partyId/balance', verifyFirmAccess, controller.getPartyBalance);

// API Routes: Bills (Credit Notes)
router.get('/api/bills', verifyFirmAccess, controller.getAllBills);
router.post('/api/bills', verifyFirmAccess, controller.createBill);
router.put('/api/bills/:id', verifyFirmAccess, controller.updateBill);
router.get('/api/bills/next-number', verifyFirmAccess, controller.getNextBillNumber);
router.get('/api/bills/:id', verifyFirmAccess, controller.getBillById);
router.patch('/api/bills/:id/cancel', verifyFirmAccess, controller.cancelBill);
router.get('/api/bills/:id/pdf', verifyFirmAccess, pdfMakeController.getBillPdf);
router.get('/api/bills/:id/pdfmake', verifyFirmAccess, pdfMakeController.getBillPdf);

// Convenience alias
router.get('/api/credit-notes', verifyFirmAccess, controller.getAllCreditNotes);

// API Routes: History
router.get('/api/history/party-item', verifyFirmAccess, controller.getPartyItemHistory);

// API Routes: Other Charges
router.get('/api/other-charges/types', verifyFirmAccess, controller.getOtherChargesTypes);

// API Routes: Stock Movements
router.get('/api/stock-movements', verifyFirmAccess, controller.getStockMovements);
router.get('/api/stock-movements/:id', verifyFirmAccess, controller.getStockMovementsByStock);
router.post('/api/stock-movements', verifyFirmAccess, controller.createStockMovement);

router.get('/api/gst-lookup', controller.lookupGST);

// API route to get current user's firm name
router.get('/api/current-user-firm-name', verifyFirmAccess, controller.getCurrentUserFirmName);

module.exports = router;
