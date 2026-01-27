const PdfPrinter = require('pdfmake/js/Printer').default;
const path = require('path');
const fs = require('fs');
const turso = require('../../../config/turso');

// Function to resolve font paths properly on different platforms
const getFontPath = (fileName) => {
    // Use forward slashes for compatibility across platforms
    const relativePath = `../../../public/fonts/${fileName}`;
    return path.resolve(__dirname, relativePath);
};

// Verify font files exist before initializing printer
const fontFiles = [
    'DejaVuSans.ttf',
    'DejaVuSans-Bold.ttf', 
    'DejaVuSans-Oblique.ttf',
    'DejaVuSans-BoldOblique.ttf'
];

// Check if font files exist
fontFiles.forEach(fontFile => {
    const fontPath = getFontPath(fontFile);
    if (!fs.existsSync(fontPath)) {
        console.warn(`Warning: Font file does not exist: ${fontPath}`);
    }
});

// Font definitions
const fonts = {
    DejaVuSans: {
        normal: getFontPath('DejaVuSans.ttf'),
        bold: getFontPath('DejaVuSans-Bold.ttf'),
        italics: getFontPath('DejaVuSans-Oblique.ttf'),
        bolditalics: getFontPath('DejaVuSans-BoldOblique.ttf')
    }
};

const printer = new PdfPrinter(fonts);

// Helper functions
const formatCurrency = (amount) => {
    return '₹ ' + new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
};

const formatQuantity = (qty) => {
    return parseFloat(qty || 0).toFixed(2);
};

const formatPercentage = (percent) => {
    return parseFloat(percent || 0).toFixed(2) + '%';
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    } catch (e) {
        return dateString;
    }
};

const numberToWords = (num) => {
    if (!num || isNaN(num)) return "Rupees Zero Only";
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const convertHundreds = (n) => {
        let str = '';
        const numVal = Math.floor(n);
        if (numVal > 99) {
            str += ones[Math.floor(numVal/100)] + ' Hundred ';
            return str + convertTens(numVal % 100);
        }
        return convertTens(numVal);
    };
    
    const convertTens = (n) => {
        let str = '';
        const numVal = Math.floor(n);
        if (numVal < 20) {
            return ones[numVal] || teens[numVal - 10] || '';
        }
        str += tens[Math.floor(numVal/10)];
        if (numVal % 10 > 0) {
            str += ' ' + ones[numVal % 10];
        }
        return str;
    };

    const absNum = Math.abs(Number(num));
    const wholePart = Math.floor(absNum);
    const decimalPart = Math.round((absNum - wholePart) * 100);
    
    if (wholePart === 0 && decimalPart === 0) return "Rupees Zero Only";

    let result = "Rupees ";
    let tempWhole = wholePart;
    
    if (tempWhole >= 10000000) {
        const crores = Math.floor(tempWhole/10000000);
        result += convertHundreds(crores) + ' Crore ';
        tempWhole %= 10000000;
    }
    
    if (tempWhole >= 100000) {
        const lakhs = Math.floor(tempWhole/100000);
        result += convertHundreds(lakhs) + ' Lakh ';
        tempWhole %= 100000;
    }
    
    if (tempWhole >= 1000) {
        const thousands = Math.floor(tempWhole/1000);
        result += convertHundreds(thousands) + ' Thousand ';
        tempWhole %= 1000;
    }
    
    if (tempWhole > 0) {
        result += convertHundreds(tempWhole);
    }
    
    if (decimalPart > 0) {
        result += " and " + convertTens(decimalPart) + " Paise ";
    }
    
    return result.trim() + " Only";
};

const getInvoiceTypeLabel = (bill) => {
    if (bill.transactionType) {
        const transactionType = bill.transactionType.toUpperCase();
        switch(transactionType) {
            case 'SALE': return 'SALES INVOICE';
            case 'PURCHASE': return 'PURCHASE INVOICE';
            case 'CREDIT NOTE': return 'CREDIT NOTE';
            case 'DEBIT NOTE': return 'DEBIT NOTE';
            case 'DELIVERY NOTE': return 'DELIVERY NOTE';
            default: return transactionType;
        }
    }
    return 'SALES INVOICE';
};

