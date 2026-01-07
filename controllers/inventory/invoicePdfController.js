const db = require('../../config/db');
const puppeteer = require('puppeteer');

const formatINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(n || 0));

const formatQty = (n) => {
    const v = Number(n || 0);
    return Number.isFinite(v) ? v.toFixed(2) : '0.00';
};

const formatPercent = (n) => {
    const v = Number(n || 0);
    return Number.isFinite(v) ? v.toFixed(2) : '0.00';
};

const numToIndianRupees = (num) => {
    if (!num) return 'Rupees Zero Only';

    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const format = (n) => {
        if (n < 20) return a[n];
        const digit = n % 10;
        return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
    };

    const convert = (n) => {
        if (n < 100) return format(n);
        if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 ? 'and ' + convert(n % 100) : '');
        if (n < 100000) return convert(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 ? convert(n % 1000) : '');
        if (n < 10000000) return convert(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 ? convert(n % 100000) : '');
        return convert(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 ? convert(n % 10000000) : '');
    };

    const parts = Number(num).toFixed(2).toString().split('.');
    const rupees = convert(parseInt(parts[0], 10));
    const paise = parts[1] ? convert(parseInt(parts[1], 10)) : '';

    let resText = 'Rupees ' + (rupees || 'Zero ');
    if (paise && paise.trim()) resText += 'and ' + paise + 'Paise ';
    return resText + 'Only';
};

exports.getBillPdfById = async (req, res) => {
    let browser;

    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Bill ID is required' });
        }

        const billStmt = db.prepare('SELECT * FROM bills WHERE id = ?');
        const bill = billStmt.get(id);

        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        const itemsStmt = db.prepare('SELECT *, item_narration FROM stock_reg WHERE bill_id = ? ORDER BY created_at');
        const items = itemsStmt.all(id);

        let otherCharges = [];
        if (bill.oth_chg_json) {
            try {
                otherCharges = JSON.parse(bill.oth_chg_json) || [];
            } catch (e) {
                console.warn('Failed to parse other charges for bill', bill.id, e.message);
                otherCharges = [];
            }
        }

        bill.reverseCharge = bill.reverse_charge || false;

        const cgst = Number(bill.cgst || 0);
        const sgst = Number(bill.sgst || 0);
        const igst = Number(bill.igst || 0);
        const totalTax = cgst + sgst + igst;

        const gstApplicable = totalTax > 0;
        const taxableValue = Number(bill.gtot || 0);
        const grandTotal = gstApplicable ? Number(bill.ntot || 0) : taxableValue;
        const taxMode = (bill.btype && bill.btype.toLowerCase().includes('intra')) ? 'CGST_SGST' : 'IGST';

        const seller = { name: 'My App', lines: '' };

        const buyer = {
            name: bill.firm || 'Buyer',
            address: bill.addr || '',
            state: bill.state || '',
            pin: bill.pin || '',
            gstin: bill.gstin || ''
        };

        const consignee = {
            name: bill.consignee_name || buyer.name,
            address: bill.consignee_address || buyer.address,
            state: bill.consignee_state || buyer.state,
            pin: bill.consignee_pin || buyer.pin,
            gstin: bill.consignee_gstin || buyer.gstin
        };

        const invoiceTitle = 'TAX INVOICE';
        const invoiceSubtitle = gstApplicable ? 'Invoice under GST' : 'Invoice (GST Disabled)';

        const totals = { taxableValue, cgst, sgst, igst, totalTax, grandTotal, taxMode };
        const amountInWords = numToIndianRupees(grandTotal);

        const html = await new Promise((resolve, reject) => {
            req.app.render(
                'inventory/invoice-pdf',
                {
                    invoiceTitle,
                    invoiceSubtitle,
                    bill,
                    items,
                    otherCharges,
                    seller,
                    buyer,
                    consignee,
                    gstApplicable,
                    totals,
                    amountInWords,
                    formatINR,
                    formatQty,
                    formatPercent
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
            margin: { top: '14mm', right: '14mm', bottom: '14mm', left: '14mm' }
        });

        const safeBillNo = String(bill.bno || `BILL-${bill.id}`).replace(/[^a-zA-Z0-9._-]/g, '_');
        const filename = `Invoice_${safeBillNo}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', String(pdfBuffer.length));
        res.end(pdfBuffer);
    } catch (err) {
        console.error('PDF export error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (e) {}
        }
    }
};
