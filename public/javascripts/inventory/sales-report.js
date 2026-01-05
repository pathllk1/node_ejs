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
        // In a real implementation, this would show a modal with bill details
        alert(`Viewing details for bill ID: ${billId}`);
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
        ws_data.push(['Bill No', 'Date', 'Party', 'Taxable', 'Tax', 'Other Charges', 'Total']);
        
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
                bill.gtot || 0,
                taxAmount,
                otherChargesTotal,
                bill.ntot || 0
            ]);
        });

        // Summary row
        ws_data.push([]);
        ws_data.push(['TOTALS:', '', '', 
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
            { wch: 15 }, { wch: 12 }, { wch: 25 }, 
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