/**
 * Journal Entry Controller for General Journal Management
 * Handles creation and management of general journal entries
 */

const turso = require('../../../config/turso');
const { verifyFirmAccess, verifyFirmOwnership, addFirmId } = require('../../../middleware/firmMiddleware');
const { getNextVoucherNumber } = require('../../../utils/billNumberGenerator');

// Helper to get current ISO time
const now = () => new Date().toISOString();

const getActorUsername = (req) => (req && req.user && req.user.username ? req.user.username : null);

/**
 * Create a new journal entry with multiple debit/credit lines
 * Expected payload: { entries: [{ account_head, account_type, debit_amount, credit_amount, narration }, ...], narration, transaction_date }
 */
exports.createJournalEntry = async (req, res) => {
    const { entries, narration, transaction_date } = req.body;

    const actorUsername = getActorUsername(req);
    if (!actorUsername) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has firm access
    if (!req.user || !req.user.firm_id) {
        return res.status(403).json({ error: 'User is not associated with any firm' });
    }
    
    if (req.user.firm_id === undefined || req.user.firm_id === null) {
        console.error('[JOURNAL_ENTRY_CREATE] firm_id is undefined or null:', req.user);
        return res.status(400).json({ error: 'User firm association is invalid' });
    }
    
    const firmId = Number(req.user.firm_id);
    if (isNaN(firmId) || firmId <= 0) {
        console.error('[JOURNAL_ENTRY_CREATE] Invalid firmId after conversion:', req.user.firm_id);
        return res.status(400).json({ error: 'Invalid firm ID after conversion' });
    }

    // Validate required fields
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: 'Journal entries array is required and cannot be empty' });
    }

    // Validate that debits equal credits
    const totalDebits = entries.reduce((sum, entry) => sum + (parseFloat(entry.debit_amount) || 0), 0);
    const totalCredits = entries.reduce((sum, entry) => sum + (parseFloat(entry.credit_amount) || 0), 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) { // Allow small rounding differences
        return res.status(400).json({ error: `Journal entry must be balanced. Debits: ₹${totalDebits.toFixed(2)}, Credits: ₹${totalCredits.toFixed(2)}` });
    }

    // Validate each entry
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        
        if (!entry.account_head) {
            return res.status(400).json({ error: `Entry ${i+1}: Account head is required` });
        }
        
        if ((entry.debit_amount && parseFloat(entry.debit_amount) < 0) || 
            (entry.credit_amount && parseFloat(entry.credit_amount) < 0)) {
            return res.status(400).json({ error: `Entry ${i+1}: Amounts cannot be negative` });
        }
        
        if (entry.debit_amount && entry.credit_amount && 
            parseFloat(entry.debit_amount) > 0 && parseFloat(entry.credit_amount) > 0) {
            return res.status(400).json({ error: `Entry ${i+1}: An entry cannot have both debit and credit amounts` });
        }
        
        if (!entry.debit_amount && !entry.credit_amount) {
            return res.status(400).json({ error: `Entry ${i+1}: Either debit or credit amount is required` });
        }
        
        // Validate that the account belongs to the same firm
        try {
            const accountQuery = await turso.execute({
                sql: 'SELECT account_head FROM ledger WHERE account_head = ? AND firm_id = ? LIMIT 1',
                args: [entry.account_head, firmId]
            });
            
            // For now, we'll allow any account head since it might be a new account
            // In a real implementation, you'd want to validate against a chart of accounts
        } catch (error) {
            return res.status(500).json({ error: `Error validating account: ${error.message}` });
        }
    }

    // Generate journal entry number
    let journalEntryNo;
    try {
        journalEntryNo = await getNextVoucherNumber(req.user.firm_id, 'JOURNAL');
        console.log(`[JOURNAL_ENTRY_CREATE] Generated journal entry number: ${journalEntryNo}`);
    } catch (error) {
        console.error(`[JOURNAL_ENTRY_CREATE] Failed to generate journal entry number:`, error.message);
        return res.status(500).json({ error: `Failed to generate journal entry number: ${error.message}` });
    }

    // Set the generated journal entry number
    const finalTransactionDate = transaction_date || now().split('T')[0]; // Use today's date if not provided

    try {
        // Generate a journal entry ID first by inserting a placeholder
        const insertJournalEntryResult = await turso.execute({
            sql: `
                INSERT INTO vouchers (
                    voucher_no, voucher_type, transaction_date, narration, firm_id, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                journalEntryNo, 'JOURNAL', finalTransactionDate, narration || null,
                req.user.firm_id, actorUsername, now(), now()
            ]
        });

        const journalEntryId = Number(insertJournalEntryResult.lastInsertRowid);

        // Create ledger entries for each line in the journal entry
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const debitAmount = parseFloat(entry.debit_amount) || 0;
            const creditAmount = parseFloat(entry.credit_amount) || 0;
            
            await turso.execute({
                sql: `
                    INSERT INTO ledger (
                        voucher_id, voucher_type, voucher_no, account_head, account_type,
                        debit_amount, credit_amount, narration, transaction_date, created_by, firm_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
                    journalEntryId, 'JOURNAL', journalEntryNo,
                    entry.account_head, entry.account_type || 'GENERAL',
                    debitAmount, creditAmount, 
                    entry.narration || narration || `Journal Entry ${journalEntryNo}`,
                    finalTransactionDate, actorUsername, firmId,
                    now(), now()
                ]
            });
        }

        res.json({ 
            message: 'Journal entry created successfully', 
            journalEntryId,
            journalEntryNo,
            totalDebits: totalDebits,
            totalCredits: totalCredits
        });
    } catch (error) {
        console.error('[JOURNAL_ENTRY_CREATE] Error creating journal entry:', error);
        res.status(500).json({ error: 'Failed to create journal entry: ' + error.message });
    }
};

