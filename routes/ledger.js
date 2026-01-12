const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledger/ledgerController');
const verifyToken = require('../middleware/authMiddleware');
const { verifyFirmAccess } = require('../middleware/firmMiddleware');

router.get('/', verifyFirmAccess, ledgerController.renderLedgerPage);
router.get('/api/accounts', verifyFirmAccess, ledgerController.getLedgerAccounts);
router.get('/api/details/:account_head', verifyFirmAccess, ledgerController.getAccountDetails);
router.get('/api/export-pdf/:account_head', verifyFirmAccess, ledgerController.exportAccountLedgerPdf);
router.get('/api/type-summaries', verifyFirmAccess, ledgerController.getAccountTypeSummaries);

module.exports = router;