const getPartyLabels = (bill) => {
    const type = bill.transactionType?.toUpperCase() || 'SALE';
    switch(type) {
        case 'SALE': return { billTo: 'Bill To (Buyer)', shipTo: 'Ship To (Consignee)' };
        case 'PURCHASE': return { billTo: 'Bill From (Supplier)', shipTo: 'Bill To (Receiver)' };
        case 'CREDIT NOTE': return { billTo: 'Bill To (Recipient)', shipTo: 'Ship To (Consignee)' };
        case 'DEBIT NOTE': return { billTo: 'Bill From (Supplier)', shipTo: 'Bill To (Recipient)' };
        case 'DELIVERY NOTE': return { billTo: 'Deliver From (Supplier)', shipTo: 'Deliver To (Recipient)' };
        default: return { billTo: 'Bill To (Buyer)', shipTo: 'Ship To (Consignee)' };
    }
};

const getBillType = (bill) => {
    const billTypeSource = (bill.btype || bill.billType || '').toString().toLowerCase();
    if (billTypeSource.includes('intra')) return 'intra-state';
    if (billTypeSource.includes('inter')) return 'inter-state';
    const cgst = Number(bill.cgst) || 0;
    const sgst = Number(bill.sgst) || 0;
    return (cgst > 0 || sgst > 0) ? 'intra-state' : 'inter-state';
};

const buildHsnSummary = (bill, items, otherCharges, gstEnabled) => {
    const hsnMap = new Map();
    const billType = getBillType(bill);

    items.forEach(item => {
        const hsn = item.hsn || 'NA';
        const taxableValue = (item.qty || 0) * (item.rate || 0) * (1 - (item.disc || 0) / 100);
        const taxAmount = taxableValue * (item.grate || 0) / 100;
        
        if (!hsnMap.has(hsn)) {
            hsnMap.set(hsn, { hsn, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 });
        }
        
        const row = hsnMap.get(hsn);
        row.taxableValue += taxableValue;
        if (gstEnabled) {
            row.totalTax += taxAmount;
            if (billType === 'intra-state') {
                row.cgst += taxAmount / 2;
                row.sgst += taxAmount / 2;
            } else {
                row.igst += taxAmount;
            }
        }
    });

    otherCharges.forEach(charge => {
        const hsn = charge.hsnSac || '9999';
        const taxableValue = charge.amount || 0;
        const taxAmount = charge.gstAmount || 0;
        
        if (!hsnMap.has(hsn)) {
            hsnMap.set(hsn, { hsn, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 });
        }
        
        const row = hsnMap.get(hsn);
        row.taxableValue += taxableValue;
        if (gstEnabled) {
            row.totalTax += taxAmount;
            if (billType === 'intra-state') {
                row.cgst += taxAmount / 2;
                row.sgst += taxAmount / 2;
            } else {
                row.igst += taxAmount;
            }
        }
    });

    return Array.from(hsnMap.values()).sort((a, b) => a.hsn.localeCompare(b.hsn));
};