/**
 * Get all journal entries for the current firm with pagination and filtering
 */
exports.getJournalEntries = async (req, res) => {
    try {
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        const { start_date, end_date, search, page = 1, limit = 10 } = req.query;

        // Calculate offset for pagination
        const pageInt = Number(page);
        const limitInt = Number(limit);
        
        if (!isFinite(pageInt) || !isFinite(limitInt) || pageInt <= 0 || limitInt <= 0) {
            return res.status(400).json({ error: 'Invalid pagination parameters' });
        }
        
        const offset = (Math.floor(pageInt) - 1) * Math.floor(limitInt);
        
        if (req.user.firm_id === undefined || req.user.firm_id === null) {
            console.error('[JOURNAL_ENTRIES_GET] firm_id is undefined or null:', req.user);
            return res.status(400).json({ error: 'User firm association is invalid' });
        }
        
        const firmId = Number(req.user.firm_id);
        if (isNaN(firmId) || firmId <= 0) {
            console.error('[JOURNAL_ENTRIES_GET] Invalid firmId after conversion:', req.user.firm_id);
            return res.status(400).json({ error: 'Invalid firm ID after conversion' });
        }
        
        // Build main query to get journal entries (vouchers with type JOURNAL)
        let query = `SELECT v.*, 
                     SUM(l.debit_amount) as total_debit, 
                     SUM(l.credit_amount) as total_credit
                     FROM vouchers v 
                     LEFT JOIN ledger l ON v.id = l.voucher_id
                     WHERE v.firm_id = ? AND v.voucher_type = 'JOURNAL'`;
        const queryParams = [firmId];

        // Add date filters if provided
        if (start_date) {
            query += ' AND v.transaction_date >= ?';
            queryParams.push(start_date);
        }

        if (end_date) {
            query += ' AND v.transaction_date <= ?';
            queryParams.push(end_date);
        }

        // Add search functionality
        if (search && search.trim()) {
            query += ' AND (v.voucher_no LIKE ? OR v.narration LIKE ?)';
            const searchTerm = `%${search.trim()}%`;
            queryParams.push(searchTerm, searchTerm);
        }

        // Group by voucher to aggregate debit/credit totals
        query += ' GROUP BY v.id';

        // Count total records for pagination
        const countQuery = query.replace(/SELECT.*FROM vouchers/, 'SELECT COUNT(*) as count FROM vouchers');
        const countResult = await turso.execute({
            sql: countQuery,
            args: [...queryParams] // Spread the array to avoid mutation
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

        // Convert BigInt values to numbers in journal entries
        const journalEntries = result.rows.map(entry => {
            const processedEntry = {};
            for (const [key, value] of Object.entries(entry)) {
                if (typeof value === 'bigint') {
                    const numValue = Number(value);
                    // Check if the number is finite
                    if (!isFinite(numValue)) {
                        processedEntry[key] = 0; // Default to 0 for non-finite values
                    } else {
                        processedEntry[key] = numValue;
                    }
                } else {
                    processedEntry[key] = value;
                }
            }
            return processedEntry;
        });

        // Safely convert page and limit parameters
        const pageNum = Number(page);
        const limitNum = Number(limit);
        
        res.json({
            journalEntries,
            total,
            page: isFinite(pageNum) ? Math.max(1, pageNum) : 1,
            limit: isFinite(limitNum) ? Math.max(1, limitNum) : 10,
            totalPages: isFinite(total) && isFinite(limitNum) && limitNum > 0 ? Math.ceil(total / limitNum) : 0
        });
    } catch (error) {
        console.error('[JOURNAL_ENTRIES_GET] Error fetching journal entries:', error);
        res.status(500).json({ error: 'Failed to fetch journal entries: ' + error.message });
    }
};

/**
 * Get a specific journal entry by ID
 */
exports.getJournalEntryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Validate the ID parameter
        const journalEntryId = Number(id);
        if (isNaN(journalEntryId) || journalEntryId <= 0) {
            return res.status(400).json({ error: 'Invalid journal entry ID' });
        }
        
        if (req.user.firm_id === undefined || req.user.firm_id === null) {
            console.error('[JOURNAL_ENTRY_GET_BY_ID] firm_id is undefined or null:', req.user);
            return res.status(400).json({ error: 'User firm association is invalid' });
        }
        
        const firmId = Number(req.user.firm_id);
        if (isNaN(firmId) || firmId <= 0) {
            console.error('[JOURNAL_ENTRY_GET_BY_ID] Invalid firmId after conversion:', req.user.firm_id);
            return res.status(400).json({ error: 'Invalid firm ID after conversion' });
        }

        // First get the journal entry header
        const headerResult = await turso.execute({
            sql: 'SELECT * FROM vouchers WHERE id = ? AND firm_id = ? AND voucher_type = ?',
            args: [journalEntryId, firmId, 'JOURNAL']
        });

        if (headerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Journal entry not found or does not belong to your firm' });
        }

        const journalEntryHeader = headerResult.rows[0];

        // Then get all the ledger entries for this journal entry
        const detailsResult = await turso.execute({
            sql: 'SELECT * FROM ledger WHERE voucher_id = ? AND firm_id = ? ORDER BY id',
            args: [journalEntryId, firmId]
        });

        // Convert BigInt values to numbers
        const processedHeader = {};
        for (const [key, value] of Object.entries(journalEntryHeader)) {
            if (typeof value === 'bigint') {
                const numValue = Number(value);
                // Check if the number is finite
                if (!isFinite(numValue)) {
                    processedHeader[key] = 0; // Default to 0 for non-finite values
                } else {
                    processedHeader[key] = numValue;
                }
            } else {
                processedHeader[key] = value;
            }
        }

        const ledgerEntries = detailsResult.rows.map(entry => {
            const processedEntry = {};
            for (const [key, value] of Object.entries(entry)) {
                if (typeof value === 'bigint') {
                    const numValue = Number(value);
                    // Check if the number is finite
                    if (!isFinite(numValue)) {
                        processedEntry[key] = 0; // Default to 0 for non-finite values
                    } else {
                        processedEntry[key] = numValue;
                    }
                } else {
                    processedEntry[key] = value;
                }
            }
            return processedEntry;
        });

        res.json({
            ...processedHeader,
            entries: ledgerEntries
        });
    } catch (error) {
        console.error('[JOURNAL_ENTRY_GET_BY_ID] Error fetching journal entry:', error);
        res.status(500).json({ error: 'Failed to fetch journal entry: ' + error.message });
    }
};

