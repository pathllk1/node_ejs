/**
 * Bank Transactions Controller
 * Handles bank-related financial transactions
 */

const turso = require('../../../config/turso');
const { verifyFirmAccess, verifyFirmOwnership, addFirmId } = require('../../../middleware/firmMiddleware');
const { getNextVoucherNumber } = require('../../../utils/billNumberGenerator');

// Helper to get current ISO time
const now = () => new Date().toISOString();

const getActorUsername = (req) => (req && req.user && req.user.username ? req.user.username : null);

/**
 * Record a bank deposit (money going INTO the bank account)
 * Expected payload: { bank_account_id, amount, description, transaction_date }
 */
exports.recordBankDeposit = async (req, res) => {
    const { bank_account_id, amount, description, transaction_date } = req.body;

    const actorUsername = getActorUsername(req);
    if (!actorUsername) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has firm access
    if (!req.user || !req.user.firm_id) {
        return res.status(403).json({ error: 'User is not associated with any firm' });
    }
            
    if (req.user.firm_id === undefined || req.user.firm_id === null) {
        console.error('[BANK_DEPOSIT] firm_id is undefined or null:', req.user);
        return res.status(400).json({ error: 'User firm association is invalid' });
    }
            
    const firmId = Number(req.user.firm_id);
    if (isNaN(firmId) || firmId <= 0) {
        console.error('[BANK_DEPOSIT] Invalid firmId after conversion:', req.user.firm_id);
        return res.status(400).json({ error: 'Invalid firm ID after conversion' });
    }

    // Validate required fields
    if (!bank_account_id) {
        return res.status(400).json({ error: 'Bank account ID is required' });
    }

    if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Valid positive amount is required' });
    }

    const validatedAmount = parseFloat(amount);
    if (!isFinite(validatedAmount) || validatedAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be a finite positive number' });
    }

    try {
        // Verify that the bank account belongs to the firm
        const bankAccountQuery = await turso.execute({
            sql: 'SELECT * FROM bank_accounts WHERE id = ? AND firm_id = ?',
            args: [bank_account_id, firmId]
        });

        if (bankAccountQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Bank account not found or does not belong to your firm' });
        }

        const bankAccount = bankAccountQuery.rows[0];

        // Generate voucher number
        let voucherNo;
        try {
            voucherNo = await getNextVoucherNumber(firmId, 'BANK_DEPOSIT');
            console.log(`[BANK_DEPOSIT] Generated voucher number: ${voucherNo}`);
        } catch (error) {
            console.error(`[BANK_DEPOSIT] Failed to generate voucher number:`, error.message);
            return res.status(500).json({ error: `Failed to generate voucher number: ${error.message}` });
        }

        // Update the bank account balance
        const newBalance = parseFloat(bankAccount.current_balance || 0) + validatedAmount;

        await turso.execute({
            sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = ? WHERE id = ?',
            args: [newBalance, now(), bank_account_id]
        });

        // Create ledger entries for the bank deposit
        const ledgerBase = {
            voucher_id: bank_account_id, // Use bank account ID as reference
            voucher_type: 'BANK_DEPOSIT',
            voucher_no: voucherNo,
            transaction_date: transaction_date || now().split('T')[0], // Use today's date if not provided
            created_by: actorUsername,
            firm_id: firmId,
            created_at: now(),
            updated_at: now()
        };

        // For deposits, debit the bank account (increases asset) and credit the source account
        // The source account depends on the nature of the deposit (could be cash, debtors, income, etc.)
        const sourceAccount = description || 'Cash Deposit'; // Default source account

        // Insert debit entry for bank account
        await turso.execute({
            sql: `
                INSERT INTO ledger (
                    voucher_id, voucher_type, voucher_no, account_head, account_type,
                    debit_amount, credit_amount, narration, transaction_date, created_by, firm_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                ledgerBase.voucher_id, ledgerBase.voucher_type, ledgerBase.voucher_no,
                `${bankAccount.bank_name} - ${bankAccount.account_number.substring(0, 4)}XXXX`, 'BANK',
                validatedAmount, 0, `Deposit to ${bankAccount.bank_name}: ${description || 'Cash Deposit'}`,
                ledgerBase.transaction_date, ledgerBase.created_by, ledgerBase.firm_id,
                ledgerBase.created_at, ledgerBase.updated_at
            ]
        });

        // Insert credit entry for source account
        await turso.execute({
            sql: `
                INSERT INTO ledger (
                    voucher_id, voucher_type, voucher_no, account_head, account_type,
                    debit_amount, credit_amount, narration, transaction_date, created_by, firm_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                ledgerBase.voucher_id, ledgerBase.voucher_type, ledgerBase.voucher_no,
                sourceAccount, 'CASH', // Default to CASH, could be customized
                0, validatedAmount, `Deposit from ${sourceAccount}: ${description || 'Cash Deposit'}`,
                ledgerBase.transaction_date, ledgerBase.created_by, ledgerBase.firm_id,
                ledgerBase.created_at, ledgerBase.updated_at
            ]
        });

        res.json({ 
            message: 'Bank deposit recorded successfully', 
            voucherNo,
            bankAccountId: bank_account_id,
            amount: validatedAmount
        });
    } catch (error) {
        console.error('[BANK_DEPOSIT] Error recording bank deposit:', error);
        res.status(500).json({ error: 'Failed to record bank deposit: ' + error.message });
    }
};