exports.getBillPdf = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'Bill ID is required' });

        const billQuery = await turso.execute({
            sql: `
                SELECT b.*, sr.type as transactionType
                FROM bills b
                LEFT JOIN (
                    SELECT bill_id, type, MIN(id) as min_id FROM stock_reg GROUP BY bill_id
                ) sr ON b.id = sr.bill_id
                WHERE b.id = ?
            `,
            args: [id]
        });
        const bill = billQuery.rows[0];

        if (!bill) return res.status(404).json({ error: 'Bill not found' });

        // Convert BigInt values to numbers in bill
        const processedBill = {};
        for (const [key, value] of Object.entries(bill)) {
            if (typeof value === 'bigint') {
                processedBill[key] = Number(value);
            } else {
                processedBill[key] = value;
            }
        }

        const itemsResult = await turso.execute({
            sql: 'SELECT *, item_narration FROM stock_reg WHERE bill_id = ? ORDER BY created_at',
            args: [id]
        });
        
        // Convert BigInt values to numbers in items
        const items = itemsResult.rows.map(item => {
            const processedItem = {};
            for (const [key, value] of Object.entries(item)) {
                if (typeof value === 'bigint') {
                    processedItem[key] = Number(value);
                } else {
                    processedItem[key] = value;
                }
            }
            return processedItem;
        });
        
        let otherCharges = [];
        if (processedBill.oth_chg_json) {
            try { otherCharges = JSON.parse(processedBill.oth_chg_json) || []; } catch (e) { otherCharges = []; }
        }

        // Fetch GST settings
        let gstEnabled = true;
        if (req.user && req.user.firm_id) {
            const firmGstSettingResult = await turso.execute({
                sql: 'SELECT setting_value FROM firm_settings WHERE firm_id = ? AND setting_key = ?',
                args: [req.user.firm_id, 'gst_enabled']
            });
            const firmGstSetting = firmGstSettingResult.rows[0];
            if (firmGstSetting) gstEnabled = JSON.parse(firmGstSetting.setting_value);
            else {
                const globalGstResult = await turso.execute({
                    sql: 'SELECT setting_value FROM settings WHERE setting_key = ?',
                    args: ['gst_enabled']
                });
                const globalGst = globalGstResult.rows[0];
                gstEnabled = globalGst ? JSON.parse(globalGst.setting_value) : true;
            }
        }

        // Fetch Seller Info
        let seller = { name: 'Company Name', address: 'Address', gstin: '' };
        if (req.user && req.user.firm_id) {
            const firmResult = await turso.execute({
                sql: 'SELECT name, address, gst_number FROM firms WHERE id = ?',
                args: [req.user.firm_id]
            });
            const firm = firmResult.rows[0];
            if (firm) {
                seller = { name: firm.name, address: firm.address, gstin: firm.gst_number || '' };
            }
        }

        const billType = getBillType(processedBill);
        const partyLabels = getPartyLabels(processedBill);
        const hsnSummary = buildHsnSummary(processedBill, items, otherCharges, gstEnabled);
        
        // Use state codes and PINs directly from the database
        // The bills table now contains pin and state_code copied from parties table
        const buyerStateCode = processedBill.state_code;  // Direct numeric state code from database
        const consigneeStateCode = processedBill.consignee_state_code || processedBill.state_code;  // Use consignee state code or fall back to main state code
        
        // Format addresses with PIN codes using direct database values
        const formattedBuyerAddress = processedBill.addr && processedBill.pin ? `${processedBill.addr}, PIN: ${processedBill.pin}` : (processedBill.addr || `PIN: ${processedBill.pin}`);
        const formattedConsigneeAddress = (processedBill.consignee_address || processedBill.addr) && (processedBill.consignee_pin || processedBill.pin) ? 
            `${processedBill.consignee_address || processedBill.addr}, PIN: ${processedBill.consignee_pin || processedBill.pin}` : 
            ((processedBill.consignee_address || processedBill.addr) || `PIN: ${processedBill.consignee_pin || processedBill.pin}`);
        
        const taxableValue = processedBill.gtot || 0;
        const totalTax = gstEnabled ? ((processedBill.cgst || 0) + (processedBill.sgst || 0) + (processedBill.igst || 0)) : 0;
        const grandTotal = gstEnabled ? (processedBill.ntot || 0) : taxableValue;
        const roundedGrandTotal = Math.round(grandTotal);
        const roundOff = roundedGrandTotal - grandTotal;
        
        // Build Doc Definition
        const docDefinition = {
            defaultStyle: {
                font: 'DejaVuSans',
                fontSize: 9,
                color: '#333333'
            },
            content: [
                // Header
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { text: getInvoiceTypeLabel(processedBill), style: 'title' },
                                { text: gstEnabled ? 'Invoice under GST' : 'Invoice (GST Disabled)', style: 'subtitle' },
                                { text: seller.name, style: 'sellerName', margin: [0, 10, 0, 2] },
                                { text: seller.address, style: 'sellerMeta' },
                                { text: `GSTIN: ${seller.gstin}`, style: 'sellerMeta' }
                            ]
                        },
                        {
                            width: 180,
                            table: {
                                widths: ['*', '*'],
                                body: [
                                    [{ text: 'Invoice No:', style: 'label' }, { text: processedBill.bno || '', style: 'value' }],
                                    [{ text: 'Date:', style: 'label' }, { text: formatDate(processedBill.bdate) || '', style: 'value' }],
                                    ...(processedBill.order_no ? [[{ text: 'PO No:', style: 'label' }, { text: processedBill.order_no, style: 'value' }]] : []),
                                    ...(processedBill.vehicle_no ? [[{ text: 'Vehicle No:', style: 'label' }, { text: processedBill.vehicle_no, style: 'value' }]] : []),
                                    ...(processedBill.dispatch_through ? [[{ text: 'Dispatch Through:', style: 'label' }, { text: processedBill.dispatch_through, style: 'value' }]] : [])
                                ]
                            },
                            layout: {
                                hLineWidth: () => 0.5,
                                vLineWidth: () => 0.5,
                                hLineColor: () => '#E5E7EB',
                                vLineColor: () => '#E5E7EB',
                                paddingLeft: () => 8,
                                paddingRight: () => 8,
                                paddingTop: () => 4,
                                paddingBottom: () => 4
                            }
                        }
                    ]
                },
                { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 1, lineColor: '#E5E7EB' }], margin: [0, 5, 0, 10] },
                
                // Party Details
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { text: partyLabels.billTo, style: 'boxTitle' },
                                {
                                    stack: [
                                        { text: processedBill.firm || '', bold: true },
                                        { text: formattedBuyerAddress },
                                        { text: processedBill.state && buyerStateCode ? `State: ${processedBill.state} (${buyerStateCode})` : (processedBill.state ? `State: ${processedBill.state}` : '') },
                                        { text: processedBill.gstin ? `GSTIN: ${processedBill.gstin}${processedBill.pin ? ` | PIN: ${processedBill.pin}` : ''}` : (processedBill.pin ? `PIN: ${processedBill.pin}` : '') }
                                    ],
                                    margin: [0, 5, 0, 0]
                                }
                            ],
                            margin: [0, 0, 10, 0]
                        },
                        {
                            width: '*',
                            stack: [
                                { text: partyLabels.shipTo, style: 'boxTitle' },
                                {
                                    stack: [
                                        { text: processedBill.consignee_name || processedBill.firm || '', bold: true },
                                        { text: formattedConsigneeAddress },
                                        { text: (processedBill.consignee_state || processedBill.state) && consigneeStateCode ? `State: ${processedBill.consignee_state || processedBill.state} (${consigneeStateCode})` : ((processedBill.consignee_state || processedBill.state) ? `State: ${processedBill.consignee_state || processedBill.state}` : '') },
                                        { text: (processedBill.consignee_gstin || processedBill.gstin) ? `GSTIN: ${processedBill.consignee_gstin || processedBill.gstin}${(processedBill.consignee_pin || processedBill.pin) ? ` | PIN: ${processedBill.consignee_pin || processedBill.pin}` : ''}` : ((processedBill.consignee_pin || processedBill.pin) ? `PIN: ${processedBill.consignee_pin || processedBill.pin}` : '') }
                                    ],
                                    margin: [0, 5, 0, 0]
                                }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 15]
                },
                
                // Items Table
                {
                    table: {
                        headerRows: 1,
                        widths: [12, 118, 45, 30, 25, 40, 35, 39, 58],
                        body: [
                            [
                                { text: '#', style: 'tableHeader', alignment: 'center' },
                                { text: 'Description', style: 'tableHeader' },
                                { text: 'HSN/SAC', style: 'tableHeader', alignment: 'center' },
                                { text: 'Qty', style: 'tableHeader', alignment: 'center' },
                                { text: 'UOM', style: 'tableHeader', alignment: 'center' },
                                { text: 'Rate', style: 'tableHeader', alignment: 'right' },
                                { text: 'Disc%', style: 'tableHeader', alignment: 'right' },
                                { text: 'GST%', style: 'tableHeader', alignment: 'right' },
                                { text: 'Amount', style: 'tableHeader', alignment: 'right' }
                            ],
                            ...items.map((it, idx) => [
                                { text: idx + 1, alignment: 'center', style: 'tableCell' },
                                {
                                    stack: [
                                        { text: it.item || '', bold: true },
                                        ...(it.batch ? [{ text: `Batch: ${it.batch}`, fontSize: 8, color: '#666' }] : []),
                                        ...(it.item_narration ? [{ text: it.item_narration, fontSize: 8, color: '#666' }] : [])
                                    ],
                                    style: 'tableCell'
                                },
                                { text: it.hsn || '', alignment: 'center', style: 'tableCell' },
                                { text: formatQuantity(it.qty), alignment: 'center', style: 'tableCell' },
                                { text: it.uom || '', alignment: 'center', style: 'tableCell' },
                                { text: formatCurrency(it.rate), alignment: 'right', style: 'tableCell' },
                                { text: formatPercentage(it.disc), alignment: 'right', style: 'tableCell' },
                                { text: gstEnabled ? formatPercentage(it.grate) : '-', alignment: 'right', style: 'tableCell' },
                                { text: formatCurrency(it.total), alignment: 'right', bold: true, style: 'tableCell' }
                            ]),
                            ...otherCharges.map((ch, idx) => [
                                { text: items.length + idx + 1, alignment: 'center', style: 'tableCell' },
                                {
                                    stack: [
                                        { text: ch.name || ch.type || 'Other Charge', bold: true },
                                        { text: `HSN/SAC: ${ch.hsnSac || ''}`, fontSize: 8, color: '#666' }
                                    ],
                                    style: 'tableCell'
                                },
                                { text: ch.hsnSac || '', alignment: 'center', style: 'tableCell' },
                                { text: '1', alignment: 'center', style: 'tableCell' },
                                { text: 'NOS', alignment: 'center', style: 'tableCell' },
                                { text: formatCurrency(ch.amount), alignment: 'right', style: 'tableCell' },
                                { text: '0.00%', alignment: 'right', style: 'tableCell' },
                                { text: gstEnabled ? formatPercentage(ch.gstRate) : '-', alignment: 'right', style: 'tableCell' },
                                { text: formatCurrency(ch.amount), alignment: 'right', bold: true, style: 'tableCell' }
                            ])
                        ]
                    },
                    layout: {
                        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
                        vLineWidth: () => 0,
                        hLineColor: (i, node) => (i === 0 || i === node.table.body.length) ? '#374151' : '#E5E7EB',
                        paddingLeft: () => 8,
                        paddingRight: () => 8,
                        paddingTop: () => 6,
                        paddingBottom: () => 6
                    }
                },
                
                // HSN Summary
                ...(hsnSummary.length > 0 && gstEnabled ? [
                    { text: 'HSN/SAC Summary', style: 'boxTitle', margin: [0, 15, 0, 5] },
                    {
                        table: {
                            headerRows: 1,
                            widths: [60, 85, 60, 60, 60, 90],
                            body: [
                                [
                                    { text: 'HSN/SAC', style: 'tableHeader', alignment: 'center' },
                                    { text: 'Taxable Value', style: 'tableHeader', alignment: 'right' },
                                    { text: 'CGST', style: 'tableHeader', alignment: 'right' },
                                    { text: 'SGST', style: 'tableHeader', alignment: 'right' },
                                    { text: 'IGST', style: 'tableHeader', alignment: 'right' },
                                    { text: 'Total Tax', style: 'tableHeader', alignment: 'right' }
                                ],
                                ...hsnSummary.map(row => [
                                    { text: row.hsn, alignment: 'center', style: 'tableCell' },
                                    { text: formatCurrency(row.taxableValue), alignment: 'right', style: 'tableCell' },
                                    { text: processedBill.type === 'intra-state' ? formatCurrency(row.cgst) : formatCurrency(0), alignment: 'right', style: 'tableCell' },
                                    { text: processedBill.type === 'intra-state' ? formatCurrency(row.sgst) : formatCurrency(0), alignment: 'right', style: 'tableCell' },
                                    { text: processedBill.type === 'inter-state' ? formatCurrency(row.igst) : formatCurrency(0), alignment: 'right', style: 'tableCell' },
                                    { text: formatCurrency(row.totalTax), alignment: 'right', bold: true, style: 'tableCell' }
                                ])
                            ]
                        },
                        layout: {
                            hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
                            vLineWidth: () => 0,
                            hLineColor: (i, node) => (i === 0 || i === node.table.body.length) ? '#374151' : '#E5E7EB',
                            paddingLeft: () => 8,
                            paddingRight: () => 8,
                            paddingTop: () => 6,
                            paddingBottom: () => 6
                        }
                    }
                ] : []),
                
                // Footer Section
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { text: 'Amount (in words)', style: 'label', margin: [0, 15, 0, 5] },
                                { text: numberToWords(roundedGrandTotal), bold: true, fontSize: 9 },
                                ...(processedBill.narration ? [
                                    { text: 'Narration', style: 'label', margin: [0, 8, 0, 5] },
                                    { text: processedBill.narration, fontSize: 9 }
                                ] : [])
                            ]
                        },
                        {
                            width: 190,
                            stack: [
                                {
                                    table: {
                                        widths: [100, 80],
                                        body: [
                                            [{ text: 'Taxable Value:', style: 'label' }, { text: formatCurrency(taxableValue), alignment: 'right', style: 'value' }],
                                            ...(gstEnabled ? (
                                                billType === 'intra-state' ? [
                                                    [{ text: 'CGST:', style: 'label' }, { text: formatCurrency(processedBill.cgst), alignment: 'right', style: 'value' }],
                                                    [{ text: 'SGST:', style: 'label' }, { text: formatCurrency(processedBill.sgst), alignment: 'right', style: 'value' }]
                                                ] : [
                                                    [{ text: 'IGST:', style: 'label' }, { text: formatCurrency(processedBill.igst), alignment: 'right', style: 'value' }]
                                                ]
                                            ) : []),
                                            [{ text: 'Total Tax:', style: 'label' }, { text: formatCurrency(totalTax), alignment: 'right', style: 'value' }],
                                            [{ text: 'Round Off:', style: 'label' }, { text: formatCurrency(roundOff), alignment: 'right', style: 'value' }],
                                            [{ text: 'Grand Total:', style: 'grandLabel' }, { text: formatCurrency(roundedGrandTotal), alignment: 'right', style: 'grandValue' }]
                                        ]
                                    },
                                    layout: {
                                        hLineWidth: () => 0,
                                        vLineWidth: () => 0
                                    },
                                    margin: [0, 15, 0, 0]
                                },
                                ...(processedBill.reverseCharge && gstEnabled ? [
                                    { text: 'Reverse charge applicable. Tax liability is on recipient.', fontSize: 8, color: 'red', margin: [0, 8, 0, 0], alignment: 'right' }
                                ] : [])
                            ]
                        }
                    ]
                },
                
                // Signatures
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1 }], margin: [0, 50, 0, 5] },
                                { text: "Receiver's Signature", style: 'label' },
                                { text: '(Authorised Signatory)', fontSize: 8, color: '#666' }
                            ],
                            alignment: 'center'
                        },
                        {
                            width: '*',
                            stack: [
                                { text: `For ${seller.name}`, bold: true, margin: [0, 30, 0, 20] },
                                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1 }], margin: [0, 0, 0, 5] },
                                { text: 'Authorised Signatory', style: 'label' }
                            ],
                            alignment: 'center'
                        }
                    ],
                    margin: [0, 20, 0, 0]
                }
            ],
            styles: {
                title: { fontSize: 18, bold: true, color: '#111827' },
                subtitle: { fontSize: 10, color: '#4B5563' },
                sellerName: { fontSize: 12, bold: true },
                sellerMeta: { fontSize: 9, color: '#4B5563' },
                label: { fontSize: 9, color: '#6B7280' },
                value: { fontSize: 9, bold: true },
                boxTitle: { fontSize: 10, bold: true, color: '#111827', decoration: 'underline' },
                tableHeader: { fontSize: 9, bold: true, color: '#374151', fillColor: '#F9FAFB' },
                tableCell: { fontSize: 9, margin: [0, 4, 3, 4] },
                grandLabel: { fontSize: 11, bold: true, color: '#111827' },
                grandValue: { fontSize: 13, bold: true, color: '#111827' }
            },
            pageMargins: [36, 36, 36, 36]
        };

        const pdfDoc = await printer.createPdfKitDocument(docDefinition);
        
        const safeBillNo = String(processedBill.bno || `BILL-${processedBill.id}`).replace(/[^a-zA-Z0-9._-]/g, '_');
        const filename = `Invoice_${safeBillNo}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        pdfDoc.pipe(res);
        pdfDoc.end();

    } catch (err) {
        console.error('pdfmake export error:', err);
        res.status(500).json({ error: err.message });
    }
};