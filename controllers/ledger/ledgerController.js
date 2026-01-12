const db = require('../../config/db');
// Export the function from the pdfController
exports.exportAccountLedgerPdf = require('./pdfController').exportAccountLedgerPdf;

// Helper to get current ISO time
const now = () => new Date().toISOString();

exports.renderLedgerPage = (req, res) => {
    try {
        let firmName = '';
        if (req.user && req.user.firm_id) {
            const firmStmt = db.prepare('SELECT name FROM firms WHERE id = ?');
            const firm = firmStmt.get(req.user.firm_id);
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

exports.getLedgerAccounts = (req, res) => {
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
        
        const stmt = db.prepare(query);
        const accounts = stmt.all(req.user.firm_id);
        
        res.json(accounts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAccountDetails = (req, res) => {
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
        
        const stmt = db.prepare(query);
        const records = stmt.all(...queryParams);
        
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get account type summaries
exports.getAccountTypeSummaries = (req, res) => {
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
        
        const stmt = db.prepare(query);
        const summaries = stmt.all(req.user.firm_id);
        
        res.json(summaries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
