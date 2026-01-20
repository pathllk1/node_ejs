/**
 * Voucher Controller for Payment and Receipt Management
 * Handles creation and management of manual payment/receipt vouchers
 */

const turso = require('../../../config/turso');
const { verifyFirmAccess, verifyFirmOwnership, addFirmId } = require('../../../middleware/firmMiddleware');
const { getNextVoucherNumber } = require('../../../utils/billNumberGenerator');
const slsController = require('../../turso/inventory/sls/inventory'); // Import to reuse parties function

// Helper to get current ISO time
const now = () => new Date().toISOString();

const getActorUsername = (req) => (req && req.user && req.user.username ? req.user.username : null);

/**
 * Create a new payment or receipt voucher
 * Expected payload: { voucher_type, party_id, amount, payment_mode, narration, transaction_date }
 */
exports.createVoucher = async (req, res) => {
    const { voucher_type, party_id, amount, payment_mode, narration, transaction_date, bank_account_id } = req.body;

    const actorUsername = getActorUsername(req);
    if (!actorUsername) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has firm access
    if (!req.user || !req.user.firm_id) {
        return res.status(403).json({ error: 'User is not associated with any firm' });
    }
            
    if (req.user.firm_id === undefined || req.user.firm_id === null) {
        console.error('[VOUCHER_CREATE] firm_id is undefined or null:', req.user);
        return res.status(400).json({ error: 'User firm association is invalid' });
    }
            
    const firmId = Number(req.user.firm_id);
    if (isNaN(firmId) || firmId <= 0) {
        console.error('[VOUCHER_CREATE] Invalid firmId after conversion:', req.user.firm_id);
        return res.status(400).json({ error: 'Invalid firm ID after conversion' });
    }

    // Validate required fields
    if (!voucher_type || !['PAYMENT', 'RECEIPT'].includes(voucher_type.toUpperCase())) {
        return res.status(400).json({ error: 'Valid voucher_type (PAYMENT/RECEIPT) is required' });
    }

    if (!party_id || isNaN(party_id)) {
        return res.status(400).json({ error: 'Valid party_id is required' });
    }
    
    const validatedPartyId = Number(party_id);
    if (isNaN(validatedPartyId) || validatedPartyId <= 0) {
        return res.status(400).json({ error: 'Valid positive party_id is required' });
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Valid positive amount is required' });
    }
    
    const validatedAmount = parseFloat(amount);
    if (!isFinite(validatedAmount) || validatedAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be a finite positive number' });
    }

    // Validate that the party belongs to the same firm
    try {
        const partyQuery = await turso.execute({
            sql: 'SELECT id FROM parties WHERE id = ? AND firm_id = ?',
            args: [validatedPartyId, firmId]
        });
        
        if (partyQuery.rows.length === 0) {
            return res.status(403).json({ error: 'Party does not belong to your firm' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Error validating party: ' + error.message });
    }
    
    // If payment mode is Bank and bank_account_id is provided, validate the bank account
    let bankAccountName = null;
    if (payment_mode && payment_mode.toLowerCase().includes('bank') && bank_account_id) {
        try {
            const bankAccountQuery = await turso.execute({
                sql: 'SELECT id, bank_name, account_number FROM bank_accounts WHERE id = ? AND firm_id = ?',
                args: [parseInt(bank_account_id), firmId]
            });
            
            if (bankAccountQuery.rows.length === 0) {
                return res.status(403).json({ error: 'Bank account does not belong to your firm or does not exist' });
            }
            
            const bankAccount = bankAccountQuery.rows[0];
            bankAccountName = `${bankAccount.bank_name} - ${bankAccount.account_number.substring(0, 4)}XXXX`;
        } catch (error) {
            return res.status(500).json({ error: 'Error validating bank account: ' + error.message });
        }
    }

    // Generate voucher number
    let voucherNo;
    try {
        voucherNo = await getNextVoucherNumber(req.user.firm_id, voucher_type.toUpperCase());
        console.log(`[VOUCHER_CREATE] Generated voucher number: ${voucherNo}`);
    } catch (error) {
        console.error(`[VOUCHER_CREATE] Failed to generate voucher number:`, error.message);
        return res.status(500).json({ error: `Failed to generate voucher number: ${error.message}` });
    }

    // Set the generated voucher number
    const finalVoucherType = voucher_type.toUpperCase();
    const finalTransactionDate = transaction_date || now().split('T')[0]; // Use today's date if not provided

    try {
        // Begin transaction-like behavior using batch operations
        const batchResults = await turso.batch([
            // A. Insert Voucher Header
            {
                sql: `
                    INSERT INTO vouchers (
                        voucher_no, voucher_type, transaction_date, party_id, 
                        amount, payment_mode, narration, firm_id, created_by, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
                    voucherNo, finalVoucherType, finalTransactionDate, parseInt(party_id),
                    parseFloat(amount), payment_mode || null, narration || null,
                    req.user.firm_id, actorUsername, now(), now()
                ]
            }
        ]);

        const voucherId = Number(batchResults[0].lastInsertRowid);

        // B. Create Ledger Entries (Double Entry Bookkeeping)
        const ledgerBase = {
            voucher_id: voucherId,
            voucher_type: finalVoucherType,
            voucher_no: voucherNo,
            transaction_date: finalTransactionDate,
            created_by: actorUsername,
            firm_id: firmId,
            created_at: now(),
            updated_at: now()
        };

        // Use validated amount
        const finalAmount = validatedAmount;

        // Get party name for ledger entry
        const partyResult = await turso.execute({
            sql: 'SELECT firm FROM parties WHERE id = ?',
            args: [parseInt(party_id)]
        });
        const partyName = partyResult.rows[0]?.firm || `Party-${party_id}`;

        // Get account head for payment mode (Cash/Bank)
        let accountHead = payment_mode || 'Cash'; // Default to Cash if no payment mode specified
        let accountType = 'CASH'; // Default to CASH, could be expanded to BANK, etc.

        if (payment_mode && payment_mode.toLowerCase().includes('bank')) {
            accountType = 'BANK';
            // If a specific bank account is selected, use its name
            if (bankAccountName) {
                accountHead = bankAccountName;
            }
        } else if (payment_mode && payment_mode.toLowerCase().includes('cash')) {
            accountType = 'CASH';
        } else if (payment_mode && (payment_mode.toLowerCase().includes('cheque') || 
                                   payment_mode.toLowerCase().includes('neft') || 
                                   payment_mode.toLowerCase().includes('rtgs') || 
                                   payment_mode.toLowerCase().includes('upi'))) {
            accountType = 'BANK';
        }

        if (finalVoucherType === 'RECEIPT') {
            // For Receipt: Debit Cash/Bank, Credit Party (Customer)
            // Entry 1: Debit Cash/Bank Account
            await turso.execute({
                sql: `
                    INSERT INTO ledger (
                        voucher_id, voucher_type, voucher_no, account_head, account_type,
                        debit_amount, credit_amount, narration, party_id,
                        transaction_date, created_by, firm_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
                    ledgerBase.voucher_id, ledgerBase.voucher_type, ledgerBase.voucher_no,
                    accountHead, accountType,
                    finalAmount, 0, `Receipt from ${partyName} - ${voucherNo}`, validatedPartyId,
                    ledgerBase.transaction_date, ledgerBase.created_by, ledgerBase.firm_id,
                    ledgerBase.created_at, ledgerBase.updated_at
                ]
            });

            // Entry 2: Credit Party Account
            await turso.execute({
                sql: `
                    INSERT INTO ledger (
                        voucher_id, voucher_type, voucher_no, account_head, account_type,
                        debit_amount, credit_amount, narration, party_id,
                        transaction_date, created_by, firm_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
                    ledgerBase.voucher_id, ledgerBase.voucher_type, ledgerBase.voucher_no,
                    partyName, 'DEBTOR', // Assuming customer is a debtor
                    0, finalAmount, `Receipt from ${partyName} - ${voucherNo}`, validatedPartyId,
                    ledgerBase.transaction_date, ledgerBase.created_by, ledgerBase.firm_id,
                    ledgerBase.created_at, ledgerBase.updated_at
                ]
            });
        } else if (finalVoucherType === 'PAYMENT') {
            // For Payment: Debit Party (Supplier), Credit Cash/Bank
            // Entry 1: Debit Party Account
            await turso.execute({
                sql: `
                    INSERT INTO ledger (
                        voucher_id, voucher_type, voucher_no, account_head, account_type,
                        debit_amount, credit_amount, narration, party_id,
                        transaction_date, created_by, firm_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
                    ledgerBase.voucher_id, ledgerBase.voucher_type, ledgerBase.voucher_no,
                    partyName, 'CREDITOR', // Assuming supplier is a creditor
                    finalAmount, 0, `Payment to ${partyName} - ${voucherNo}`, validatedPartyId,
                    ledgerBase.transaction_date, ledgerBase.created_by, ledgerBase.firm_id,
                    ledgerBase.created_at, ledgerBase.updated_at
                ]
            });

            // Entry 2: Credit Cash/Bank Account
            await turso.execute({
                sql: `
                    INSERT INTO ledger (
                        voucher_id, voucher_type, voucher_no, account_head, account_type,
                        debit_amount, credit_amount, narration, party_id,
                        transaction_date, created_by, firm_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
                    ledgerBase.voucher_id, ledgerBase.voucher_type, ledgerBase.voucher_no,
                    accountHead, accountType,
                    0, finalAmount, `Payment to ${partyName} - ${voucherNo}`, validatedPartyId,
                    ledgerBase.transaction_date, ledgerBase.created_by, ledgerBase.firm_id,
                    ledgerBase.created_at, ledgerBase.updated_at
                ]
            });
        }

        res.json({ 
            message: `${finalVoucherType} voucher created successfully`, 
            voucherId,
            voucherNo 
        });
    } catch (error) {
        console.error('[VOUCHER_CREATE] Error creating voucher:', error);
        res.status(500).json({ error: 'Failed to create voucher: ' + error.message });
    }
};

/**
 * Get all vouchers for the current firm with pagination and filtering
 */
exports.getVouchers = async (req, res) => {
    try {
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        const { voucher_type, start_date, end_date, party_id, search, page = 1, limit = 10 } = req.query;

        // Calculate offset for pagination
        const pageInt = Number(page);
        const limitInt = Number(limit);
        
        if (!isFinite(pageInt) || !isFinite(limitInt) || pageInt <= 0 || limitInt <= 0) {
            return res.status(400).json({ error: 'Invalid pagination parameters' });
        }
        
        const offset = (Math.floor(pageInt) - 1) * Math.floor(limitInt);
        
        if (req.user.firm_id === undefined || req.user.firm_id === null) {
            console.error('[VOUCHERS_GET] firm_id is undefined or null:', req.user);
            return res.status(400).json({ error: 'User firm association is invalid' });
        }
        
        const firmId = Number(req.user.firm_id);
        if (isNaN(firmId) || firmId <= 0) {
            console.error('[VOUCHERS_GET] Invalid firmId after conversion:', req.user.firm_id);
            return res.status(400).json({ error: 'Invalid firm ID after conversion' });
        }
        
        // Build main query
        let query = `SELECT v.*, p.firm as party_name FROM vouchers v 
                     LEFT JOIN parties p ON v.party_id = p.id 
                     WHERE v.firm_id = ?`;
        const queryParams = [firmId];

        // Add filters if provided
        if (voucher_type && ['PAYMENT', 'RECEIPT'].includes(voucher_type.toUpperCase())) {
            query += ' AND v.voucher_type = ?';
            queryParams.push(voucher_type.toUpperCase());
        }

        if (start_date) {
            query += ' AND v.transaction_date >= ?';
            queryParams.push(start_date);
        }

        if (end_date) {
            query += ' AND v.transaction_date <= ?';
            queryParams.push(end_date);
        }

        if (party_id) {
            query += ' AND v.party_id = ?';
            queryParams.push(parseInt(party_id));
        }
        
        // Add search functionality
        if (search && search.trim()) {
            query += ' AND (v.voucher_no LIKE ? OR v.narration LIKE ? OR p.firm LIKE ?)';
            const searchTerm = `%${search.trim()}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        // Count total records for pagination
        const countQuery = query.replace(/SELECT.*FROM vouchers/, 'SELECT COUNT(*) as count FROM vouchers');
        const countResult = await turso.execute({
            sql: countQuery,
            args: queryParams
        });
        const rawTotal = countResult.rows[0]?.count;
        let total = 0;
        if (rawTotal !== null && rawTotal !== undefined) {
            total = Number(rawTotal);
            if (!isFinite(total)) {
                total = 0;
            }
        }

        // Add ordering and pagination to main query
        query += ' ORDER BY v.transaction_date DESC, v.created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), offset);

        const result = await turso.execute({
            sql: query,
            args: queryParams
        });

        // Convert BigInt values to numbers in vouchers
        const vouchers = result.rows.map(voucher => {
            const processedVoucher = {};
            for (const [key, value] of Object.entries(voucher)) {
                if (typeof value === 'bigint') {
                    const numValue = Number(value);
                    // Check if the number is finite
                    if (!isFinite(numValue)) {
                        processedVoucher[key] = 0; // Default to 0 for non-finite values
                    } else {
                        processedVoucher[key] = numValue;
                    }
                } else {
                    processedVoucher[key] = value;
                }
            }
            return processedVoucher;
        });

        // Safely convert page and limit parameters
        const pageNum = Number(page);
        const limitNum = Number(limit);
        
        res.json({
            vouchers,
            total,
            page: isFinite(pageNum) ? Math.max(1, pageNum) : 1,
            limit: isFinite(limitNum) ? Math.max(1, limitNum) : 10,
            totalPages: isFinite(total) && isFinite(limitNum) && limitNum > 0 ? Math.ceil(total / limitNum) : 0
        });
    } catch (error) {
        console.error('[VOUCHERS_GET] Error fetching vouchers:', error);
        res.status(500).json({ error: 'Failed to fetch vouchers: ' + error.message });
    }
};

/**
 * Get a specific voucher by ID
 */
exports.getVoucherById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Validate the ID parameter
        const voucherId = Number(id);
        if (isNaN(voucherId) || voucherId <= 0) {
            return res.status(400).json({ error: 'Invalid voucher ID' });
        }
        
        if (req.user.firm_id === undefined || req.user.firm_id === null) {
            console.error('[VOUCHER_GET_BY_ID] firm_id is undefined or null:', req.user);
            return res.status(400).json({ error: 'User firm association is invalid' });
        }
        
        const firmId = Number(req.user.firm_id);
        if (isNaN(firmId) || firmId <= 0) {
            console.error('[VOUCHER_GET_BY_ID] Invalid firmId after conversion:', req.user.firm_id);
            return res.status(400).json({ error: 'Invalid firm ID after conversion' });
        }

        const result = await turso.execute({
            sql: 'SELECT * FROM vouchers WHERE id = ? AND firm_id = ?',
            args: [voucherId, firmId]
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Voucher not found or does not belong to your firm' });
        }

        // Convert BigInt values to numbers
        const voucher = result.rows[0];
        const processedVoucher = {};
        for (const [key, value] of Object.entries(voucher)) {
            if (typeof value === 'bigint') {
                const numValue = Number(value);
                // Check if the number is finite
                if (!isFinite(numValue)) {
                    processedVoucher[key] = 0; // Default to 0 for non-finite values
                } else {
                    processedVoucher[key] = numValue;
                }
            } else {
                processedVoucher[key] = value;
            }
        }

        res.json(processedVoucher);
    } catch (error) {
        console.error('[VOUCHER_GET_BY_ID] Error fetching voucher:', error);
        res.status(500).json({ error: 'Failed to fetch voucher: ' + error.message });
    }
};

/**
 * Get vouchers by party ID
 */
exports.getVouchersByParty = async (req, res) => {
    try {
        const { partyId } = req.params;

        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Validate the partyId parameter
        const validatedPartyId = Number(partyId);
        if (isNaN(validatedPartyId) || validatedPartyId <= 0) {
            return res.status(400).json({ error: 'Invalid party ID' });
        }
        
        if (req.user.firm_id === undefined || req.user.firm_id === null) {
            console.error('[VOUCHERS_GET_BY_PARTY] firm_id is undefined or null:', req.user);
            return res.status(400).json({ error: 'User firm association is invalid' });
        }
        
        const firmId = Number(req.user.firm_id);
        if (isNaN(firmId) || firmId <= 0) {
            console.error('[VOUCHERS_GET_BY_PARTY] Invalid firmId after conversion:', req.user.firm_id);
            return res.status(400).json({ error: 'Invalid firm ID after conversion' });
        }

        const result = await turso.execute({
            sql: 'SELECT * FROM vouchers WHERE party_id = ? AND firm_id = ? ORDER BY transaction_date DESC, created_at DESC',
            args: [validatedPartyId, firmId]
        });

        // Convert BigInt values to numbers in vouchers
        const vouchers = result.rows.map(voucher => {
            const processedVoucher = {};
            for (const [key, value] of Object.entries(voucher)) {
                if (typeof value === 'bigint') {
                    const numValue = Number(value);
                    // Check if the number is finite
                    if (!isFinite(numValue)) {
                        processedVoucher[key] = 0; // Default to 0 for non-finite values
                    } else {
                        processedVoucher[key] = numValue;
                    }
                } else {
                    processedVoucher[key] = value;
                }
            }
            return processedVoucher;
        });

        res.json(vouchers);
    } catch (error) {
        console.error('[VOUCHERS_GET_BY_PARTY] Error fetching vouchers:', error);
        res.status(500).json({ error: 'Failed to fetch vouchers: ' + error.message });
    }
};

/**
 * Get voucher summary statistics for the current firm
 */
exports.getVoucherSummary = async (req, res) => {
    try {
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Convert firm_id to number, handling both string and number inputs
        if (req.user.firm_id === undefined || req.user.firm_id === null) {
            console.error('[VOUCHER_SUMMARY] firm_id is undefined or null:', req.user);
            return res.status(400).json({ error: 'User firm association is invalid' });
        }
        
        const firmId = Number(req.user.firm_id);
        if (isNaN(firmId) || firmId <= 0) {
            console.error('[VOUCHER_SUMMARY] Invalid firmId after conversion:', req.user.firm_id);
            return res.status(400).json({ error: 'Invalid firm ID after conversion' });
        }
        // Get total receipts
        const receiptsResult = await turso.execute({
            sql: `SELECT SUM(amount) as total FROM vouchers 
                  WHERE firm_id = ? AND voucher_type = 'RECEIPT'`,
            args: [firmId]
        });
        
        let totalReceipts = parseFloat(receiptsResult.rows[0]?.total || 0);
        if (!isFinite(totalReceipts)) {
            totalReceipts = 0;
        }

        // Get total payments
        const paymentsResult = await turso.execute({
            sql: `SELECT SUM(amount) as total FROM vouchers 
                  WHERE firm_id = ? AND voucher_type = 'PAYMENT'`,
            args: [firmId]
        });
        
        let totalPayments = parseFloat(paymentsResult.rows[0]?.total || 0);
        if (!isFinite(totalPayments)) {
            totalPayments = 0;
        }

        // Get count of recent transactions (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

        const recentCountResult = await turso.execute({
            sql: `SELECT COUNT(*) as count FROM vouchers 
                  WHERE firm_id = ? AND transaction_date >= ?`,
            args: [firmId, dateStr]
        });
        
        const rawCount = recentCountResult.rows[0]?.count;
        let recentTransactionsCount = 0;
        if (rawCount !== null && rawCount !== undefined) {
            recentTransactionsCount = Number(rawCount);
            if (!isFinite(recentTransactionsCount)) {
                recentTransactionsCount = 0;
            }
        }

        res.json({
            total_receipts: totalReceipts,
            total_payments: totalPayments,
            net_position: totalReceipts - totalPayments,
            recent_transactions_count: recentTransactionsCount
        });
    } catch (error) {
        console.error('[VOUCHER_SUMMARY] Error fetching voucher summary:', error);
        res.status(500).json({ error: 'Failed to fetch voucher summary: ' + error.message });
    }
};