/**
 * Record a bank withdrawal (money coming OUT of the bank account)
 * Expected payload: { bank_account_id, amount, description, transaction_date }
 */
exports.recordBankWithdrawal = async (req, res) => {
    const { bank_account_id, amount, description, transaction_date } = req.body;

    const actorUsername = getActorUsername(req);
    if (!actorUsername) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has firm access
    if (!req.user || !req.user.firm_id) {
        return res.status(403).json({ error: 'User is not associated with any firm' });
    }
            
    if (req.user.firm_id === undefined || req.user.firm_id === null) {
        console.error('[BANK_WITHDRAWAL] firm_id is undefined or null:', req.user);
        return res.status(400).json({ error: 'User firm association is invalid' });
    }
            
    const firmId = Number(req.user.firm_id);
    if (isNaN(firmId) || firmId <= 0) {
        console.error('[BANK_WITHDRAWAL] Invalid firmId after conversion:', req.user.firm_id);
        return res.status(400).json({ error: 'Invalid firm ID after conversion' });
    }

    // Validate required fields
    if (!bank_account_id) {
        return res.status(400).json({ error: 'Bank account ID is required' });
    }

    if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Valid positive amount is required' });
    }

    const validatedAmount = parseFloat(amount);
    if (!isFinite(validatedAmount) || validatedAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be a finite positive number' });
    }

    try {
        // Verify that the bank account belongs to the firm
        const bankAccountQuery = await turso.execute({
            sql: 'SELECT * FROM bank_accounts WHERE id = ? AND firm_id = ?',
            args: [bank_account_id, firmId]
        });

        if (bankAccountQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Bank account not found or does not belong to your firm' });
        }

        const bankAccount = bankAccountQuery.rows[0];

        // Check if there's sufficient balance
        const currentBalance = parseFloat(bankAccount.current_balance || 0);
        if (currentBalance < validatedAmount) {
            return res.status(400).json({ error: 'Insufficient balance in bank account' });
        }

        // Generate voucher number
        let voucherNo;
        try {
            voucherNo = await getNextVoucherNumber(firmId, 'BANK_WITHDRAWAL');
            console.log(`[BANK_WITHDRAWAL] Generated voucher number: ${voucherNo}`);
        } catch (error) {
            console.error(`[BANK_WITHDRAWAL] Failed to generate voucher number:`, error.message);
            return res.status(500).json({ error: `Failed to generate voucher number: ${error.message}` });
        }

        // Update the bank account balance
        const newBalance = currentBalance - validatedAmount;

        await turso.execute({
            sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = ? WHERE id = ?',
            args: [newBalance, now(), bank_account_id]
        });

        // Create ledger entries for the bank withdrawal
        const ledgerBase = {
            voucher_id: bank_account_id, // Use bank account ID as reference
            voucher_type: 'BANK_WITHDRAWAL',
            voucher_no: voucherNo,
            transaction_date: transaction_date || now().split('T')[0], // Use today's date if not provided
            created_by: actorUsername,
            firm_id: firmId,
            created_at: now(),
            updated_at: now()
        };

        // For withdrawals, credit the bank account (decreases asset) and debit the destination account
        // The destination account depends on the nature of the withdrawal (could be cash, expenses, etc.)
        const destinationAccount = description || 'Cash Withdrawal'; // Default destination account

        // Insert credit entry for bank account
        await turso.execute({
            sql: `
                INSERT INTO ledger (
                    voucher_id, voucher_type, voucher_no, account_head, account_type,
                    debit_amount, credit_amount, narration, transaction_date, created_by, firm_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                ledgerBase.voucher_id, ledgerBase.voucher_type, ledgerBase.voucher_no,
                `${bankAccount.bank_name} - ${bankAccount.account_number.substring(0, 4)}XXXX}`, 'BANK',
                0, validatedAmount, `Withdrawal from ${bankAccount.bank_name}: ${description || 'Cash Withdrawal'}`,
                ledgerBase.transaction_date, ledgerBase.created_by, ledgerBase.firm_id,
                ledgerBase.created_at, ledgerBase.updated_at
            ]
        });

        // Insert debit entry for destination account
        await turso.execute({
            sql: `
                INSERT INTO ledger (
                    voucher_id, voucher_type, voucher_no, account_head, account_type,
                    debit_amount, credit_amount, narration, transaction_date, created_by, firm_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                ledgerBase.voucher_id, ledgerBase.voucher_type, ledgerBase.voucher_no,
                destinationAccount, 'EXPENSE', // Default to EXPENSE, could be customized
                validatedAmount, 0, `Withdrawal to ${destinationAccount}: ${description || 'Cash Withdrawal'}`,
                ledgerBase.transaction_date, ledgerBase.created_by, ledgerBase.firm_id,
                ledgerBase.created_at, ledgerBase.updated_at
            ]
        });

        res.json({ 
            message: 'Bank withdrawal recorded successfully', 
            voucherNo,
            bankAccountId: bank_account_id,
            amount: validatedAmount
        });
    } catch (error) {
        console.error('[BANK_WITHDRAWAL] Error recording bank withdrawal:', error);
        res.status(500).json({ error: 'Failed to record bank withdrawal: ' + error.message });
    }
};

