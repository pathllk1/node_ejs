/**
 * Bank Accounts Controller
 * Handles creation and management of bank accounts
 */

const turso = require('../../../config/turso');
const { verifyFirmAccess, verifyFirmOwnership, addFirmId } = require('../../../middleware/firmMiddleware');

// Helper to get current ISO time
const now = () => new Date().toISOString();

const getActorUsername = (req) => (req && req.user && req.user.username ? req.user.username : null);

/**
 * Create a new bank account
 * Expected payload: { bank_name, account_holder_name, account_number, account_type, ifsc_code, micr_code, branch_name, branch_address, opening_balance }
 */
exports.createBankAccount = async (req, res) => {
    const {
        bank_name,
        account_holder_name,
        account_number,
        account_type,
        ifsc_code,
        micr_code,
        branch_name,
        branch_address,
        opening_balance
    } = req.body;

    const actorUsername = getActorUsername(req);
    if (!actorUsername) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has firm access
    if (!req.user || !req.user.firm_id) {
        return res.status(403).json({ error: 'User is not associated with any firm' });
    }
            
    if (req.user.firm_id === undefined || req.user.firm_id === null) {
        console.error('[BANK_ACCOUNT_CREATE] firm_id is undefined or null:', req.user);
        return res.status(400).json({ error: 'User firm association is invalid' });
    }
            
    const firmId = Number(req.user.firm_id);
    if (isNaN(firmId) || firmId <= 0) {
        console.error('[BANK_ACCOUNT_CREATE] Invalid firmId after conversion:', req.user.firm_id);
        return res.status(400).json({ error: 'Invalid firm ID after conversion' });
    }

    // Validate required fields
    if (!bank_name) {
        return res.status(400).json({ error: 'Bank name is required' });
    }

    if (!account_number) {
        return res.status(400).json({ error: 'Account number is required' });
    }

    // Validate account type if provided
    const validAccountTypes = ['Savings', 'Current', 'Checking'];
    if (account_type && !validAccountTypes.includes(account_type)) {
        return res.status(400).json({ error: `Account type must be one of: ${validAccountTypes.join(', ')}` });
    }

    // Validate account status if provided
    const validAccountStatuses = ['Active', 'Inactive', 'Closed'];
    const accountStatus = req.body.account_status || 'Active';
    if (!validAccountStatuses.includes(accountStatus)) {
        return res.status(400).json({ error: `Account status must be one of: ${validAccountStatuses.join(', ')}` });
    }

    try {
        // Check if bank account already exists for this firm
        const existingAccountQuery = await turso.execute({
            sql: 'SELECT id FROM bank_accounts WHERE firm_id = ? AND account_number = ?',
            args: [firmId, account_number]
        });
        
        if (existingAccountQuery.rows.length > 0) {
            return res.status(409).json({ error: 'Bank account with this number already exists for this firm' });
        }

        // Insert the bank account
        const result = await turso.execute({
            sql: `
                INSERT INTO bank_accounts (
                    firm_id, bank_name, account_holder_name, account_number, 
                    account_type, ifsc_code, micr_code, branch_name, 
                    branch_address, opening_balance, current_balance, account_status,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                firmId, bank_name, account_holder_name || null, account_number,
                account_type || 'Savings', ifsc_code || null, micr_code || null, 
                branch_name || null, branch_address || null,
                parseFloat(opening_balance || 0), parseFloat(opening_balance || 0),
                accountStatus, now(), now()
            ]
        });

        const bankAccountId = Number(result.lastInsertRowid);

        // Create a corresponding ledger account for this bank
        const ledgerBase = {
            voucher_id: bankAccountId, // Use bank account ID as voucher ID for reference
            voucher_type: 'BANK_ACCOUNT',
            voucher_no: `BANK-${bankAccountId}`,
            transaction_date: now().split('T')[0],
            created_by: actorUsername,
            firm_id: firmId,
            created_at: now(),
            updated_at: now()
        };

        // Create bank account in ledger (asset account)
        await turso.execute({
            sql: `
                INSERT INTO ledger (
                    voucher_id, voucher_type, voucher_no, account_head, account_type,
                    debit_amount, credit_amount, narration, transaction_date, created_by, firm_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                ledgerBase.voucher_id, ledgerBase.voucher_type, ledgerBase.voucher_no,
                `${bank_name} - ${account_number.substring(0, 4)}XXXX`, 'BANK', // Account type for banks
                0, 0, `Bank Account Created: ${bank_name}`, ledgerBase.transaction_date,
                ledgerBase.created_by, ledgerBase.firm_id, ledgerBase.created_at, ledgerBase.updated_at
            ]
        });

        res.json({ 
            message: 'Bank account created successfully', 
            bankAccountId,
            bankAccountNumber: account_number
        });
    } catch (error) {
        console.error('[BANK_ACCOUNT_CREATE] Error creating bank account:', error);
        res.status(500).json({ error: 'Failed to create bank account: ' + error.message });
    }
};

