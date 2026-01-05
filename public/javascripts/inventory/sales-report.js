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
    function viewBillDetails(billId) {
        // Fetch complete bill details from the API
        fetchBillDetails(billId);
    }
    
    async function fetchBillDetails(billId) {
        try {
            // Use direct fetch instead of window.api.get to avoid potential parameter issues
            const response = await fetch(`/inventory/api/bills/${billId}`, {
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
            
            // Create and show bill details modal
            showBillDetailsModal(bill);
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
    
    function exportBillToExcel(bill) {
        // This would require the same logic as in sls.js to generate a proper invoice
        // For now, let's just alert that this functionality would be implemented
        alert('This would export the full invoice to Excel with all details. This functionality would use the same exportInvoiceToExcel function from sls.js with the complete bill data.');
        
        // In a real implementation, we would need to fetch the complete bill data including cart items
        // This would require a new API endpoint to get complete bill details
    }
    
    function showBillDetailsModal(bill) {
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
        modalHtml += '<p class="font-bold">' + formatCurrency((bill.ntot || 0) - (bill.gtot || 0)) + '</p>';
        modalHtml += '</div>';
        modalHtml += '<div class="bg-gray-50 p-3 rounded">';
        modalHtml += '<p class="text-xs text-gray-500">Other Charges</p>';
        modalHtml += '<p class="font-bold">' + formatCurrency(getOtherChargesTotal(bill)) + '</p>';
        modalHtml += '</div>';
        modalHtml += '<div class="bg-blue-50 p-3 rounded">';
        modalHtml += '<p class="text-xs text-gray-500">Total Amount</p>';
        modalHtml += '<p class="font-bold text-blue-700">' + formatCurrency(bill.ntot || 0) + '</p>';
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
        document.getElementById('export-bill-excel').onclick = () => exportBillToExcel(bill);
        
        // Close modal on backdrop click
        document.getElementById('bill-details-modal').onclick = function(e) {
            if (e.target === this) {
                closeBillModal();
            }
        };
    }
    
    function renderItemsTable(items) {
        return items.map(item => {
            return '<tr>' +
                '<td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900">' + (item.item || '') + '</td>' +
                '<td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">' + (item.hsn || '') + '</td>' +
                '<td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">' + (item.qty || 0) + '</td>' +
                '<td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">' + (item.uom || '') + '</td>' +
                '<td class="px-3 py-2 text-sm text-gray-900 text-right">' + formatCurrency(item.rate || 0) + '</td>' +
                '<td class="px-3 py-2 text-sm text-gray-900 text-right">' + (item.disc || 0) + '%</td>' +
                '<td class="px-3 py-2 text-sm text-gray-900 text-right">' + (item.grate || 0) + '%</td>' +
                '<td class="px-3 py-2 text-sm text-gray-900 text-right">' + formatCurrency(item.total || 0) + '</td>' +
                '</tr>';
        }).join('');
    }

    // Export to Excel
    function exportToExcel() {
        if (filteredData.length === 0) {
            alert('No data to export');
            return;
        }

        // Create Excel data
        const ws_data = [];
        
        // Header
        ws_data.push(['SALES REPORT']);
        ws_data.push([]);
        ws_data.push(['Date Range:', startDateInput.value, 'to', endDateInput.value]);
        ws_data.push([]);
        
        // Column headers
        ws_data.push(['Bill No', 'Date', 'Party', 'Ref/PO No', 'Taxable', 'Tax', 'Other Charges', 'Total']);
        
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
            
            // Calculate tax amount: ntot - gtot = total tax amount (Indian GST standard)
            const taxAmount = (bill.ntot || 0) - (bill.gtot || 0);

            ws_data.push([
                bill.bno || '',
                bill.bdate || '',
                bill.firm || '',
                bill.order_no || '',
                bill.gtot || 0,
                taxAmount,
                otherChargesTotal,
                bill.ntot || 0
            ]);
        });

        // Summary row
        ws_data.push([]);
        ws_data.push(['TOTALS:', '', '', '', 
            filteredData.reduce((sum, bill) => sum + (bill.gtot || 0), 0),
            filteredData.reduce((sum, bill) => {
                // Calculate tax amount: ntot - gtot = total tax amount (Indian GST standard)
                return sum + ((bill.ntot || 0) - (bill.gtot || 0));
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
            filteredData.reduce((sum, bill) => sum + (bill.ntot || 0), 0)
        ]);

        // Create worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, 
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
        XLSX.writeFile(wb, `Sales_Report_${startDateInput.value}_to_${endDateInput.value}.xlsx`);
    }

    // Event Listeners
    filterBtn.addEventListener('click', applyFilters);
    exportBtn.addEventListener('click', exportToExcel);

    // Initialize the sales report
    fetchSalesData();

})();