(function initSalesReport() {
    console.log('SALES-REPORT: Initializing Sales Report System...');

    // Format currency function
    const formatCurrency = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num || 0);

    // State for sales data
    let salesData = [];
    let filteredData = [];

    // DOM Elements
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const filterBtn = document.getElementById('filterBtn');
    const exportBtn = document.getElementById('exportBtn');
    const salesReportBody = document.getElementById('salesReportBody');
    const totalSalesEl = document.getElementById('totalSales');
    const totalInvoicesEl = document.getElementById('totalInvoices');
    const avgInvoiceValueEl = document.getElementById('avgInvoiceValue');
    const totalItemsSoldEl = document.getElementById('totalItemsSold');

    // Set default date range to last 30 days
    const today = new Date();
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    startDateInput.valueAsDate = last30Days;
    endDateInput.valueAsDate = today;

    // Fetch sales data
    async function fetchSalesData() {
        try {
            const response = await window.api.get('/inventory/api/bills');
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            salesData = data;
            applyFilters();
        } catch (err) {
            console.error('Failed to load sales data:', err);
            alert('Error loading sales data: ' + err.message);
        }
    }

    // Apply date filters
    function applyFilters() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        filteredData = salesData.filter(bill => {
            const billDate = new Date(bill.bdate);
            return (!startDate || billDate >= new Date(startDate)) && 
                   (!endDate || billDate <= new Date(endDate));
        });

        renderReport();
        updateSummaryCards();
    }

    // Update summary cards
    function updateSummaryCards() {
        if (filteredData.length === 0) {
            totalSalesEl.textContent = formatCurrency(0);
            totalInvoicesEl.textContent = '0';
            avgInvoiceValueEl.textContent = formatCurrency(0);
            totalItemsSoldEl.textContent = '0';
            return;
        }

        // Calculate totals
        let totalSales = 0;
        let totalItems = 0;
        let totalOtherCharges = 0;

        filteredData.forEach(bill => {
            totalSales += bill.ntot || 0;
            
            if (bill.oth_chg_json) {
                try {
                    const otherCharges = JSON.parse(bill.oth_chg_json);
                    totalOtherCharges += otherCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
                } catch (e) {
                    console.warn('Failed to parse other charges for bill', bill.id);
                }
            }
        });

        totalSalesEl.textContent = formatCurrency(totalSales);
        totalInvoicesEl.textContent = filteredData.length;
        avgInvoiceValueEl.textContent = formatCurrency(totalSales / filteredData.length);
        
        // For total items sold, we'll calculate from bill items if available
        // In a real implementation, we might have this data in the bills API
        totalItemsSoldEl.textContent = filteredData.length; // Placeholder - would need to fetch bill items for accurate count
    }

    // Render sales report table
    function renderReport() {
        if (filteredData.length === 0) {
            salesReportBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-4 py-6 text-center text-gray-500 italic">
                        No sales data found for the selected date range
                    </td>
                </tr>
            `;
            return;
        }

        salesReportBody.innerHTML = filteredData.map(bill => {
            let otherChargesTotal = 0;
            if (bill.oth_chg_json) {
                try {
                    const otherCharges = JSON.parse(bill.oth_chg_json);
                    otherChargesTotal = otherCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
                } catch (e) {
                    console.warn('Failed to parse other charges for bill', bill.id);
                }
            }
            
            // Calculate tax amount: ntot - gtot = total tax amount (Indian GST standard)
            const taxAmount = (bill.ntot || 0) - (bill.gtot || 0);

            return `
                <tr class="hover:bg-blue-50 transition-colors">
                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${bill.bno || ''}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${bill.bdate || ''}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">${bill.firm || ''}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">${bill.order_no || ''}</td>
                    <td class="px-4 py-3 text-sm text-gray-900 text-right">${formatCurrency(bill.gtot || 0)}</td>
                    <td class="px-4 py-3 text-sm text-gray-900 text-right">${formatCurrency(taxAmount)}</td>
                    <td class="px-4 py-3 text-sm text-gray-900 text-right">${formatCurrency(otherChargesTotal)}</td>
                    <td class="px-4 py-3 text-sm font-bold text-gray-900 text-right">${formatCurrency(bill.ntot || 0)}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">
                        ${bill.reverseCharge ? '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Yes</span>' : '<span class="text-gray-400 text-xs">No</span>'}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500">
                        <button class="view-btn text-blue-600 hover:text-blue-900 font-medium" data-id="${bill.id}">View</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Add event listeners to view buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const billId = this.getAttribute('data-id');
                viewBillDetails(billId);
            });
        });
    }

    // View bill details
    async function viewBillDetails(billId) {
        // Fetch complete bill details from the API
        fetchBillDetails(billId);
    }
    
    async function fetchBillDetails(billId) {
        try {
            // Use direct fetch instead of window.api.get to avoid potential parameter issues
            const response = await window.api.get(`/inventory/api/bills/${billId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include' // Include cookies/sessions if needed
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch bill details');
            }
            
            const bill = await response.json();
            
            // Fetch GST status to include in the invoice data
            let gstEnabled = true; // Default to true
            try {
                const gstResponse = await window.api.get('/admin/gst-status');
                const gstData = await gstResponse.json();
                gstEnabled = gstData.gst_enabled;
            } catch (error) {
                console.warn('Could not fetch GST status, defaulting to enabled:', error);
            }
            
            // Create and show bill details modal
            showBillDetailsModal(bill, gstEnabled);
        } catch (error) {
            console.error('Error fetching bill details:', error);
            alert('Error fetching bill details: ' + error.message);
        }
    }
    
    function getOtherChargesTotal(bill) {
        if (!bill.oth_chg_json) return 0;
        try {
            const otherCharges = JSON.parse(bill.oth_chg_json);
            return otherCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
        } catch (e) {
            console.warn('Failed to parse other charges for bill', bill.id);
            return 0;
        }
    }
    
    function parseAndRenderOtherCharges(oth_chg_json) {
        try {
            const otherCharges = JSON.parse(oth_chg_json);
            return otherCharges.map(charge => {
                return '<tr>' +
                    '<td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900">' + (charge.name || '') + '</td>' +
                    '<td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">' + (charge.type || '') + '</td>' +
                    '<td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">' + (charge.hsnSac || '') + '</td>' +
                    '<td class="px-3 py-2 text-sm text-gray-900 text-right">' + formatCurrency(charge.amount || 0) + '</td>' +
                    '<td class="px-3 py-2 text-sm text-gray-900 text-right">' + (charge.gstRate || 0) + '%</td>' +
                    '<td class="px-3 py-2 text-sm text-gray-900 text-right">' + formatCurrency(charge.gstAmount || 0) + '</td>' +
                    '</tr>';
            }).join('');
        } catch (e) {
            console.warn('Failed to parse other charges:', e);
            return '<tr><td colspan="6" class="px-3 py-2 text-sm text-gray-500">Error parsing other charges</td></tr>';
        }
    }
    
    function closeBillModal() {
        const modal = document.getElementById('bill-details-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    async function exportBillToExcel(bill) {
        // Fetch GST status to determine if taxes should be calculated
        let gstEnabled = true; // Default to true
        try {
            const gstResponse = await window.api.get('/admin/gst-status');
            const gstData = await gstResponse.json();
            gstEnabled = gstData.gst_enabled;
        } catch (error) {
            console.warn('Could not fetch GST status, defaulting to enabled:', error);
        }
        
        // Generate a simplified invoice data structure from the bill
        // Process cart items to ensure narration is properly mapped
        const processedCart = (bill.items || []).map(item => ({
            ...item,
            narration: item.item_narration || ''  // Map the database field name to the expected field name
        }));

        const billTypeSource = (bill.btype || bill.billType || '').toString().toLowerCase();
        let resolvedBillType;
        if (billTypeSource.includes('intra')) {
            resolvedBillType = 'intra-state';
        } else if (billTypeSource.includes('inter')) {
            resolvedBillType = 'inter-state';
        } else {
            const cgst = Number(bill.cgst) || 0;
            const sgst = Number(bill.sgst) || 0;
            const igst = Number(bill.igst) || 0;
            resolvedBillType = (cgst > 0 || sgst > 0) ? 'intra-state' : (igst > 0 ? 'inter-state' : 'inter-state');
        }
        
        const invoiceData = {
            meta: {
                billNo: bill.bno,
                billDate: bill.bdate,
                billType: resolvedBillType,
                referenceNo: bill.order_no || '',
                vehicleNo: bill.vehicle_no || '',
                dispatchThrough: bill.dispatch_through || '',
                narration: bill.narration || '',
                reverseCharge: bill.reverseCharge || false
            },
            party: {
                firm: bill.firm,
                addr: bill.addr,
                gstin: bill.gstin,
                state: bill.state
            },
            cart: processedCart,  // Use the processed cart with narration
            otherCharges: bill.otherCharges || [],
            billId: bill.id,
            totalTaxable: bill.gtot || 0,
            // Calculate tax amounts based on the stored values
            cgstAmount: gstEnabled ? (bill.cgst || 0) : 0,
            sgstAmount: gstEnabled ? (bill.sgst || 0) : 0,
            igstAmount: gstEnabled ? (bill.igst || 0) : 0,
            grandTotal: gstEnabled ? (bill.ntot || 0) : (bill.gtot || 0), // When GST is disabled, use taxable amount as total
            finalAmount: gstEnabled ? Math.round(bill.ntot || 0) : Math.round(bill.gtot || 0),
            roundOff: gstEnabled ? ((bill.ntot || 0) - Math.round(bill.ntot || 0)) : ((bill.gtot || 0) - Math.round(bill.gtot || 0)),
            gstEnabled: gstEnabled // Include GST status in the invoice data
        };
        
        // Use the same Excel export logic as in sls.js
        exportInvoiceToExcelFromBill(invoiceData);
    }
    
    function exportInvoiceToExcelFromBill(invoiceData) {
        // 1. Define Professional Styles
        const borderStyle = { style: "thin", color: { rgb: "000000" } };
        const styles = {
            title: {
                font: { bold: true, sz: 16, color: { rgb: "000000" } },
                alignment: { horizontal: "center", vertical: "center" }
            },
            header: {
                font: { bold: true, color: { rgb: "000000" } },
                fill: { fgColor: { rgb: "E0E0E0" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
            },
            cellCenter: {
                alignment: { horizontal: "center" },
                border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
            },
            cellLeft: {
                alignment: { horizontal: "left" },
                border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
            },
            cellRight: {
                alignment: { horizontal: "right" },
                border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
            },
            totalLabel: {
                font: { bold: true },
                alignment: { horizontal: "right" },
                border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
            },
            totalValue: {
                font: { bold: true },
                alignment: { horizontal: "right" },
                border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
            },
            words: {
                font: { italic: true, bold: true },
                alignment: { horizontal: "left", vertical: "top", wrapText: true },
                border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
            }
        };

        const createCell = (v, s) => ({ v: v || "", s: s || {} });
        const ws_data = [];

        // --- TITLE ROW ---
        ws_data.push([createCell("TAX INVOICE", styles.title)]);
        ws_data.push([]); // Spacer

        // Check if reverse charge applies
        const isReverseCharge = invoiceData.meta.reverseCharge;

        // --- DETAILS SECTION ---
        ws_data.push([
            createCell("SELLER:", { font: { bold: true } }), "", "", "", "", "", 
            createCell("Invoice No:", { font: { bold: true }, alignment: { horizontal: "right" } }),
            createCell(invoiceData.meta.billNo, { alignment: { horizontal: "left" } })
        ]);

        ws_data.push([
            createCell("Your Company Name", { font: { bold: true } }), "", "", "", "", "", 
            createCell("Date:", { font: { bold: true }, alignment: { horizontal: "right" } }),
            createCell(invoiceData.meta.billDate, { alignment: { horizontal: "left" } })
        ]);
        
        // Show reverse charge notice if applicable
        if (isReverseCharge) {
            ws_data.push([
                createCell("REVERSE CHARGE APPLIES", { font: { bold: true, color: { rgb: "FF0000" } }, alignment: { horizontal: "center" } }), "", "", "", "", "", "", ""
            ]);
        }
        
        // PO No and Vehicle No in sequence
        if (invoiceData.meta.referenceNo) {
            ws_data.push([
                createCell("", { font: { bold: true } }), "", "", "", "", "", 
                createCell("PO No:", { font: { bold: true }, alignment: { horizontal: "right" } }),
                createCell(invoiceData.meta.referenceNo, { alignment: { horizontal: "left" } })
            ]);
        }
        
        if (invoiceData.meta.vehicleNo) {
            ws_data.push([
                createCell("", { font: { bold: true } }), "", "", "", "", "", 
                createCell("Vehicle No:", { font: { bold: true }, alignment: { horizontal: "right" } }),
                createCell(invoiceData.meta.vehicleNo, { alignment: { horizontal: "left" } })
            ]);
        }
        
        // Dispatched Through after vehicle info
        if (invoiceData.meta.dispatchThrough) {
            ws_data.push([
                createCell("", { font: { bold: true } }), "", "", "", "", "", 
                createCell("Dispatched Through:", { font: { bold: true }, alignment: { horizontal: "right" } }),
                createCell(invoiceData.meta.dispatchThrough, { alignment: { horizontal: "left" } })
            ]);
        }
        
        ws_data.push([createCell("BUYER (BILL TO):", { font: { bold: true } })]);
        ws_data.push([createCell(invoiceData.party.firm, { font: { bold: true } })]);
        ws_data.push([createCell(invoiceData.party.addr || "")]);
        ws_data.push([createCell("GSTIN: " + (invoiceData.party.gstin || "Unregistered"))]);
        
        ws_data.push([]); // Spacer

        // --- TABLE HEADERS ---
        const headers = ["Sr", "Description", "HSN/SAC", "Qty", "Unit", "Rate", "Disc %", "GST %", "Amount"];
        ws_data.push(headers.map(h => createCell(h, styles.header)));

        // --- TABLE ITEMS ---
        (invoiceData.cart || []).forEach((item, index) => {
            const lineTotal = (item.qty || 0) * (item.rate || 0) * (1 - (item.disc || 0) / 100);
            ws_data.push([
                createCell(index + 1, styles.cellCenter),
                createCell(item.item, styles.cellLeft),
                createCell(item.hsn, styles.cellCenter),
                createCell(item.qty, styles.cellCenter),
                createCell(item.uom, styles.cellCenter),
                createCell(item.rate, styles.cellRight),
                createCell(item.disc || 0, styles.cellRight),
                createCell(item.grate, styles.cellRight),
                createCell(lineTotal.toFixed(2), styles.cellRight)
            ]);
            
            // Add narration row if it exists
            if (item.item_narration) {
                ws_data.push([
                    createCell('', styles.cellCenter),
                    createCell('Narration: ' + item.item_narration, styles.cellLeft),
                    createCell('', styles.cellCenter),
                    createCell('', styles.cellCenter),
                    createCell('', styles.cellCenter),
                    createCell('', styles.cellRight),
                    createCell('', styles.cellRight),
                    createCell('', styles.cellRight),
                    createCell('', styles.cellRight)
                ]);
            }
        });
        
        // Add other charges if they exist
        if (invoiceData.otherCharges && invoiceData.otherCharges.length > 0) {
            // Add other charges as additional line items
            invoiceData.otherCharges.forEach(charge => {
                // Add the main charge
                ws_data.push([
                    createCell("", styles.cellCenter),
                    createCell(`${charge.type} (${charge.name})`, styles.cellLeft),
                    createCell(charge.hsnSac || "", styles.cellCenter), // HSN/SAC
                    createCell("", styles.cellCenter),
                    createCell("", styles.cellCenter),
                    createCell("", styles.cellRight),
                    createCell("", styles.cellRight),
                    createCell(charge.gstRate || 0, styles.cellRight), // GST rate
                    createCell((charge.amount || 0).toFixed(2), styles.cellRight)
                ]);
                
                // Add the GST line
                if (charge.gstAmount > 0) {
                    ws_data.push([
                        createCell("", styles.cellCenter),
                        createCell(`GST on ${charge.type} (${charge.name})`, styles.cellLeft),
                        createCell(charge.hsnSac || "", styles.cellCenter), // HSN/SAC
                        createCell("", styles.cellCenter),
                        createCell("", styles.cellCenter),
                        createCell("", styles.cellRight),
                        createCell("", styles.cellRight),
                        createCell(0, styles.cellRight), // No GST on GST
                        createCell((charge.gstAmount || 0).toFixed(2), styles.cellRight)
                    ]);
                }
            });
        }
        
        // Min Rows Filler
        const minRows = 5;
        const totalRows = (invoiceData.cart || []).length + (invoiceData.otherCharges ? invoiceData.otherCharges.length * 2 : 0);
        for (let i = 0; i < (minRows - totalRows); i++) {
            // Fix: Use Array.from to create unique cell objects, preventing reference bugs
            const emptyRow = Array.from({length: 9}, () => createCell('', styles.cellCenter));
            ws_data.push(emptyRow);
        }
        
        // --- FOOTER SECTION ---
        
        // Check if GST was enabled when the bill was created
        const gstEnabled = invoiceData.gstEnabled !== undefined ? invoiceData.gstEnabled : true; // Default to enabled if not set
        
        // Use the stored tax amounts from invoiceData, but respect current GST status
        let finalCgstAmount = gstEnabled ? (invoiceData.cgstAmount || 0) : 0;
        let finalSgstAmount = gstEnabled ? (invoiceData.sgstAmount || 0) : 0;
        let finalIgstAmount = gstEnabled ? (invoiceData.igstAmount || 0) : 0;
        
        // For reverse charge, tax amounts are set to 0 for display
        if (isReverseCharge && gstEnabled) {
            finalCgstAmount = 0;
            finalSgstAmount = 0;
            finalIgstAmount = 0;
        }
        
        // Calculate the same totals as in renderTotals for consistency
        let totalTaxable = 0;
        let totalTaxAmount = 0;
        
        // Calculate line by line for cart items
        (invoiceData.cart || []).forEach(item => {
            const lineValue = (item.qty || 0) * (item.rate || 0) * (1 - (item.disc || 0) / 100);
            const lineTax = lineValue * (item.grate / 100);
            totalTaxable += lineValue;
            totalTaxAmount += lineTax;
        });
        
        // Calculate other charges subtotal and GST total
        let otherChargesSubtotal = 0;
        let otherChargesGstTotal = 0;
        if (invoiceData.otherCharges) {
            invoiceData.otherCharges.forEach(charge => {
                const chargeAmount = parseFloat(charge.amount) || 0;
                const chargeGstAmount = gstEnabled ? parseFloat(charge.gstAmount) || 0 : 0;
                otherChargesSubtotal += chargeAmount;
                otherChargesGstTotal += chargeGstAmount;
            });
        }
        
        const addFooterRow = (label, val, isWordsRow = false) => {
            // Fix: Create unique empty cells for this row
            const row = Array.from({length: 9}, () => createCell("", {}));
            
            if (isWordsRow) {
                const wordsTotal = totalTaxable + (gstEnabled && !isReverseCharge ? totalTaxAmount : 0) + otherChargesSubtotal + (gstEnabled && !isReverseCharge ? otherChargesGstTotal : 0);
                const roundedTotal = Math.round(wordsTotal);
                row[0] = createCell("Amount in Words:\n" + numToIndianRupees(roundedTotal || 0), styles.words);
            }

            // Totals at columns 6, 7 and 8 - merge G and H columns
            row[6] = createCell(label, styles.totalLabel); // Column G will contain the label
            row[7] = createCell("", styles.totalLabel); // Column H will be merged with G
            row[8] = createCell((typeof val === 'number' ? val : 0).toFixed(2), styles.totalValue);
            
            return row;
        };

        // 1. Taxable (items + other charges per Indian GST standard)
        const totalTaxableValue = totalTaxable + otherChargesSubtotal;
        ws_data.push(addFooterRow("Taxable Value", totalTaxableValue, true));

        // 2. Taxes
        if (invoiceData.meta.billType === 'intra-state') {
            ws_data.push(addFooterRow("CGST", gstEnabled && !isReverseCharge ? totalTaxAmount / 2 : 0));
            ws_data.push(addFooterRow("SGST", gstEnabled && !isReverseCharge ? totalTaxAmount / 2 : 0));
        } else {
            ws_data.push(addFooterRow("IGST", gstEnabled && !isReverseCharge ? totalTaxAmount : 0));
        }
        
        // 3. Other Charges (if any)
        if (invoiceData.otherCharges && invoiceData.otherCharges.length > 0) {
            // Add each other charge
            invoiceData.otherCharges.forEach(charge => {
                ws_data.push(addFooterRow(`${charge.type} (${charge.name})`, charge.amount));
                
                // Add GST on the charge if applicable
                if (charge.gstAmount > 0) {
                    ws_data.push(addFooterRow(`GST on ${charge.type} (${charge.name})`, charge.gstAmount));
                }
            });
        }

        // 4. Grand Total (before HSN Summary for better UI flow)
        const excelGrandTotal = totalTaxable + (gstEnabled && !isReverseCharge ? totalTaxAmount : 0) + otherChargesSubtotal + (gstEnabled && !isReverseCharge ? otherChargesGstTotal : 0);
        const roundOff = Math.round(excelGrandTotal) - excelGrandTotal;
        
        // Add Round Off row
        ws_data.push(addFooterRow("Round Off", roundOff));

        const rFinal = Array.from({length: 9}, () => createCell("", {}));
        rFinal[6] = createCell("GRAND TOTAL", styles.header);
        rFinal[7] = createCell("", styles.header);
        rFinal[8] = createCell(Math.round(excelGrandTotal).toFixed(2), styles.header);
        ws_data.push(rFinal);
        
        // 5. HSN Summary Table (Required for Indian GST Compliance)
        // Group items by HSN/SAC code and calculate totals
        const hsnSummary = {};
        
        // Process cart items
        (invoiceData.cart || []).forEach(item => {
            const hsn = item.hsn;
            const taxableValue = (item.qty || 0) * (item.rate || 0) * (1 - (item.disc || 0)/100);
            
            if (!hsnSummary[hsn]) {
                hsnSummary[hsn] = {
                    hsn: hsn,
                    taxableValue: 0,
                    igstAmount: 0,
                    cgstAmount: 0,
                    sgstAmount: 0,
                    taxRate: item.grate
                };
            }
            
            hsnSummary[hsn].taxableValue += taxableValue;
            
            // Use stored tax amounts instead of recalculating
            // For items, we'll estimate the tax split based on the original calculation
            if (gstEnabled && !isReverseCharge) {
                const itemTaxAmount = taxableValue * (item.grate / 100);
                if (invoiceData.meta.billType === 'intra-state') {
                    hsnSummary[hsn].cgstAmount += itemTaxAmount / 2;
                    hsnSummary[hsn].sgstAmount += itemTaxAmount / 2;
                } else {
                    hsnSummary[hsn].igstAmount += itemTaxAmount;
                }
            }
        });
        
        // Process other charges and add to HSN summary
        if (invoiceData.otherCharges) {
            invoiceData.otherCharges.forEach(charge => {
                const hsn = charge.hsnSac || "9999"; // Use 9999 as default for services without specific HSN
                const taxableValue = parseFloat(charge.amount) || 0;
                
                if (!hsnSummary[hsn]) {
                    hsnSummary[hsn] = {
                        hsn: hsn,
                        taxableValue: 0,
                        igstAmount: 0,
                        cgstAmount: 0,
                        sgstAmount: 0,
                        taxRate: charge.gstRate || 0
                    };
                }
                
                hsnSummary[hsn].taxableValue += taxableValue;
                
                // Use stored GST amount for other charges instead of recalculating
                if (gstEnabled && !isReverseCharge && charge.gstAmount) {
                    if (invoiceData.meta.billType === 'intra-state') {
                        hsnSummary[hsn].cgstAmount += (charge.gstAmount || 0) / 2;
                        hsnSummary[hsn].sgstAmount += (charge.gstAmount || 0) / 2;
                    } else {
                        hsnSummary[hsn].igstAmount += charge.gstAmount || 0;
                    }
                }
            });
        }
        
        // Add HSN Summary header (merged across columns A to I)
        ws_data.push([]); // Empty row for spacing
        const hsnHeaderRow = Array.from({length: 9}, () => createCell("", styles.cellCenter));
        hsnHeaderRow[0] = createCell("HSN/SAC Summary", styles.header);
        hsnHeaderRow[1] = createCell("", styles.cellCenter);
        hsnHeaderRow[2] = createCell("", styles.cellCenter);
        hsnHeaderRow[3] = createCell("", styles.cellCenter);
        hsnHeaderRow[4] = createCell("", styles.cellCenter);
        hsnHeaderRow[5] = createCell("", styles.cellCenter);
        hsnHeaderRow[6] = createCell("", styles.cellCenter);
        hsnHeaderRow[7] = createCell("", styles.cellCenter);
        hsnHeaderRow[8] = createCell("", styles.cellCenter);
        ws_data.push(hsnHeaderRow);
        
        // HSN Summary table headers
        const hsnHeadersRow = Array.from({length: 9}, () => createCell("", styles.cellCenter));
        hsnHeadersRow[0] = createCell("HSN/SAC", styles.header);
        hsnHeadersRow[1] = createCell("", styles.cellCenter);
        hsnHeadersRow[2] = createCell("Taxable Value", styles.header);
        hsnHeadersRow[3] = createCell("", styles.cellCenter);
        hsnHeadersRow[4] = createCell("IGST Amount", styles.header);
        hsnHeadersRow[5] = createCell("CGST Amount", styles.header);
        hsnHeadersRow[6] = createCell("SGST Amount", styles.header);
        hsnHeadersRow[7] = createCell("Total Tax", styles.header);
        hsnHeadersRow[8] = createCell("", styles.cellCenter);
        ws_data.push(hsnHeadersRow);
        
        // Add HSN Summary rows
        Object.values(hsnSummary).forEach(hsnData => {
            const hsnRow = Array.from({length: 9}, () => createCell("", styles.cellCenter));
            hsnRow[0] = createCell(hsnData.hsn, styles.cellLeft); // Left-aligned HSN/SAC code
            hsnRow[1] = createCell("", styles.cellCenter);
            hsnRow[2] = createCell(hsnData.taxableValue.toFixed(2), styles.cellRight);
            hsnRow[3] = createCell("", styles.cellCenter);
            hsnRow[4] = createCell(hsnData.igstAmount.toFixed(2), styles.cellRight);
            hsnRow[5] = createCell(hsnData.cgstAmount.toFixed(2), styles.cellRight);
            hsnRow[6] = createCell(hsnData.sgstAmount.toFixed(2), styles.cellRight);
            hsnRow[7] = createCell((hsnData.igstAmount + hsnData.cgstAmount + hsnData.sgstAmount).toFixed(2), styles.cellRight);
            hsnRow[8] = createCell("", styles.cellCenter);
            ws_data.push(hsnRow);
        });
        
        // Add Narration at the bottom if it exists
        if (invoiceData.meta.narration) {
            ws_data.push([]); // Empty row for spacing
            const narrationRow = Array.from({length: 9}, () => createCell("", styles.cellCenter));
            narrationRow[0] = createCell("Narration: " + (invoiceData.meta.narration || ""), { font: { bold: true }, alignment: { horizontal: "left", vertical: "top", wrapText: true } });
            // Span the narration across all 9 columns
            for (let i = 1; i < 9; i++) {
                narrationRow[i] = createCell("", styles.cellCenter);
            }
            ws_data.push(narrationRow);
        }

        // --- GENERATE ---
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(ws_data);

        // --- MERGING LOGIC (SAFE) ---
        const merges = [];
        
        // Title Merge
        merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } });

        // Find "Amount in Words" row index safely
        const wordsRowIndex = ws_data.findIndex(row => 
            // FIX: Check if row exists, row[0] exists, and row[0].v is a string before checking startsWith
            row && row[0] && row[0].v && typeof row[0].v === 'string' && row[0].v.startsWith("Amount in Words")
        );

        if (wordsRowIndex > -1) {
            // Merge Words box (4 rows down, 6 columns wide)
            merges.push({ s: { r: wordsRowIndex, c: 0 }, e: { r: wordsRowIndex + 3, c: 5 } });
        }
        
        // Find and merge HSN Summary header row (merge A to I columns)
        for (let i = 0; i < ws_data.length; i++) {
            const row = ws_data[i];
            if (row && row[0] && row[0].v && typeof row[0].v === 'string' && row[0].v === "HSN/SAC Summary") {
                // Merge columns A (index 0) to I (index 8)
                merges.push({ s: { r: i, c: 0 }, e: { r: i, c: 8 } });

                // Merge HSN Summary table columns to use full width:
                // A-B (HSN/SAC), C-D (Taxable Value), H-I (Total Tax)
                const headerRowIndex = i + 1;
                merges.push({ s: { r: headerRowIndex, c: 0 }, e: { r: headerRowIndex, c: 1 } });
                merges.push({ s: { r: headerRowIndex, c: 2 }, e: { r: headerRowIndex, c: 3 } });
                merges.push({ s: { r: headerRowIndex, c: 7 }, e: { r: headerRowIndex, c: 8 } });

                // Apply same merges for each data row until a non-data row is reached
                for (let r = i + 2; r < ws_data.length; r++) {
                    const dataRow = ws_data[r];
                    if (!dataRow || !dataRow[0] || !dataRow[0].v) break;
                    if (typeof dataRow[0].v === 'string' && dataRow[0].v.startsWith('Narration: ')) break;

                    merges.push({ s: { r: r, c: 0 }, e: { r: r, c: 1 } });
                    merges.push({ s: { r: r, c: 2 }, e: { r: r, c: 3 } });
                    merges.push({ s: { r: r, c: 7 }, e: { r: r, c: 8 } });
                }
            }
        }
        
        // Find and merge Narration row (merge A to I columns)
        for (let i = 0; i < ws_data.length; i++) {
            const row = ws_data[i];
            if (row && row[0] && row[0].v && typeof row[0].v === 'string' && row[0].v.startsWith("Narration: ")) {
                // Merge columns A (index 0) to I (index 8)
                merges.push({ s: { r: i, c: 0 }, e: { r: i, c: 8 } });
            }
        }

        // Find and merge G and H columns for footer rows (totals section)
        // Footer rows are typically the last few rows with totals
        for (let i = 0; i < ws_data.length; i++) {
            const row = ws_data[i];
            if (row && row[6] && row[6].v && typeof row[6].v === 'string') {
                // Check if this is a total row (contains labels like "Taxable Value", "CGST", "SGST", "IGST", "Round Off", "GRAND TOTAL")
                const label = row[6].v.trim();
                const lower = label.toLowerCase();
                const isExactFooterLabel = label === "Taxable Value" || label === "CGST" || label === "SGST" ||
                    label === "IGST" || label === "Round Off" || label === "GRAND TOTAL";
                const isOtherChargeLabel = lower.includes("freight") || lower.includes("packing") || lower.includes("handling") ||
                    lower.includes("insurance") || lower.includes("others");

                if (isExactFooterLabel || isOtherChargeLabel) {
                    // Merge columns G (index 6) and H (index 7)
                    merges.push({ s: { r: i, c: 6 }, e: { r: i, c: 7 } });
                }
            }
        }

        ws['!merges'] = merges;

        // --- PRINT / PAGE SETUP ---
        // Aim: minimal margins + fit to A4 width (1 page wide)
        ws['!pageSetup'] = {
            paperSize: 9, // A4
            orientation: 'portrait',
            fitToWidth: 1,
            fitToHeight: 0
        };
        ws['!margins'] = {
            left: 0.2,
            right: 0.2,
            top: 0.2,
            bottom: 0.2,
            header: 0.1,
            footer: 0.1
        };

        // --- WIDTHS ---
        ws['!cols'] = [
            { wch: 6 }, { wch: 35 }, { wch: 10 }, { wch: 8 }, 
            { wch: 6 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 15 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Tax Invoice");
        XLSX.writeFile(wb, `Invoice_${invoiceData.meta.billNo}.xlsx`);
    }
    
    async function exportBillToPdf(bill) {
        try {
            if (!bill || !bill.id) {
                alert('Bill ID not available');
                return;
            }

            const response = await window.api.get(`/inventory/api/bills/${bill.id}/pdf`);
            if (!response) {
                throw new Error('Request failed (no response). You may have been logged out.');
            }
            if (!response.ok) {
                const data = await response.json().catch(() => null);
                throw new Error((data && data.error) ? data.error : `Failed to generate PDF (HTTP ${response.status})`);
            }

            const contentType = (response.headers.get('content-type') || '').toLowerCase();
            if (!contentType.includes('application/pdf')) {
                const text = await response.text().catch(() => '');
                throw new Error(`Expected a PDF but received: ${contentType || 'unknown content-type'}. ${text ? 'Server response: ' + text.slice(0, 200) : ''}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const billNo = (bill.bno || `BILL-${bill.id}`).toString().replace(/[^a-zA-Z0-9._-]/g, '_');
            a.download = `Invoice_${billNo}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('PDF export failed:', err);
            alert('PDF export failed: ' + err.message);
        }
    }
    
    function showBillDetailsModal(bill, gstEnabled = true) {
        // Create modal HTML
        let modalHtml = '<div id="bill-details-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">';
        modalHtml += '<div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">';
        modalHtml += '<div class="p-6">';
        
        modalHtml += '<div class="flex justify-between items-center mb-4">';
        modalHtml += '<h2 class="text-xl font-bold text-gray-800">Bill Details - ' + (bill.bno || 'N/A') + '</h2>';
        modalHtml += '<button id="close-bill-modal" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>';
        modalHtml += '</div>';
        
        modalHtml += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">';
        modalHtml += '<div>';
        modalHtml += '<p class="text-sm text-gray-600">Date: <span class="font-medium">' + (bill.bdate || 'N/A') + '</span></p>';
        modalHtml += '<p class="text-sm text-gray-600">Party: <span class="font-medium">' + (bill.firm || 'N/A') + '</span></p>';
        modalHtml += '<p class="text-sm text-gray-600">GSTIN: <span class="font-medium">' + (bill.gstin || 'N/A') + '</span></p>';
        modalHtml += '<p class="text-sm text-gray-600">State: <span class="font-medium">' + (bill.state || 'N/A') + '</span></p>';
        // Add reverse charge indicator if applicable
        if (bill.reverseCharge) {
            modalHtml += '<p class="text-sm text-red-600 font-bold mt-1">REVERSE CHARGE APPLIES</p>';
        }
        // Add GST status indicator
        if (gstEnabled === false) {
            modalHtml += '<p class="text-sm text-orange-600 font-bold mt-1">GST DISABLED</p>';
        }
        modalHtml += '</div>';
        modalHtml += '<div>';
        modalHtml += '<p class="text-sm text-gray-600">PO No: <span class="font-medium">' + (bill.order_no || 'N/A') + '</span></p>';
        modalHtml += '<p class="text-sm text-gray-600">Vehicle No: <span class="font-medium">' + (bill.vehicle_no || 'N/A') + '</span></p>';
        modalHtml += '<p class="text-sm text-gray-600">Dispatched Through: <span class="font-medium">' + (bill.dispatch_through || 'N/A') + '</span></p>';
        modalHtml += '</div>';
        modalHtml += '</div>';
        
        modalHtml += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">';
        modalHtml += '<div class="bg-gray-50 p-3 rounded">';
        modalHtml += '<p class="text-xs text-gray-500">Taxable Value</p>';
        modalHtml += '<p class="font-bold">' + formatCurrency(bill.gtot || 0) + '</p>';
        modalHtml += '</div>';
        modalHtml += '<div class="bg-gray-50 p-3 rounded">';
        modalHtml += '<p class="text-xs text-gray-500">Tax Amount</p>';
                
        // Display tax amounts based on bill type (CGST+SGST for intra-state, IGST for inter-state)
        let taxAmount = 0;
        if (gstEnabled) {
            if (bill.btype && bill.btype.toLowerCase().includes('intra')) {
                taxAmount = (bill.cgst || 0) + (bill.sgst || 0);
            } else {
                taxAmount = bill.igst || 0;
            }
        } else {
            taxAmount = 0; // No tax when GST is disabled
        }
                
        modalHtml += '<p class="font-bold">' + formatCurrency(taxAmount) + '</p>';
        modalHtml += '</div>';
        modalHtml += '<div class="bg-gray-50 p-3 rounded">';
        modalHtml += '<p class="text-xs text-gray-500">Other Charges</p>';
        modalHtml += '<p class="font-bold">' + formatCurrency(getOtherChargesTotal(bill)) + '</p>';
        modalHtml += '</div>';
        modalHtml += '<div class="bg-blue-50 p-3 rounded">';
        modalHtml += '<p class="text-xs text-gray-500">Total Amount</p>';
        // Show total based on GST status
        const totalAmount = gstEnabled ? (bill.ntot || 0) : (bill.gtot || 0);
        modalHtml += '<p class="font-bold text-blue-700">' + formatCurrency(totalAmount) + '</p>';
        modalHtml += '</div>';
        modalHtml += '</div>';
        
        if (bill.narration) {
            modalHtml += '<div class="mb-6">';
            modalHtml += '<h3 class="font-medium text-gray-700 mb-2">Narration:</h3>';
            modalHtml += '<p class="bg-gray-50 p-3 rounded">' + bill.narration + '</p>';
            modalHtml += '</div>';
        }
        
        if (bill.oth_chg_json) {
            modalHtml += '<div class="mb-6">';
            modalHtml += '<h3 class="font-medium text-gray-700 mb-2">Other Charges:</h3>';
            modalHtml += '<div class="overflow-x-auto">';
            modalHtml += '<table class="min-w-full divide-y divide-gray-200">';
            modalHtml += '<thead class="bg-gray-50">';
            modalHtml += '<tr>';
            modalHtml += '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>';
            modalHtml += '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>';
            modalHtml += '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HSN/SAC</th>';
            modalHtml += '<th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>';
            modalHtml += '<th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">GST %</th>';
            modalHtml += '<th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">GST Amount</th>';
            modalHtml += '</tr>';
            modalHtml += '</thead>';
            modalHtml += '<tbody class="bg-white divide-y divide-gray-200">';
            modalHtml += parseAndRenderOtherCharges(bill.oth_chg_json);
            modalHtml += '</tbody>';
            modalHtml += '</table>';
            modalHtml += '</div>';
            modalHtml += '</div>';
        }
        
        // Add items table if items exist
        if (bill.items && bill.items.length > 0) {
            modalHtml += '<div class="mb-6">';
            modalHtml += '<h3 class="font-medium text-gray-700 mb-2">Items:</h3>';
            modalHtml += '<div class="overflow-x-auto">';
            modalHtml += '<table class="min-w-full divide-y divide-gray-200">';
            modalHtml += '<thead class="bg-gray-50">';
            modalHtml += '<tr>';
            modalHtml += '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>';
            modalHtml += '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HSN</th>';
            modalHtml += '<th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>';
            modalHtml += '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>';
            modalHtml += '<th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>';
            modalHtml += '<th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Disc %</th>';
            modalHtml += '<th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tax %</th>';
            modalHtml += '<th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>';
            modalHtml += '</tr>';
            modalHtml += '</thead>';
            modalHtml += '<tbody class="bg-white divide-y divide-gray-200">';
            modalHtml += renderItemsTable(bill.items);
            modalHtml += '</tbody>';
            modalHtml += '</table>';
            modalHtml += '</div>';
            modalHtml += '</div>';
        }
        
        modalHtml += '<div class="flex justify-end space-x-3 pt-4">';
        modalHtml += '<button id="edit-bill" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium">';
        modalHtml += 'Edit Bill';
        modalHtml += '</button>';
        modalHtml += '<button id="export-bill-pdf" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium">';
        modalHtml += 'Export PDF';
        modalHtml += '</button>';
        modalHtml += '<button id="export-bill-excel" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium">';
        modalHtml += 'Export as Excel';
        modalHtml += '</button>';
        modalHtml += '<button id="close-bill-modal-bottom" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium">';
        modalHtml += 'Close';
        modalHtml += '</button>';
        modalHtml += '</div>';
        
        modalHtml += '</div>';
        modalHtml += '</div>';
        modalHtml += '</div>';
        
        // Add modal to document
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Add event listeners
        document.getElementById('close-bill-modal').onclick = closeBillModal;
        document.getElementById('close-bill-modal-bottom').onclick = closeBillModal;
        document.getElementById('export-bill-pdf').onclick = () => exportBillToPdf(bill);
        document.getElementById('export-bill-excel').onclick = () => exportBillToExcel(bill);
        document.getElementById('edit-bill').onclick = () => {
            // Close the modal first
            closeBillModal();
            // Navigate to the sales page in edit mode
            window.location.href = `/inventory/sales?edit=${bill.id}`;
        };
        
        // Close modal on backdrop click
        document.getElementById('bill-details-modal').onclick = function(e) {
            if (e.target === this) {
                closeBillModal();
            }
        };
    }
    
    function renderItemsTable(items) {
        let html = '';
        items.forEach(item => {
            html += '<tr>' +
                '<td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900">' + (item.item || '') + '</td>' +
                '<td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">' + (item.hsn || '') + '</td>' +
                '<td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">' + (item.qty || 0) + '</td>' +
                '<td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">' + (item.uom || '') + '</td>' +
                '<td class="px-3 py-2 text-sm text-gray-900 text-right">' + formatCurrency(item.rate || 0) + '</td>' +
                '<td class="px-3 py-2 text-sm text-gray-900 text-right">' + (item.disc || 0) + '%</td>' +
                '<td class="px-3 py-2 text-sm text-gray-900 text-right">' + (item.grate || 0) + '%</td>' +
                '<td class="px-3 py-2 text-sm text-gray-900 text-right">' + formatCurrency(item.total || 0) + '</td>' +
                '</tr>';
            
            // Add narration row if narration exists
            if (item.item_narration) {
                html += '<tr>' +
                    '<td colspan="2" class="px-3 py-1 text-sm text-gray-500 font-medium">Narration:</td>' +
                    '<td colspan="6" class="px-3 py-1 text-sm text-gray-700">' + (item.item_narration || '') + '</td>' +
                    '</tr>';
            }
        });
        return html;
    }

    // Export to Excel
    async function exportToExcel() {
        if (filteredData.length === 0) {
            alert('No data to export');
            return;
        }

        // Fetch GST status to determine if taxes should be calculated
        let gstEnabled = true; // Default to true
        try {
            const gstResponse = await window.api.get('/admin/gst-status');
            const gstData = await gstResponse.json();
            gstEnabled = gstData.gst_enabled;
        } catch (error) {
            console.warn('Could not fetch GST status, defaulting to enabled:', error);
        }

        // Create Excel data
        const ws_data = [];
        
        // Header
        ws_data.push(['SALES REPORT']);
        ws_data.push([]);
        ws_data.push(['Date Range:', startDateInput.value, 'to', endDateInput.value]);
        ws_data.push([]);
        
        // Column headers
        ws_data.push(['Bill No', 'Date', 'Party', 'Ref/PO No', 'Taxable', 'Tax', 'Other Charges', 'Total', 'Reverse Charge']);
        
        // Data rows
        filteredData.forEach(bill => {
            let otherChargesTotal = 0;
            if (bill.oth_chg_json) {
                try {
                    const otherCharges = JSON.parse(bill.oth_chg_json);
                    otherChargesTotal = otherCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
                } catch (e) {
                    console.warn('Failed to parse other charges for bill', bill.id);
                }
            }
            
            // Calculate tax amount based on GST status
            let taxAmount = 0;
            if (gstEnabled) {
                // Calculate tax amount using stored values: CGST+SGST for intra-state, IGST for inter-state
                if (bill.btype && bill.btype.toLowerCase().includes('intra')) {
                    taxAmount = (bill.cgst || 0) + (bill.sgst || 0);
                } else {
                    taxAmount = bill.igst || 0;
                }
            }

            ws_data.push([
                bill.bno || '',
                bill.bdate || '',
                bill.firm || '',
                bill.order_no || '',
                bill.gtot || 0,
                taxAmount,
                otherChargesTotal,
                bill.ntot || 0,
                bill.reverseCharge ? 'Yes' : 'No'
            ]);
        });

        // Summary row
        ws_data.push([]);
        ws_data.push(['TOTALS:', '', '', '', 
            filteredData.reduce((sum, bill) => sum + (bill.gtot || 0), 0),
            filteredData.reduce((sum, bill) => {
                // Calculate tax amount based on GST status: ntot - gtot = total tax amount (Indian GST standard)
                if (gstEnabled) {
                    return sum + ((bill.ntot || 0) - (bill.gtot || 0));
                } else {
                    return sum; // No tax when GST is disabled
                }
            }, 0),
            filteredData.reduce((sum, bill) => {
                let otherChargesTotal = 0;
                if (bill.oth_chg_json) {
                    try {
                        const otherCharges = JSON.parse(bill.oth_chg_json);
                        otherChargesTotal = otherCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
                    } catch (e) {}
                }
                return sum + otherChargesTotal;
            }, 0),
            filteredData.reduce((sum, bill) => {
                // Calculate total based on GST status
                if (gstEnabled) {
                    return sum + (bill.ntot || 0);
                } else {
                    // When GST is disabled, the net total should equal the gross total
                    return sum + (bill.gtot || 0);
                }
            }, 0),
            '' // Placeholder for reverse charge column in totals row
        ]);

        // Create worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, 
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
        XLSX.writeFile(wb, `Sales_Report_${startDateInput.value}_to_${endDateInput.value}.xlsx`);
    }
    
    // --- UTIL: NUMBER TO WORDS (INDIAN CURRENCY) ---
    function numToIndianRupees(num) {
        if (!num) return "";
        
        const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
        const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        
        const format = (n) => {
            if (n < 20) return a[n];
            const digit = n % 10;
            return b[Math.floor(n / 10)] + (digit ? " " + a[digit] : "");
        };

        const convert = (n) => {
            if (n < 100) return format(n);
            if (n < 1000) return a[Math.floor(n / 100)] + "Hundred " + (n % 100 ? "and " + convert(n % 100) : "");
            if (n < 100000) return convert(Math.floor(n / 1000)) + "Thousand " + (n % 1000 ? convert(n % 1000) : "");
            if (n < 10000000) return convert(Math.floor(n / 100000)) + "Lakh " + (n % 100000 ? convert(n % 100000) : "");
            return convert(Math.floor(n / 10000000)) + "Crore " + (n % 10000000 ? convert(n % 10000000) : "");
        };

        const parts = num.toString().split(".");
        const rupees = convert(parseInt(parts[0]));
        const paise = parts[1] ? convert(parseInt(parts[1].substring(0, 2).padEnd(2, '0'))) : "";

        let res = "Rupees " + rupees;
        if (paise) res += "and " + paise + "Paise ";
        return res + "Only";
    }

    // Event Listeners
    filterBtn.addEventListener('click', applyFilters);
    exportBtn.addEventListener('click', exportToExcel);

    // Initialize the sales report
    fetchSalesData();

})();