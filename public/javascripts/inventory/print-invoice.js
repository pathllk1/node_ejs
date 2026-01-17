(function() {
    'use strict';

    // Global variables to store firm data
    let currentUserFirm = {
        name: 'YOUR COMPANY NAME',
        address: 'Company Address Line 1\nCompany Address Line 2',
        gstin: '27AABCCDDEEFFGHH'
    };
    let gstEnabled = true;

    // Fetch current user's firm information
    async function fetchCurrentUserFirm() {
        try {
            const response = await fetch('/inventory/api/current-user-firm-name');
            if (response.ok) {
                const data = await response.json();
                if (data.firmName) {
                    currentUserFirm.name = data.firmName;
                }
                if (data.address) {
                    currentUserFirm.address = data.address;
                }
                if (data.contact_info) {
                    currentUserFirm.gstin = data.contact_info; // Assuming contact_info contains GSTIN
                }
            }
        } catch (error) {
            console.warn('Could not fetch current user firm name:', error);
        }
        
        // Also fetch GST status
        try {
            const gstResponse = await fetch('/admin/gst-status');
            if (gstResponse.ok) {
                const gstData = await gstResponse.json();
                gstEnabled = gstData.gst_enabled !== undefined ? gstData.gst_enabled : true;
            }
        } catch (error) {
            console.warn('Could not fetch GST status:', error);
        }
    }

    // Initialize on load
    fetchCurrentUserFirm();

    // Format currency for Indian Rupees
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    // Format quantity
    const formatQuantity = (qty) => {
        return parseFloat(qty || 0).toFixed(2);
    };

    // Format percentage
    const formatPercentage = (percent) => {
        return parseFloat(percent || 0).toFixed(2) + '%';
    };

    // Convert number to Indian rupees in words
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
        
        // Handle crores
        if (tempWhole >= 10000000) {
            const crores = Math.floor(tempWhole/10000000);
            result += convertHundreds(crores) + ' Crore ';
            tempWhole %= 10000000;
        }
        
        // Handle lakhs
        if (tempWhole >= 100000) {
            const lakhs = Math.floor(tempWhole/100000);
            result += convertHundreds(lakhs) + ' Lakh ';
            tempWhole %= 100000;
        }
        
        // Handle thousands
        if (tempWhole >= 1000) {
            const thousands = Math.floor(tempWhole/1000);
            result += convertHundreds(thousands) + ' Thousand ';
            tempWhole %= 1000;
        }
        
        // Handle hundreds and below
        if (tempWhole > 0) {
            result += convertHundreds(tempWhole);
        }
        
        // Add paise if exists
        if (decimalPart > 0) {
            result += " and " + convertTens(decimalPart) + " Paise ";
        }
        
        return result.trim() + " Only";
    };

    // Get invoice type label
    const getInvoiceTypeLabel = (bill) => {
        // Check transactionType first (from stock_reg)
        if (bill.transactionType) {
            const transactionType = bill.transactionType.toUpperCase();
            switch(transactionType) {
                case 'SALE':
                    return { label: 'SALES', class: 'bg-green-100 text-green-800' };
                case 'PURCHASE':
                    return { label: 'PURCHASE', class: 'bg-blue-100 text-blue-800' };
                case 'CREDIT NOTE':
                    return { label: 'CREDIT NOTE', class: 'bg-yellow-100 text-yellow-800' };
                case 'DEBIT NOTE':
                    return { label: 'DEBIT NOTE', class: 'bg-red-100 text-red-800' };
                default:
                    return { label: transactionType, class: 'bg-gray-100 text-gray-800' };
            }
        }
        
        // Fallback to btype field if transactionType not available
        if (bill.btype) {
            const btype = bill.btype.toUpperCase();
            if (btype.includes('SALE')) {
                return { label: 'SALES', class: 'bg-green-100 text-green-800' };
            } else if (btype.includes('PURCHASE')) {
                return { label: 'PURCHASE', class: 'bg-blue-100 text-blue-800' };
            } else if (btype.includes('CREDIT')) {
                return { label: 'CREDIT NOTE', class: 'bg-yellow-100 text-yellow-800' };
            } else if (btype.includes('DEBIT')) {
                return { label: 'DEBIT NOTE', class: 'bg-red-100 text-red-800' };
            } else if (btype.includes('DELIVERY')) {
                return { label: 'DELIVERY NOTE', class: 'bg-purple-100 text-purple-800' };
            }
        }
        
        // Default fallback
        return { label: 'SALES', class: 'bg-green-100 text-green-800' };
    };
    
    // Get dynamic party labels based on transaction type
    const getPartyLabels = (bill) => {
        const transactionType = bill.transactionType?.toUpperCase() || bill.btype?.toUpperCase() || 'SALE';
        
        switch(transactionType) {
            case 'SALE':
                return {
                    billToLabel: 'Bill To (Buyer)',
                    shipToLabel: 'Ship To (Consignee)'
                };
            case 'PURCHASE':
                return {
                    billToLabel: 'Bill From (Supplier)',
                    shipToLabel: 'Bill To (Receiver)'
                };
            case 'CREDIT NOTE':
                return {
                    billToLabel: 'Bill To (Recipient)',
                    shipToLabel: 'Ship To (Consignee)'
                };
            case 'DEBIT NOTE':
                return {
                    billToLabel: 'Bill From (Supplier)',
                    shipToLabel: 'Bill To (Recipient)'
                };
            case 'DELIVERY NOTE':
                return {
                    billToLabel: 'Deliver From (Supplier)',
                    shipToLabel: 'Deliver To (Recipient)'
                };
            default:
                return {
                    billToLabel: 'Bill To (Buyer)',
                    shipToLabel: 'Ship To (Consignee)'
                };
        }
    };
    
    // Determine bill type (intra-state or inter-state)
    const getBillType = (bill) => {
        const billTypeSource = (bill.btype || bill.billType || '').toString().toLowerCase();
        
        if (billTypeSource.includes('intra')) {
            return 'intra-state';
        } else if (billTypeSource.includes('inter')) {
            return 'inter-state';
        } else {
            // Default to using tax amounts to determine
            const cgst = Number(bill.cgst) || 0;
            const sgst = Number(bill.sgst) || 0;
            const igst = Number(bill.igst) || 0;
            return (cgst > 0 || sgst > 0) ? 'intra-state' : 'inter-state';
        }
    };

    // Build HSN Summary
    const buildHsnSummary = (bill) => {
        const hsnMap = new Map();
        
        // Process items
        (bill.items || []).forEach(item => {
            const hsn = item.hsn || 'NA';
            const taxableValue = (item.qty || 0) * (item.rate || 0) * (1 - (item.disc || 0) / 100);
            const taxAmount = taxableValue * (item.grate || 0) / 100;
            
            if (!hsnMap.has(hsn)) {
                hsnMap.set(hsn, {
                    hsn: hsn,
                    taxableValue: 0,
                    cgst: 0,
                    sgst: 0,
                    igst: 0,
                    totalTax: 0
                });
            }
            
            const row = hsnMap.get(hsn);
            row.taxableValue += taxableValue;
            row.totalTax += taxAmount;
            
            // Split tax based on bill type
            const billType = getBillType(bill);
            if (billType === 'intra-state' && gstEnabled) {
                row.cgst += taxAmount / 2;
                row.sgst += taxAmount / 2;
            } else if (gstEnabled) {
                row.igst += taxAmount;
            }
        });
        
        // Process other charges
        if (bill.oth_chg_json) {
            try {
                const otherCharges = JSON.parse(bill.oth_chg_json);
                otherCharges.forEach(charge => {
                    const hsn = charge.hsnSac || '9999'; // Default HSN for services
                    const taxableValue = charge.amount || 0;
                    const taxAmount = (charge.gstAmount || 0);
                    
                    if (!hsnMap.has(hsn)) {
                        hsnMap.set(hsn, {
                            hsn: hsn,
                            taxableValue: 0,
                            cgst: 0,
                            sgst: 0,
                            igst: 0,
                            totalTax: 0
                        });
                    }
                    
                    const row = hsnMap.get(hsn);
                    row.taxableValue += taxableValue;
                    row.totalTax += taxAmount;
                    
                    // Split tax based on bill type
                    const billType = getBillType(bill);
                    if (billType === 'intra-state' && gstEnabled) {
                        row.cgst += taxAmount / 2;
                        row.sgst += taxAmount / 2;
                    } else if (gstEnabled) {
                        row.igst += taxAmount;
                    }
                });
            } catch (e) {
                console.warn('Failed to parse other charges for HSN summary:', e);
            }
        }
        
        return Array.from(hsnMap.values()).sort((a, b) => a.hsn.localeCompare(b.hsn));
    };

    // Generate printable invoice HTML
    const generatePrintableInvoice = (bill) => {
        const billType = getBillType(bill);
        const isReverseCharge = bill.reverseCharge;
        
        // Use global GST setting
        const actualGstEnabled = gstEnabled;
        
        // Calculate totals
        const taxableValue = bill.gtot || 0;
        const cgstAmount = actualGstEnabled && !isReverseCharge ? (bill.cgst || 0) : 0;
        const sgstAmount = actualGstEnabled && !isReverseCharge ? (bill.sgst || 0) : 0;
        const igstAmount = actualGstEnabled && !isReverseCharge ? (bill.igst || 0) : 0;
        const totalTax = cgstAmount + sgstAmount + igstAmount;
        const grandTotal = actualGstEnabled ? (bill.ntot || 0) : taxableValue;
        const roundedGrandTotal = Math.round(grandTotal);
        const roundOff = roundedGrandTotal - grandTotal;
        
        const amountInWords = numberToWords(roundedGrandTotal);
        
        // Build HSN Summary
        const hsnSummary = buildHsnSummary(bill);

        // Calculate items and other charges totals
        const itemsTotal = (bill.items || []).reduce((sum, item) => sum + (item.total || 0), 0);
        
        let otherChargesTotal = 0;
        if (bill.oth_chg_json) {
            try {
                const otherCharges = JSON.parse(bill.oth_chg_json);
                otherChargesTotal = otherCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
            } catch (e) {
                console.warn('Failed to parse other charges:', e);
            }
        }
        
        const itemsAndChargesTotal = itemsTotal + otherChargesTotal;
        
        // Generate items table rows
        const itemsHtml = (bill.items || []).map((item, index) => `
            <tr class="border-b border-gray-200">
                <td class="px-3 py-2 text-center text-sm">${index + 1}</td>
                <td class="px-3 py-2 text-sm">
                    <div class="font-medium">${item.item || ''}</div>
                    ${item.batch ? `<div class="text-xs text-gray-500 mt-1">Batch: ${item.batch}</div>` : ''}
                    ${item.item_narration ? `<div class="text-xs text-gray-500 mt-1">${item.item_narration}</div>` : ''}
                </td>
                <td class="px-3 py-2 text-center text-sm">${item.hsn || ''}</td>
                <td class="px-3 py-2 text-center text-sm">${formatQuantity(item.qty)}</td>
                <td class="px-3 py-2 text-center text-sm">${item.uom || ''}</td>
                <td class="px-3 py-2 text-right text-sm">${formatCurrency(item.rate)}</td>
                <td class="px-3 py-2 text-right text-sm">${formatPercentage(item.disc || 0)}</td>
                <td class="px-3 py-2 text-right text-sm">${actualGstEnabled ? formatPercentage(item.grate || 0) : '-'}</td>
                <td class="px-3 py-2 text-right text-sm font-medium">${formatCurrency(item.total || 0)}</td>
            </tr>
        `).join('');

        // Generate other charges rows
        let otherChargesHtml = '';
        if (bill.oth_chg_json) {
            try {
                const otherCharges = JSON.parse(bill.oth_chg_json);
                otherChargesHtml = otherCharges.map((charge, index) => `
                    <tr class="border-b border-gray-200">
                        <td class="px-3 py-2 text-center text-sm">${(bill.items || []).length + index + 1}</td>
                        <td class="px-3 py-2 text-sm">
                            <div class="font-medium">${charge.name || charge.type || 'Other Charge'}</div>
                            <div class="text-xs text-gray-500 mt-1">HSN/SAC: ${charge.hsnSac || ''}</div>
                        </td>
                        <td class="px-3 py-2 text-center text-sm">${charge.hsnSac || ''}</td>
                        <td class="px-3 py-2 text-center text-sm">1</td>
                        <td class="px-3 py-2 text-center text-sm">NOS</td>
                        <td class="px-3 py-2 text-right text-sm">${formatCurrency(charge.amount)}</td>
                        <td class="px-3 py-2 text-right text-sm">0.00%</td>
                        <td class="px-3 py-2 text-right text-sm">${actualGstEnabled ? formatPercentage(charge.gstRate || 0) : '-'}</td>
                        <td class="px-3 py-2 text-right text-sm font-medium">${formatCurrency(charge.amount)}</td>
                    </tr>
                `).join('');
            } catch (e) {
                console.warn('Failed to parse other charges:', e);
            }
        }

        // Generate total row
        const totalRowHtml = `
            <tr class="bg-gray-50 border-t-2 border-gray-300">
                <td colspan="8" class="px-3 py-2 text-right text-sm font-semibold text-gray-800">Total Amount:</td>
                <td class="px-3 py-2 text-right text-sm font-bold text-gray-800">${formatCurrency(itemsAndChargesTotal)}</td>
            </tr>
        `;

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${getInvoiceTypeLabel(bill).label} ${bill.bno}</title>
                <link href="/stylesheets/style.css" rel="stylesheet">
                <style>
                    @media print {
                        @page {
                            size: A4;
                            margin: 15mm;
                        }
                        
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        
                        .no-print {
                            display: none !important;
                        }
                        
                        /* Hide browser print header/footer */
                        @page {
                            margin-top: 15mm;
                            margin-bottom: 15mm;
                            margin-left: 15mm;
                            margin-right: 15mm;
                            @top-center { content: none; }
                            @bottom-center { content: none; }
                        }
                    }
                    
                    @media screen {
                        body {
                            background-color: #f3f4f6;
                            padding: 20px;
                        }
                        
                        .invoice-container {
                            background: white;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                            max-width: 210mm;
                            margin: 0 auto;
                        }
                    }
                </style>
            </head>
            <body class="bg-gray-100 font-sans">
                <div class="invoice-container mx-auto bg-white shadow-lg print:shadow-none">
                    <!-- Header Section -->
                    <div class="border-b border-gray-200 p-6 print:p-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <div class="flex items-center space-x-3">
                                    <h1 class="text-2xl font-bold text-gray-800 print:text-xl">${getInvoiceTypeLabel(bill).label}</h1>
                                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${getInvoiceTypeLabel(bill).class}">
                                        ${getInvoiceTypeLabel(bill).label}
                                    </span>
                                </div>
                                <p class="text-sm text-gray-600 mt-1 print:text-xs">${actualGstEnabled ? 'Invoice under GST' : 'Invoice (GST Disabled)'}</p>
                                <div class="mt-3 print:mt-2">
                                    <p class="font-semibold text-gray-800 print:text-sm">${currentUserFirm.name}</p>
                                    <div class="text-sm text-gray-600 mt-1 print:text-xs">
                                        ${currentUserFirm.address.split('\n').map(line => `<p>${line}</p>`).join('')}
                                    </div>
                                    <p class="text-sm text-gray-600 print:text-xs">GSTIN: ${currentUserFirm.gstin}</p>
                                </div>
                            </div>
                            
                            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 print:p-3 w-64 print:w-56">
                                <div class="space-y-2 print:space-y-1 text-sm print:text-xs">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Invoice No:</span>
                                        <span class="font-medium">${bill.bno || ''}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Date:</span>
                                        <span class="font-medium">${bill.bdate || ''}</span>
                                    </div>
                                    ${bill.order_no ? `
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">PO No:</span>
                                        <span class="font-medium">${bill.order_no}</span>
                                    </div>
                                    ` : ''}
                                    ${bill.vehicle_no ? `
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Vehicle No:</span>
                                        <span class="font-medium">${bill.vehicle_no}</span>
                                    </div>
                                    ` : ''}
                                    ${bill.dispatch_through ? `
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Dispatched Through:</span>
                                        <span class="font-medium">${bill.dispatch_through}</span>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Party Details Section -->
                    <div class="p-6 print:p-4">
                        <div class="grid grid-cols-2 gap-6 print:gap-4">
                            <div class="border border-gray-200 rounded-lg p-4 print:p-3">
                                <h3 class="font-semibold text-gray-800 text-base print:text-sm mb-2">${getPartyLabels(bill).billToLabel}</h3>
                                <div class="space-y-1 text-base print:text-sm">
                                    <p class="font-medium">${bill.firm || ''}</p>
                                    ${bill.addr ? `<p class="text-gray-600">${bill.addr}</p>` : ''}
                                    ${bill.state ? `<p class="text-gray-600">State: <span class="font-medium">${bill.state}</span></p>` : ''}
                                    ${bill.gstin ? `<p class="text-gray-600">GSTIN: <span class="font-medium">${bill.gstin}</span></p>` : ''}
                                </div>
                            </div>
                            
                            <div class="border border-gray-200 rounded-lg p-4 print:p-3">
                                <h3 class="font-semibold text-gray-800 text-base print:text-sm mb-2">${getPartyLabels(bill).shipToLabel}</h3>
                                <div class="space-y-1 text-base print:text-sm">
                                    <p class="font-medium">${bill.firm || ''}</p>
                                    ${bill.addr ? `<p class="text-gray-600">${bill.addr}</p>` : ''}
                                    ${bill.state ? `<p class="text-gray-600">State: <span class="font-medium">${bill.state}</span></p>` : ''}
                                    ${bill.gstin ? `<p class="text-gray-600">GSTIN: <span class="font-medium">${bill.gstin}</span></p>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Items Table -->
                    <div class="px-6 pb-6 print:px-4 print:pb-4">
                        <div class="border border-gray-200 rounded-lg overflow-hidden">
                            <table class="w-full">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-10">#</th>
                                        <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Description</th>
                                        <th class="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-20">HSN/SAC</th>
                                        <th class="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-16">Qty</th>
                                        <th class="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-16">UOM</th>
                                        <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-20">Rate</th>
                                        <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-16">Disc%</th>
                                        <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-16">GST%</th>
                                        <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-24">Amount</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
                                    ${itemsHtml}
                                    ${otherChargesHtml}
                                    ${totalRowHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- HSN Summary Section -->
                    ${hsnSummary && hsnSummary.length > 0 && actualGstEnabled ? `
                    <div class="px-6 pb-6 print:px-4 print:pb-4">
                        <div class="border border-gray-200 rounded-lg overflow-hidden">
                            <div class="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                <h3 class="font-semibold text-gray-800 text-sm print:text-xs">HSN/SAC Summary</h3>
                            </div>
                            <table class="w-full">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">HSN/SAC</th>
                                        <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Taxable Value</th>
                                        <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">CGST</th>
                                        <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">SGST</th>
                                        <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">IGST</th>
                                        <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Total Tax</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
                                    ${hsnSummary.map(row => `
                                        <tr>
                                            <td class="px-3 py-2 text-center text-sm">${row.hsn}</td>
                                            <td class="px-3 py-2 text-right text-sm">${formatCurrency(row.taxableValue)}</td>
                                            <td class="px-3 py-2 text-right text-sm">${actualGstEnabled && billType === 'intra-state' ? formatCurrency(row.cgst) : formatCurrency(0)}</td>
                                            <td class="px-3 py-2 text-right text-sm">${actualGstEnabled && billType === 'intra-state' ? formatCurrency(row.sgst) : formatCurrency(0)}</td>
                                            <td class="px-3 py-2 text-right text-sm">${actualGstEnabled && billType === 'inter-state' ? formatCurrency(row.igst) : formatCurrency(0)}</td>
                                            <td class="px-3 py-2 text-right text-sm font-medium">${actualGstEnabled ? formatCurrency(row.totalTax) : formatCurrency(0)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- Tax Calculation Section -->
                    <div class="px-6 pb-6 print:px-4 print:pb-4">
                        <div class="grid grid-cols-3 gap-6 print:gap-4">
                            <!-- Amount in Words -->
                            <div class="col-span-2 border border-gray-200 rounded-lg p-4 print:p-3">
                                <h4 class="font-semibold text-gray-800 text-sm print:text-xs mb-2">Amount (in words)</h4>
                                <p class="text-sm print:text-xs text-gray-700">${amountInWords}</p>
                                
                                ${bill.narration ? `
                                <div class="mt-3 pt-3 border-t border-gray-200">
                                    <h4 class="font-semibold text-gray-800 text-sm print:text-xs mb-1">Narration</h4>
                                    <p class="text-sm print:text-xs text-gray-700">${bill.narration}</p>
                                </div>
                                ` : ''}
                            </div>
                            
                            <!-- Tax Summary -->
                            <div class="border border-gray-200 rounded-lg p-4 print:p-3">
                                <div class="space-y-2 print:space-y-1 text-sm print:text-xs">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Taxable Value:</span>
                                        <span class="font-medium">${formatCurrency(taxableValue)}</span>
                                    </div>
                                    
                                    ${actualGstEnabled && !isReverseCharge ? `
                                        ${billType === 'intra-state' ? `
                                            <div class="flex justify-between">
                                                <span class="text-gray-600">CGST:</span>
                                                <span class="font-medium">${formatCurrency(cgstAmount)}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-gray-600">SGST:</span>
                                                <span class="font-medium">${formatCurrency(sgstAmount)}</span>
                                            </div>
                                        ` : `
                                            <div class="flex justify-between">
                                                <span class="text-gray-600">IGST:</span>
                                                <span class="font-medium">${formatCurrency(igstAmount)}</span>
                                            </div>
                                        `}
                                    ` : `
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Total Tax:</span>
                                            <span class="font-medium">${formatCurrency(0)}</span>
                                        </div>
                                    `}
                                    
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Round Off:</span>
                                        <span class="font-medium">${formatCurrency(roundOff)}</span>
                                    </div>
                                    
                                    ${isReverseCharge && gstEnabled ? `
                                    <div class="pt-2 border-t border-gray-200">
                                        <p class="text-xs text-red-600 font-medium">Reverse Charge Applicable</p>
                                    </div>
                                    ` : ''}
                                    
                                    <div class="pt-2 mt-2 border-t border-gray-300">
                                        <div class="flex justify-between">
                                            <span class="font-semibold text-gray-800">Grand Total:</span>
                                            <span class="font-bold text-lg print:text-base text-gray-800">${formatCurrency(roundedGrandTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Signatures Section -->
                    <div class="px-6 pb-8 print:px-4 print:pb-6">
                        <div class="grid grid-cols-2 gap-8 print:gap-6">
                            <div class="border border-gray-300 rounded-lg p-4 print:p-3">
                                <div class="border-t-2 border-gray-400 pt-4 text-center">
                                    <p class="text-sm font-medium text-gray-800 print:text-xs">Receiver's Signature</p>
                                    <p class="text-xs text-gray-500 mt-1 print:text-[10px]">(Authorised Signatory)</p>
                                </div>
                            </div>
                            <div class="border border-gray-300 rounded-lg p-4 print:p-3">
                                <div class="border-t-2 border-gray-400 pt-4 text-center">
                                    <p class="text-sm font-medium text-gray-800 print:text-xs">For ${currentUserFirm.name}</p>
                                    <p class="text-xs text-gray-500 mt-16 print:text-[10px] print:mt-12">(Authorised Signatory)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Print Button (only visible on screen) -->
                    <div class="no-print fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg cursor-pointer print:hidden" onclick="window.print()">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                    </div>
                </div>
            </body>
            </html>
        `;
    };

    // Main print function
    const printInvoice = (bill) => {
        if (!bill) {
            alert('No bill data available for printing');
            return;
        }

        // Generate the printable HTML
        const printHtml = generatePrintableInvoice(bill);
        
        // Open in new window for printing
        const printWindow = window.open('', '_blank', 'width=800,height=1000');
        printWindow.document.write(printHtml);
        printWindow.document.close();
        
        // Wait for content to load then trigger print
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                
                // Close window after printing (optional)
                printWindow.onafterprint = function() {
                    printWindow.close();
                };
            }, 500);
        };
    };

    // Expose function globally for use in sales-report.js
    window.printInvoiceModule = {
        printInvoice: printInvoice,
        generatePrintableInvoice: generatePrintableInvoice
    };

    console.log('Print Invoice Module loaded successfully');

})();