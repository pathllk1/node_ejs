const db = require('../../config/db');
const puppeteer = require('puppeteer');

const formatINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(n || 0));

exports.exportAccountLedgerPdf = async (req, res) => {
    let browser;
    
    try {
        const { account_head } = req.params;
        const { start_date, end_date } = req.query;
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Get firm information
        const firmStmt = db.prepare('SELECT name FROM firms WHERE id = ?');
        const firm = firmStmt.get(req.user.firm_id);
        const firmName = firm ? firm.name : 'Unknown Firm';

        // Get account details
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
        
        query += ` ORDER BY transaction_date ASC, created_at ASC`;
        
        const stmt = db.prepare(query);
        const records = stmt.all(...queryParams);

        if (!records || records.length === 0) {
            return res.status(404).json({ error: 'No ledger records found for this account' });
        }

        // Calculate running balance
        let runningBalance = 0;
        records.forEach(record => {
            record.running_balance = runningBalance;
            if (record.voucher_type.startsWith('PAYMENT') || record.voucher_type.startsWith('JOURNAL')) {
                if (record.debit_amount > 0) {
                    runningBalance += record.debit_amount;
                    record.balance_after = runningBalance;
                } else if (record.credit_amount > 0) {
                    runningBalance -= record.credit_amount;
                    record.balance_after = runningBalance;
                }
            } else {
                runningBalance += record.debit_amount - record.credit_amount;
                record.balance_after = runningBalance;
            }
        });

        const generatedOn = new Date().toLocaleString();
        
        // Format dates for display
        const formattedStartDate = start_date ? new Date(start_date).toLocaleDateString('en-IN') : null;
        const formattedEndDate = end_date ? new Date(end_date).toLocaleDateString('en-IN') : null;

        const html = await new Promise((resolve, reject) => {
            req.app.render(
                'ledger/ledger-pdf',
                {
                    accountHead: account_head,
                    firmName,
                    records,
                    generatedOn,
                    formatINR,
                    dateRange: {
                        start: formattedStartDate,
                        end: formattedEndDate
                    }
                },
                (err, rendered) => {
                    if (err) return reject(err);
                    resolve(rendered);
                }
            );
        });

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: ['load', 'networkidle0'] });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' }
        });

        const safeAccountHead = String(account_head || 'LEDGER').replace(/[^a-zA-Z0-9._-]/g, '_');
        const filename = `Ledger_${safeAccountHead}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', String(pdfBuffer.length));
        res.end(pdfBuffer);
    } catch (err) {
        console.error('Error generating PDF:', err);
        res.status(500).json({ error: 'Error generating PDF: ' + err.message });
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (e) {}
        }
    }
};