/**
 * Get all bank accounts for the current firm
 */
exports.getAllBankAccounts = async (req, res) => {
    try {
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        const { search, account_type, account_status, page = 1, limit = 10 } = req.query;

        // Calculate offset for pagination
        const pageInt = Number(page);
        const limitInt = Number(limit);
        
        if (!isFinite(pageInt) || !isFinite(limitInt) || pageInt <= 0 || limitInt <= 0) {
            return res.status(400).json({ error: 'Invalid pagination parameters' });
        }
        
        const offset = (Math.floor(pageInt) - 1) * Math.floor(limitInt);
        
        if (req.user.firm_id === undefined || req.user.firm_id === null) {
            console.error('[BANK_ACCOUNTS_GET] firm_id is undefined or null:', req.user);
            return res.status(400).json({ error: 'User firm association is invalid' });
        }
        
        const firmId = Number(req.user.firm_id);
        if (isNaN(firmId) || firmId <= 0) {
            console.error('[BANK_ACCOUNTS_GET] Invalid firmId after conversion:', req.user.firm_id);
            return res.status(400).json({ error: 'Invalid firm ID after conversion' });
        }
        
        // Build main query
        let query = `SELECT * FROM bank_accounts WHERE firm_id = ?`;
        const queryParams = [firmId];

        // Add filters if provided
        if (search && search.trim()) {
            query += ' AND (bank_name LIKE ? OR account_number LIKE ?)';
            const searchTerm = `%${search.trim()}%`;
            queryParams.push(searchTerm, searchTerm);
        }

        if (account_type) {
            query += ' AND account_type = ?';
            queryParams.push(account_type);
        }

        if (account_status) {
            query += ' AND account_status = ?';
            queryParams.push(account_status);
        }

        // Count total records for pagination
        const countQuery = query.replace(/SELECT \*/, 'SELECT COUNT(*) as count');
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
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), offset);

        const result = await turso.execute({
            sql: query,
            args: queryParams
        });

        // Convert BigInt values to numbers in bank accounts
        const bankAccounts = result.rows.map(account => {
            const processedAccount = {};
            for (const [key, value] of Object.entries(account)) {
                if (typeof value === 'bigint') {
                    const numValue = Number(value);
                    // Check if the number is finite
                    if (!isFinite(numValue)) {
                        processedAccount[key] = 0; // Default to 0 for non-finite values
                    } else {
                        processedAccount[key] = numValue;
                    }
                } else {
                    processedAccount[key] = value;
                }
            }
            return processedAccount;
        });

        // Safely convert page and limit parameters
        const pageNum = Number(page);
        const limitNum = Number(limit);
        
        res.json({
            bankAccounts,
            total,
            page: isFinite(pageNum) ? Math.max(1, pageNum) : 1,
            limit: isFinite(limitNum) ? Math.max(1, limitNum) : 10,
            totalPages: isFinite(total) && isFinite(limitNum) && limitNum > 0 ? Math.ceil(total / limitNum) : 0
        });
    } catch (error) {
        console.error('[BANK_ACCOUNTS_GET] Error fetching bank accounts:', error);
        res.status(500).json({ error: 'Failed to fetch bank accounts: ' + error.message });
    }
};

/**
 * Get a specific bank account by ID
 */
exports.getBankAccountById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Validate the ID parameter
        const bankAccountId = Number(id);
        if (isNaN(bankAccountId) || bankAccountId <= 0) {
            return res.status(400).json({ error: 'Invalid bank account ID' });
        }
        
        if (req.user.firm_id === undefined || req.user.firm_id === null) {
            console.error('[BANK_ACCOUNT_GET_BY_ID] firm_id is undefined or null:', req.user);
            return res.status(400).json({ error: 'User firm association is invalid' });
        }
        
        const firmId = Number(req.user.firm_id);
        if (isNaN(firmId) || firmId <= 0) {
            console.error('[BANK_ACCOUNT_GET_BY_ID] Invalid firmId after conversion:', req.user.firm_id);
            return res.status(400).json({ error: 'Invalid firm ID after conversion' });
        }

        const result = await turso.execute({
            sql: 'SELECT * FROM bank_accounts WHERE id = ? AND firm_id = ?',
            args: [bankAccountId, firmId]
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bank account not found or does not belong to your firm' });
        }

        // Convert BigInt values to numbers
        const account = result.rows[0];
        const processedAccount = {};
        for (const [key, value] of Object.entries(account)) {
            if (typeof value === 'bigint') {
                const numValue = Number(value);
                // Check if the number is finite
                if (!isFinite(numValue)) {
                    processedAccount[key] = 0; // Default to 0 for non-finite values
                } else {
                    processedAccount[key] = numValue;
                }
            } else {
                processedAccount[key] = value;
            }
        }

        res.json(processedAccount);
    } catch (error) {
        console.error('[BANK_ACCOUNT_GET_BY_ID] Error fetching bank account:', error);
        res.status(500).json({ error: 'Failed to fetch bank account: ' + error.message });
    }
};