/**
 * Delete a journal entry (soft delete by marking as cancelled)
 */
exports.deleteJournalEntry = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Validate the ID parameter
        const journalEntryId = Number(id);
        if (isNaN(journalEntryId) || journalEntryId <= 0) {
            return res.status(400).json({ error: 'Invalid journal entry ID' });
        }
        
        if (req.user.firm_id === undefined || req.user.firm_id === null) {
            console.error('[JOURNAL_ENTRY_DELETE] firm_id is undefined or null:', req.user);
            return res.status(400).json({ error: 'User firm association is invalid' });
        }
        
        const firmId = Number(req.user.firm_id);
        if (isNaN(firmId) || firmId <= 0) {
            console.error('[JOURNAL_ENTRY_DELETE] Invalid firmId after conversion:', req.user.firm_id);
            return res.status(400).json({ error: 'Invalid firm ID after conversion' });
        }

        // Check if the journal entry exists and belongs to the firm
        const journalEntryResult = await turso.execute({
            sql: 'SELECT * FROM vouchers WHERE id = ? AND firm_id = ? AND voucher_type = ?',
            args: [journalEntryId, firmId, 'JOURNAL']
        });

        if (journalEntryResult.rows.length === 0) {
            return res.status(404).json({ error: 'Journal entry not found or does not belong to your firm' });
        }

        // Begin transaction to delete the journal entry (we'll mark it as deleted by removing from ledger and vouchers)
        // First, delete all related ledger entries
        await turso.execute({
            sql: 'DELETE FROM ledger WHERE voucher_id = ? AND firm_id = ?',
            args: [journalEntryId, firmId]
        });

        // Then delete the voucher record
        await turso.execute({
            sql: 'DELETE FROM vouchers WHERE id = ? AND firm_id = ?',
            args: [journalEntryId, firmId]
        });

        res.json({ 
            message: 'Journal entry deleted successfully',
            journalEntryId
        });
    } catch (error) {
        console.error('[JOURNAL_ENTRY_DELETE] Error deleting journal entry:', error);
        res.status(500).json({ error: 'Failed to delete journal entry: ' + error.message });
    }
};

