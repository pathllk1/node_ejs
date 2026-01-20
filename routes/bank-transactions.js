/**
 * Bank Transactions Routes
 * Defines all API endpoints for bank transaction management
 */

const express = require('express');
const router = express.Router();
const bankTransactionController = require('../controllers/turso/banks/bankTransactionController');
const verifyToken = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// Bank transaction endpoints
router.post('/deposit', bankTransactionController.recordBankDeposit);
router.post('/withdrawal', bankTransactionController.recordBankWithdrawal);
router.post('/transfer', bankTransactionController.recordBankTransfer);

// Get bank transactions and statements
router.get('/:id/transactions', bankTransactionController.getBankTransactions);
router.get('/:id/statement', bankTransactionController.getBankStatement);

module.exports = router;