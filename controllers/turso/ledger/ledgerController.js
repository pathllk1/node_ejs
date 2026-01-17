const turso = require('../../../config/turso');
// Export the functions from the pdfMakeController
exports.exportAccountLedgerPdf = require('./pdfMakeController').exportAccountLedgerPdf;
exports.exportGeneralLedgerPdf = require('./pdfMakeController').exportGeneralLedgerPdf;
exports.exportTrialBalancePdf = require('./pdfMakeController').exportTrialBalancePdf;
exports.exportAccountTypePdf = require('./pdfMakeController').exportAccountTypePdf;

// Helper to get current ISO time
const now = () => new Date().toISOString();

exports.renderLedgerPage = async (req, res) => {
    try {
        let firmName = '';
        if (req.user && req.user.firm_id) {
            const firmQuery = await turso.execute({
                sql: 'SELECT name FROM firms WHERE id = ?',
                args: [req.user.firm_id]
            });
            const firm = firmQuery.rows[0];
            firmName = firm ? firm.name : '';
        }
        
        res.render('ledger/ledger', { 
            title: 'General Ledger', 
            user: { 
                ...req.user, 
                firm_name: firmName 
            }
        });
    } catch (err) {
        res.status(500).render('error', { error: err.message });
    }
};

exports.getLedgerAccounts = async (req, res) => {
    try {
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        const query = `
            SELECT 
                account_head,
                account_type,
                SUM(debit_amount) as total_debit,
                SUM(credit_amount) as total_credit,
                (SUM(debit_amount) - SUM(credit_amount)) as balance
            FROM ledger 
            WHERE firm_id = ?
            GROUP BY account_head, account_type
            ORDER BY account_head
        `;
        
        const result = await turso.execute({
            sql: query,
            args: [req.user.firm_id]
        });
        
        // Convert BigInt values to numbers in accounts
        const accounts = result.rows.map(account => {
            const processedAccount = {};
            for (const [key, value] of Object.entries(account)) {
                if (typeof value === 'bigint') {
                    processedAccount[key] = Number(value);
                } else {
                    processedAccount[key] = value;
                }
            }
            return processedAccount;
        });
        
        res.json(accounts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAccountDetails = async (req, res) => {
    try {
        const { account_head } = req.params;
        const { start_date, end_date } = req.query;
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        let query = `
            SELECT * FROM ledger 
            WHERE firm_id = ? AND account_head = ?
        `;
        
        const queryParams = [req.user.firm_id, account_head];
        
        if (start_date) {
            query += ` AND transaction_date >= ?`;
            queryParams.push(start_date);
        }
        
        if (end_date) {
            query += ` AND transaction_date <= ?`;
            queryParams.push(end_date);
        }
        
        query += ` ORDER BY transaction_date DESC, created_at DESC`;
        
        const result = await turso.execute({
            sql: query,
            args: queryParams
        });
        
        // Convert BigInt values to numbers in records
        const records = result.rows.map(record => {
            const processedRecord = {};
            for (const [key, value] of Object.entries(record)) {
                if (typeof value === 'bigint') {
                    processedRecord[key] = Number(value);
                } else {
                    processedRecord[key] = value;
                }
            }
            return processedRecord;
        });
        
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get account type summaries
exports.getAccountTypeSummaries = async (req, res) => {
    try {
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        const query = `
            SELECT 
                account_type,
                COUNT(*) as account_count,
                SUM(total_debit) as total_debit,
                SUM(total_credit) as total_credit,
                SUM(balance) as total_balance
            FROM (
                SELECT 
                    account_head,
                    account_type,
                    SUM(debit_amount) as total_debit,
                    SUM(credit_amount) as total_credit,
                    (SUM(debit_amount) - SUM(credit_amount)) as balance
                FROM ledger 
                WHERE firm_id = ?
                GROUP BY account_head, account_type
            )
            GROUP BY account_type
            ORDER BY account_type
        `;
        
        const result = await turso.execute({
            sql: query,
            args: [req.user.firm_id]
        });
        
        // Convert BigInt values to numbers in summaries
        const summaries = result.rows.map(summary => {
            const processedSummary = {};
            for (const [key, value] of Object.entries(summary)) {
                if (typeof value === 'bigint') {
                    processedSummary[key] = Number(value);
                } else {
                    processedSummary[key] = value;
                }
            }
            return processedSummary;
        });
        
        res.json(summaries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