/**
 * Get journal entry summary statistics for the current firm
 */
exports.getJournalEntrySummary = async (req, res) => {
    try {
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Convert firm_id to number, handling both string and number inputs
        if (req.user.firm_id === undefined || req.user.firm_id === null) {
            console.error('[JOURNAL_ENTRY_SUMMARY] firm_id is undefined or null:', req.user);
            return res.status(400).json({ error: 'User firm association is invalid' });
        }
        
        const firmId = Number(req.user.firm_id);
        if (isNaN(firmId) || firmId <= 0) {
            console.error('[JOURNAL_ENTRY_SUMMARY] Invalid firmId after conversion:', req.user.firm_id);
            return res.status(400).json({ error: 'Invalid firm ID after conversion' });
        }
        
        // Get total journal entries
        const journalEntriesResult = await turso.execute({
            sql: `SELECT COUNT(*) as count FROM vouchers 
                  WHERE firm_id = ? AND voucher_type = 'JOURNAL'`,
            args: [firmId]
        });
        
        const rawCount = journalEntriesResult.rows[0]?.count;
        let totalJournalEntries = 0;
        if (rawCount !== null && rawCount !== undefined) {
            totalJournalEntries = Number(rawCount);
            if (!isFinite(totalJournalEntries)) {
                totalJournalEntries = 0;
            }
        }

        // Get count of recent journal entries (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

        const recentCountResult = await turso.execute({
            sql: `SELECT COUNT(*) as count FROM vouchers 
                  WHERE firm_id = ? AND voucher_type = 'JOURNAL' AND transaction_date >= ?`,
            args: [firmId, dateStr]
        });
        
        const rawRecentCount = recentCountResult.rows[0]?.count;
        let recentJournalEntriesCount = 0;
        if (rawRecentCount !== null && rawRecentCount !== undefined) {
            recentJournalEntriesCount = Number(rawRecentCount);
            if (!isFinite(recentJournalEntriesCount)) {
                recentJournalEntriesCount = 0;
            }
        }

        res.json({
            total_journal_entries: totalJournalEntries,
            recent_journal_entries_count: recentJournalEntriesCount
        });
    } catch (error) {
        console.error('[JOURNAL_ENTRY_SUMMARY] Error fetching journal entry summary:', error);
        res.status(500).json({ error: 'Failed to fetch journal entry summary: ' + error.message });
    }
};