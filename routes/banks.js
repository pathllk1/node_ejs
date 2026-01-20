/**
 * Bank Accounts Routes
 * Defines all API endpoints for bank account management
 */

const express = require('express');
const router = express.Router();
const bankController = require('../controllers/turso/banks/bankController');
const verifyToken = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuth');

// All routes require authentication
router.use(verifyToken);

// Get all bank accounts for the current firm (for API calls from other pages like vouchers)
router.get('/', bankController.getAllBankAccounts);

// Create a new bank account
router.post('/', bankController.createBankAccount);

// Route to render the bank accounts page view
router.get('/view', (req, res) => {
    res.render('banks/banks', { user: req.user });
});

// Get a specific bank account by ID
router.get('/:id', bankController.getBankAccountById);

// Update a bank account
router.put('/:id', bankController.updateBankAccount);

// Delete a bank account
router.delete('/:id', bankController.deleteBankAccount);

// Get bank account balance
router.get('/:id/balance', bankController.getBankAccountBalance);

module.exports = router;