/**
 * Record a bank transfer between accounts
 * Expected payload: { from_bank_account_id, to_bank_account_id, amount, description, transaction_date }
 */
exports.recordBankTransfer = async (req, res) => {
    const { from_bank_account_id, to_bank_account_id, amount, description, transaction_date } = req.body;

    const actorUsername = getActorUsername(req);
    if (!actorUsername) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has firm access
    if (!req.user || !req.user.firm_id) {
        return res.status(403).json({ error: 'User is not associated with any firm' });
    }
            
    if (req.user.firm_id === undefined || req.user.firm_id === null) {
        console.error('[BANK_TRANSFER] firm_id is undefined or null:', req.user);
        return res.status(400).json({ error: 'User firm association is invalid' });
    }
            
    const firmId = Number(req.user.firm_id);
    if (isNaN(firmId) || firmId <= 0) {
        console.error('[BANK_TRANSFER] Invalid firmId after conversion:', req.user.firm_id);
        return res.status(400).json({ error: 'Invalid firm ID after conversion' });
    }

    // Validate required fields
    if (!from_bank_account_id || !to_bank_account_id) {
        return res.status(400).json({ error: 'Both from and to bank account IDs are required' });
    }

    if (from_bank_account_id === to_bank_account_id) {
        return res.status(400).json({ error: 'Source and destination bank accounts cannot be the same' });
    }

    if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Valid positive amount is required' });
    }

    const validatedAmount = parseFloat(amount);
    if (!isFinite(validatedAmount) || validatedAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be a finite positive number' });
    }

    try {
        // Verify that both bank accounts belong to the firm
        const fromBankAccountQuery = await turso.execute({
            sql: 'SELECT * FROM bank_accounts WHERE id = ? AND firm_id = ?',
            args: [from_bank_account_id, firmId]
        });

        const toBankAccountQuery = await turso.execute({
            sql: 'SELECT * FROM bank_accounts WHERE id = ? AND firm_id = ?',
            args: [to_bank_account_id, firmId]
        });

        if (fromBankAccountQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Source bank account not found or does not belong to your firm' });
        }

        if (toBankAccountQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Destination bank account not found or does not belong to your firm' });
        }

        const fromBankAccount = fromBankAccountQuery.rows[0];
        const toBankAccount = toBankAccountQuery.rows[0];

        // Check if there's sufficient balance in the source account
        const currentBalance = parseFloat(fromBankAccount.current_balance || 0);
        if (currentBalance < validatedAmount) {
            return res.status(400).json({ error: 'Insufficient balance in source bank account' });
        }

        // Generate voucher number
        let voucherNo;
        try {
            voucherNo = await getNextVoucherNumber(firmId, 'BANK_TRANSFER');
            console.log(`[BANK_TRANSFER] Generated voucher number: ${voucherNo}`);
        } catch (error) {
            console.error(`[BANK_TRANSFER] Failed to generate voucher number:`, error.message);
            return res.status(500).json({ error: `Failed to generate voucher number: ${error.message}` });
        }

        // Update the bank account balances
        const newFromBalance = currentBalance - validatedAmount;
        const newToBalance = parseFloat(toBankAccount.current_balance || 0) + validatedAmount;

        // Update both bank accounts
        await turso.execute({
            sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = ? WHERE id = ?',
            args: [newFromBalance, now(), from_bank_account_id]
        });

        await turso.execute({
            sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = ? WHERE id = ?',
            args: [newToBalance, now(), to_bank_account_id]
        });

        // Create ledger entries for the bank transfer
        const ledgerBase = {
            voucher_id: from_bank_account_id, // Use from bank account ID as reference
            voucher_type: 'BANK_TRANSFER',
            voucher_no: voucherNo,
            transaction_date: transaction_date || now().split('T')[0], // Use today's date if not provided
            created_by: actorUsername,
            firm_id: firmId,
            created_at: now(),
            updated_at: now()
        };

        // For transfers, credit the source bank account and debit the destination bank account
        // Credit source bank account
        await turso.execute({
            sql: `
                INSERT INTO ledger (
                    voucher_id, voucher_type, voucher_no, account_head, account_type,
                    debit_amount, credit_amount, narration, transaction_date, created_by, firm_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                ledgerBase.voucher_id, ledgerBase.voucher_type, ledgerBase.voucher_no,
                `${fromBankAccount.bank_name} - ${fromBankAccount.account_number.substring(0, 4)}XXXX}`, 'BANK',
                0, validatedAmount, `Transfer from ${fromBankAccount.bank_name} to ${toBankAccount.bank_name}: ${description || 'Bank Transfer'}`,
                ledgerBase.transaction_date, ledgerBase.created_by, ledgerBase.firm_id,
                ledgerBase.created_at, ledgerBase.updated_at
            ]
        });

        // Debit destination bank account
        await turso.execute({
            sql: `
                INSERT INTO ledger (
                    voucher_id, voucher_type, voucher_no, account_head, account_type,
                    debit_amount, credit_amount, narration, transaction_date, created_by, firm_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                ledgerBase.voucher_id, ledgerBase.voucher_type, ledgerBase.voucher_no,
                `${toBankAccount.bank_name} - ${toBankAccount.account_number.substring(0, 4)}XXXX}`, 'BANK',
                validatedAmount, 0, `Transfer to ${toBankAccount.bank_name} from ${fromBankAccount.bank_name}: ${description || 'Bank Transfer'}`,
                ledgerBase.transaction_date, ledgerBase.created_by, ledgerBase.firm_id,
                ledgerBase.created_at, ledgerBase.updated_at
            ]
        });

        res.json({ 
            message: 'Bank transfer recorded successfully', 
            voucherNo,
            fromBankAccountId: from_bank_account_id,
            toBankAccountId: to_bank_account_id,
            amount: validatedAmount
        });
    } catch (error) {
        console.error('[BANK_TRANSFER] Error recording bank transfer:', error);
        res.status(500).json({ error: 'Failed to record bank transfer: ' + error.message });
    }
};