/**
 * Update a bank account
 */
exports.updateBankAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            bank_name,
            account_holder_name,
            account_number,
            account_type,
            ifsc_code,
            micr_code,
            branch_name,
            branch_address,
            account_status
        } = req.body;

        const actorUsername = getActorUsername(req);
        if (!actorUsername) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Validate the ID parameter
        const bankAccountId = Number(id);
        if (isNaN(bankAccountId) || bankAccountId <= 0) {
            return res.status(400).json({ error: 'Invalid bank account ID' });
        }
        
        if (req.user.firm_id === undefined || req.user.firm_id === null) {
            console.error('[BANK_ACCOUNT_UPDATE] firm_id is undefined or null:', req.user);
            return res.status(400).json({ error: 'User firm association is invalid' });
        }
        
        const firmId = Number(req.user.firm_id);
        if (isNaN(firmId) || firmId <= 0) {
            console.error('[BANK_ACCOUNT_UPDATE] Invalid firmId after conversion:', req.user.firm_id);
            return res.status(400).json({ error: 'Invalid firm ID after conversion' });
        }

        // Validate account type if provided
        if (account_type) {
            const validAccountTypes = ['Savings', 'Current', 'Checking'];
            if (!validAccountTypes.includes(account_type)) {
                return res.status(400).json({ error: `Account type must be one of: ${validAccountTypes.join(', ')}` });
            }
        }

        // Validate account status if provided
        if (account_status) {
            const validAccountStatuses = ['Active', 'Inactive', 'Closed'];
            if (!validAccountStatuses.includes(account_status)) {
                return res.status(400).json({ error: `Account status must be one of: ${validAccountStatuses.join(', ')}` });
            }
        }

        // Check if bank account exists and belongs to the firm
        const existingAccountQuery = await turso.execute({
            sql: 'SELECT * FROM bank_accounts WHERE id = ? AND firm_id = ?',
            args: [bankAccountId, firmId]
        });

        if (existingAccountQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Bank account not found or does not belong to your firm' });
        }

        // Check if account number is being changed and if the new number already exists for this firm
        const existingAccount = existingAccountQuery.rows[0];
        if (account_number && account_number !== existingAccount.account_number) {
            const duplicateCheckQuery = await turso.execute({
                sql: 'SELECT id FROM bank_accounts WHERE firm_id = ? AND account_number = ? AND id != ?',
                args: [firmId, account_number, bankAccountId]
            });
            
            if (duplicateCheckQuery.rows.length > 0) {
                return res.status(409).json({ error: 'Bank account with this number already exists for this firm' });
            }
        }

        // Build update query dynamically based on provided fields
        const updateFields = [];
        const updateValues = [];

        if (bank_name !== undefined) {
            updateFields.push('bank_name = ?');
            updateValues.push(bank_name);
        }
        if (account_holder_name !== undefined) {
            updateFields.push('account_holder_name = ?');
            updateValues.push(account_holder_name);
        }
        if (account_number !== undefined) {
            updateFields.push('account_number = ?');
            updateValues.push(account_number);
        }
        if (account_type !== undefined) {
            updateFields.push('account_type = ?');
            updateValues.push(account_type);
        }
        if (ifsc_code !== undefined) {
            updateFields.push('ifsc_code = ?');
            updateValues.push(ifsc_code);
        }
        if (micr_code !== undefined) {
            updateFields.push('micr_code = ?');
            updateValues.push(micr_code);
        }
        if (branch_name !== undefined) {
            updateFields.push('branch_name = ?');
            updateValues.push(branch_name);
        }
        if (branch_address !== undefined) {
            updateFields.push('branch_address = ?');
            updateValues.push(branch_address);
        }
        if (account_status !== undefined) {
            updateFields.push('account_status = ?');
            updateValues.push(account_status);
        }

        // Always update the updated_at field
        updateFields.push('updated_at = ?');
        updateValues.push(now());

        // Add firm_id and id to the end of values array
        updateValues.push(firmId, bankAccountId);

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const updateQuery = `UPDATE bank_accounts SET ${updateFields.join(', ')} WHERE firm_id = ? AND id = ?`;

        await turso.execute({
            sql: updateQuery,
            args: updateValues
        });

        res.json({ message: 'Bank account updated successfully' });
    } catch (error) {
        console.error('[BANK_ACCOUNT_UPDATE] Error updating bank account:', error);
        res.status(500).json({ error: 'Failed to update bank account: ' + error.message });
    }
};

