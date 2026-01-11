const db = require('../../config/db');

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
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        const query = `
            SELECT * FROM ledger 
            WHERE firm_id = ? AND account_head = ?
            ORDER BY transaction_date DESC, created_at DESC
        `;
        
        const stmt = db.prepare(query);
        const records = stmt.all(req.user.firm_id, account_head);
        
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