/**
 * Get all bank transactions for a specific bank account
 */
exports.getBankTransactions = async (req, res) => {
    try {
        const { id } = req.params; // bank account id

        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Validate the ID parameter
        const bankAccountId = Number(id);
        if (isNaN(bankAccountId) || bankAccountId <= 0) {
            return res.status(400).json({ error: 'Invalid bank account ID' });
        }
        
        if (req.user.firm_id === undefined || req.user.firm_id === null) {
            console.error('[BANK_TRANSACTIONS] firm_id is undefined or null:', req.user);
            return res.status(400).json({ error: 'User firm association is invalid' });
        }
        
        const firmId = Number(req.user.firm_id);
        if (isNaN(firmId) || firmId <= 0) {
            console.error('[BANK_TRANSACTIONS] Invalid firmId after conversion:', req.user.firm_id);
            return res.status(400).json({ error: 'Invalid firm ID after conversion' });
        }

        // Verify that the bank account belongs to the firm
        const bankAccountQuery = await turso.execute({
            sql: 'SELECT * FROM bank_accounts WHERE id = ? AND firm_id = ?',
            args: [bankAccountId, firmId]
        });

        if (bankAccountQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Bank account not found or does not belong to your firm' });
        }

        const bankAccount = bankAccountQuery.rows[0];

        // Get all ledger entries related to this bank account
        const ledgerQuery = await turso.execute({
            sql: `
                SELECT * FROM ledger 
                WHERE account_head LIKE ? AND firm_id = ?
                ORDER BY transaction_date DESC, created_at DESC
            `,
            args: [`%${bankAccount.account_number}%`, firmId]
        });

        // Convert BigInt values to numbers in transactions
        const transactions = ledgerQuery.rows.map(transaction => {
            const processedTransaction = {};
            for (const [key, value] of Object.entries(transaction)) {
                if (typeof value === 'bigint') {
                    const numValue = Number(value);
                    // Check if the number is finite
                    if (!isFinite(numValue)) {
                        processedTransaction[key] = 0; // Default to 0 for non-finite values
                    } else {
                        processedTransaction[key] = numValue;
                    }
                } else {
                    processedTransaction[key] = value;
                }
            }
            return processedTransaction;
        });

        res.json({
            bankAccountId,
            bankAccountNumber: bankAccount.account_number,
            bankName: bankAccount.bank_name,
            transactions
        });
    } catch (error) {
        console.error('[BANK_TRANSACTIONS] Error fetching bank transactions:', error);
        res.status(500).json({ error: 'Failed to fetch bank transactions: ' + error.message });
    }
};