/**
 * Delete a bank account
 */
exports.deleteBankAccount = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Validate the ID parameter
        const bankAccountId = Number(id);
        if (isNaN(bankAccountId) || bankAccountId <= 0) {
            return res.status(400).json({ error: 'Invalid bank account ID' });
        }
        
        if (req.user.firm_id === undefined || req.user.firm_id === null) {
            console.error('[BANK_ACCOUNT_DELETE] firm_id is undefined or null:', req.user);
            return res.status(400).json({ error: 'User firm association is invalid' });
        }
        
        const firmId = Number(req.user.firm_id);
        if (isNaN(firmId) || firmId <= 0) {
            console.error('[BANK_ACCOUNT_DELETE] Invalid firmId after conversion:', req.user.firm_id);
            return res.status(400).json({ error: 'Invalid firm ID after conversion' });
        }

        // Check if bank account exists and belongs to the firm
        const existingAccountQuery = await turso.execute({
            sql: 'SELECT * FROM bank_accounts WHERE id = ? AND firm_id = ?',
            args: [bankAccountId, firmId]
        });

        if (existingAccountQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Bank account not found or does not belong to your firm' });
        }

        // Check if there are any transactions associated with this bank account
        // This would prevent deletion if there are related ledger entries
        const ledgerCheckQuery = await turso.execute({
            sql: 'SELECT COUNT(*) as count FROM ledger WHERE account_head LIKE ? AND firm_id = ?',
            args: [`%${existingAccountQuery.rows[0].account_number}%`, firmId]
        });

        const ledgerCount = ledgerCheckQuery.rows[0]?.count || 0;
        if (ledgerCount > 0) {
            return res.status(400).json({ error: 'Cannot delete bank account with associated transactions' });
        }

        // Delete the bank account
        const result = await turso.execute({
            sql: 'DELETE FROM bank_accounts WHERE id = ? AND firm_id = ?',
            args: [bankAccountId, firmId]
        });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Bank account not found or does not belong to your firm' });
        }

        res.json({ message: 'Bank account deleted successfully' });
    } catch (error) {
        console.error('[BANK_ACCOUNT_DELETE] Error deleting bank account:', error);
        res.status(500).json({ error: 'Failed to delete bank account: ' + error.message });
    }
};

/**
 * Get bank account balance
 */
exports.getBankAccountBalance = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Validate the ID parameter
        const bankAccountId = Number(id);
        if (isNaN(bankAccountId) || bankAccountId <= 0) {
            return res.status(400).json({ error: 'Invalid bank account ID' });
        }
        
        if (req.user.firm_id === undefined || req.user.firm_id === null) {
            console.error('[BANK_BALANCE_GET] firm_id is undefined or null:', req.user);
            return res.status(400).json({ error: 'User firm association is invalid' });
        }
        
        const firmId = Number(req.user.firm_id);
        if (isNaN(firmId) || firmId <= 0) {
            console.error('[BANK_BALANCE_GET] Invalid firmId after conversion:', req.user.firm_id);
            return res.status(400).json({ error: 'Invalid firm ID after conversion' });
        }

        // Get the bank account details
        const accountQuery = await turso.execute({
            sql: 'SELECT * FROM bank_accounts WHERE id = ? AND firm_id = ?',
            args: [bankAccountId, firmId]
        });

        if (accountQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Bank account not found or does not belong to your firm' });
        }

        const account = accountQuery.rows[0];

        // Calculate balance from ledger entries
        // For bank accounts, debits increase the balance and credits decrease it
        const ledgerQuery = await turso.execute({
            sql: `
                SELECT 
                    SUM(debit_amount) as total_debit,
                    SUM(credit_amount) as total_credit
                FROM ledger 
                WHERE account_head LIKE ? AND firm_id = ?
            `,
            args: [`%${account.account_number}%`, firmId]
        });

        const ledgerData = ledgerQuery.rows[0];
        const totalDebit = parseFloat(ledgerData?.total_debit || 0);
        const totalCredit = parseFloat(ledgerData?.total_credit || 0);
        const calculatedBalance = totalDebit - totalCredit;

        res.json({
            accountId: account.id,
            accountNumber: account.account_number,
            bankName: account.bank_name,
            calculatedBalance,
            storedBalance: parseFloat(account.current_balance),
            currency: 'INR' // Could be made configurable per firm
        });
    } catch (error) {
        console.error('[BANK_BALANCE_GET] Error fetching bank balance:', error);
        res.status(500).json({ error: 'Failed to fetch bank balance: ' + error.message });
    }
};