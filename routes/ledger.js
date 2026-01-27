const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/turso/ledger/ledgerController');
const voucherController = require('../controllers/turso/ledger/voucherController');
const journalEntryController = require('../controllers/turso/ledger/journalEntryController');
const verifyToken = require('../middleware/authMiddleware');
const { verifyFirmAccess } = require('../middleware/firmMiddleware');

router.get('/', verifyFirmAccess, ledgerController.renderLedgerPage);
router.get('/api/accounts', verifyFirmAccess, ledgerController.getLedgerAccounts);
router.get('/api/details/:account_head', verifyFirmAccess, ledgerController.getAccountDetails);
router.get('/api/export-pdf/:account_head', verifyFirmAccess, ledgerController.exportAccountLedgerPdf);
router.get('/api/export-general-ledger', verifyFirmAccess, ledgerController.exportGeneralLedgerPdf);
router.get('/api/export-trial-balance', verifyFirmAccess, ledgerController.exportTrialBalancePdf);
router.post('/api/export-account-type-pdf', verifyFirmAccess, ledgerController.exportAccountTypePdf);
router.get('/api/type-summaries', verifyFirmAccess, ledgerController.getAccountTypeSummaries);
router.get('/api/account-suggestions', verifyFirmAccess, ledgerController.getAccountSuggestions);

// Voucher routes
router.post('/api/vouchers', verifyFirmAccess, voucherController.createVoucher);
router.get('/api/vouchers', verifyFirmAccess, voucherController.getVouchers);
router.get('/api/vouchers/party/:partyId', verifyFirmAccess, voucherController.getVouchersByParty);
router.get('/api/vouchers/summary', verifyFirmAccess, voucherController.getVoucherSummary);
router.get('/api/vouchers/:id', verifyFirmAccess, voucherController.getVoucherById);

// Voucher page route
router.get('/vouchers', verifyFirmAccess, (req, res) => {
    res.render('ledger/vouchers', { user: req.user });
});

// Journal Entry page route
router.get('/journal-entries', verifyFirmAccess, (req, res) => {
    res.render('ledger/journal-entries', { user: req.user });
});

// Parties API routes (for vouchers page)
router.get('/api/parties', verifyFirmAccess, require('../controllers/turso/inventory/sls/inventory').getAllParties);
router.post('/api/parties', verifyFirmAccess, require('../controllers/turso/inventory/sls/inventory').createParty);
router.get('/api/parties/:partyId/balance', verifyFirmAccess, require('../controllers/turso/inventory/sls/inventory').getPartyBalance);

// Journal Entry routes
router.post('/api/journal-entries', verifyFirmAccess, journalEntryController.createJournalEntry);
router.get('/api/journal-entries/summary', verifyFirmAccess, journalEntryController.getJournalEntrySummary);
router.get('/api/journal-entries', verifyFirmAccess, journalEntryController.getJournalEntries);
router.get('/api/journal-entries/:id', verifyFirmAccess, journalEntryController.getJournalEntryById);
router.put('/api/journal-entries/:id', verifyFirmAccess, journalEntryController.updateJournalEntry);
router.delete('/api/journal-entries/:id', verifyFirmAccess, journalEntryController.deleteJournalEntry);

module.exports = router;