/**
 * Get bank account statement
 */
exports.getBankStatement = async (req, res) => {
    try {
        const { id } = req.params; // bank account id
        const { start_date, end_date } = req.query;

        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Validate the ID parameter
        const bankAccountId = Number(id);
        if (isNaN(bankAccountId) || bankAccountId <= 0) {
            return res.status(400).json({ error: 'Invalid bank account ID' });
        }
        
        if (req.user.firm_id === undefined || req.user.firm_id === null) {
            console.error('[BANK_STATEMENT] firm_id is undefined or null:', req.user);
            return res.status(400).json({ error: 'User firm association is invalid' });
        }
        
        const firmId = Number(req.user.firm_id);
        if (isNaN(firmId) || firmId <= 0) {
            console.error('[BANK_STATEMENT] Invalid firmId after conversion:', req.user.firm_id);
            return res.status(400).json({ error: 'Invalid firm ID after conversion' });
        }

        // Verify that the bank account belongs to the firm
        const bankAccountQuery = await turso.execute({
            sql: 'SELECT * FROM bank_accounts WHERE id = ? AND firm_id = ?',
            args: [bankAccountId, firmId]
        });

        if (bankAccountQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Bank account not found or does not belong to your firm' });
        }

        const bankAccount = bankAccountQuery.rows[0];

        // Build query for ledger entries within date range
        let query = `
            SELECT * FROM ledger 
            WHERE account_head LIKE ? AND firm_id = ?
        `;
        const queryParams = [`%${bankAccount.account_number}%`, firmId];

        if (start_date) {
            query += ' AND transaction_date >= ?';
            queryParams.push(start_date);
        }

        if (end_date) {
            query += ' AND transaction_date <= ?';
            queryParams.push(end_date);
        }

        query += ' ORDER BY transaction_date ASC, created_at ASC';

        const ledgerQuery = await turso.execute({
            sql: query,
            args: queryParams
        });

        // Convert BigInt values to numbers in transactions
        const transactions = ledgerQuery.rows.map(transaction => {
            const processedTransaction = {};
            for (const [key, value] of Object.entries(transaction)) {
                if (typeof value === 'bigint') {
                    const numValue = Number(value);
                    // Check if the number is finite
                    if (!isFinite(numValue)) {
                        processedTransaction[key] = 0; // Default to 0 for non-finite values
                    } else {
                        processedTransaction[key] = numValue;
                    }
                } else {
                    processedTransaction[key] = value;
                }
            }
            return processedTransaction;
        });

        // Calculate running balance
        let runningBalance = parseFloat(bankAccount.opening_balance || 0);
        const transactionsWithBalance = transactions.map(transaction => {
            // For bank accounts, debits increase the balance and credits decrease it
            runningBalance += transaction.debit_amount - transaction.credit_amount;
            
            return {
                ...transaction,
                running_balance: runningBalance
            };
        });

        res.json({
            bankAccountId,
            bankAccountNumber: bankAccount.account_number,
            bankName: bankAccount.bank_name,
            openingBalance: parseFloat(bankAccount.opening_balance || 0),
            closingBalance: runningBalance,
            startDate: start_date || null,
            endDate: end_date || null,
            transactions: transactionsWithBalance
        });
    } catch (error) {
        console.error('[BANK_STATEMENT] Error generating bank statement:', error);
        res.status(500).json({ error: 'Failed to generate bank statement: ' + error.message });
    }
};