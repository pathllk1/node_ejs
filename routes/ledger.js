const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledger/ledgerController');
const verifyToken = require('../middleware/authMiddleware');

router.get('/', ledgerController.renderLedgerPage);
router.get('/api/accounts', ledgerController.getLedgerAccounts);
router.get('/api/details/:account_head', ledgerController.getAccountDetails);

module.exports = router;
