/**
 * Vouchers Page JavaScript
 * Handles payment and receipt voucher functionality
 */

function initVouchersPage() {
    // DOM Elements
    const voucherForm = document.getElementById('voucherForm');
    const voucherTypeSelect = document.getElementById('voucherType');
    const partyIdSelect = document.getElementById('partyId');
    const paymentModeSelect = document.getElementById('paymentMode');
    const amountInput = document.getElementById('amount');
    const transactionDateInput = document.getElementById('transactionDate');
    const narrationInput = document.getElementById('narration');
    const submitVoucherBtn = document.getElementById('submitVoucher');
    const resetFormBtn = document.getElementById('resetForm');
    const vouchersTableBody = document.getElementById('vouchersTableBody');
    const searchVouchersInput = document.getElementById('searchVouchers');
    const filterTypeSelect = document.getElementById('filterType');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const currentPageSpan = document.getElementById('currentPage');
    const paginationInfo = document.getElementById('paginationInfo');
    
    // Summary cards
    const totalReceiptsEl = document.getElementById('total-receipts');
    const totalPaymentsEl = document.getElementById('total-payments');
    const netPositionEl = document.getElementById('net-position');
    const recentTransactionsEl = document.getElementById('recent-transactions');
    
    // State
    let currentPage = 1;
    const itemsPerPage = 10;
    
    // Check if all required DOM elements exist before initializing
    const requiredElements = [
        voucherForm, voucherTypeSelect, partyIdSelect, paymentModeSelect,
        amountInput, transactionDateInput, narrationInput, submitVoucherBtn,
        resetFormBtn, vouchersTableBody, searchVouchersInput, filterTypeSelect,
        prevPageBtn, nextPageBtn, currentPageSpan, paginationInfo,
        totalReceiptsEl, totalPaymentsEl, netPositionEl, recentTransactionsEl
    ];
    
    const hasMissingElements = requiredElements.some(el => !el);
    if (hasMissingElements) {
        console.warn('Some required DOM elements not found, deferring initialization');
        // Retry initialization after a short delay to handle potential timing issues
        setTimeout(() => {
            if (document.getElementById('vouchersTableBody')) {
                initVouchersPage(); // Re-attempt initialization
            }
        }, 100);
        return;
    }
    
    // Initialize the page
    initPage();

    async function apiGetJson(url) {
        // Ensure window.api is available
        if (!window.api || typeof window.api.get !== 'function') {
            console.warn('window.api.get not available, waiting for availability');
            // Wait for window.api to become available
            let attempts = 0;
            const maxAttempts = 10; // Maximum 1 second wait (10 * 100ms)
            
            while (attempts < maxAttempts && (!window.api || typeof window.api.get !== 'function')) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.api || typeof window.api.get !== 'function') {
                console.error('window.api.get still not available after waiting');
                // Fall back to direct fetch
                const response = await fetch(url, {
                    method: 'GET',
                    headers: (() => {
                        const headers = {};
                        const accessToken = localStorage.getItem('access_token');
                        const refreshToken = localStorage.getItem('refresh_token');
                        if (accessToken) {
                            headers['Authorization'] = `Bearer ${accessToken}`;
                        }
                        if (refreshToken) {
                            headers['X-Refresh-Token'] = refreshToken;
                        }
                        return headers;
                    })()
                });
                
                if (!response) {
                    throw new Error('No response received');
                }
                
                const data = await response.json().catch(() => ({}));
                
                if (!response.ok) {
                    throw new Error(data.error || `HTTP error! status: ${response.status}`);
                }
                
                return data;
            }
        }
        
        const response = await window.api.get(url);
        
        if (!response) {
            throw new Error('No response received');
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;
    }

    async function apiPostJson(url, body) {
        // Ensure window.api is available
        if (!window.api || typeof window.api.post !== 'function') {
            console.warn('window.api.post not available, waiting for availability');
            // Wait for window.api to become available
            let attempts = 0;
            const maxAttempts = 10; // Maximum 1 second wait (10 * 100ms)
            
            while (attempts < maxAttempts && (!window.api || typeof window.api.post !== 'function')) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.api || typeof window.api.post !== 'function') {
                console.error('window.api.post still not available after waiting');
                // Fall back to direct fetch
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(() => {
                            const headers = {};
                            const accessToken = localStorage.getItem('access_token');
                            const refreshToken = localStorage.getItem('refresh_token');
                            if (accessToken) {
                                headers['Authorization'] = `Bearer ${accessToken}`;
                            }
                            if (refreshToken) {
                                headers['X-Refresh-Token'] = refreshToken;
                            }
                            return headers;
                        })()
                    },
                    body: JSON.stringify(body)
                });
                
                if (!response) {
                    throw new Error('No response received');
                }
                
                const result = await response.json().catch(() => ({}));
                
                if (!response.ok) {
                    throw new Error(result.error || `HTTP error! status: ${response.status}`);
                }
                
                return result;
            }
        }
        
        const response = await window.api.post(url, body);
        
        if (!response) {
            throw new Error('No response received');
        }

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }

        return result;
    }
    
    async function initPage() {
        try {
            // Check if window.api is available before making API calls
            if (!window.api || typeof window.api.get !== 'function') {
                console.warn('API not ready, waiting...');
                // Wait a bit and try again
                setTimeout(async () => {
                    if (window.api && typeof window.api.get === 'function') {
                        await initPage();
                    }
                }, 200);
                return;
            }
            
            // Load parties for the dropdown
            await loadParties();
            
            // Load vouchers
            await loadVouchers();
            
            // Load summary stats
            await loadSummaryStats();
            
            // Set today's date as default
            transactionDateInput.valueAsDate = new Date();
        } catch (error) {
            console.error('Error initializing page:', error);
            showToast('Error initializing page', 'error');
        }
    }
    
    async function loadParties() {
        try {
            const parties = await apiGetJson('/ledger/api/parties');
            
            // Clear existing options except the first one
            partyIdSelect.innerHTML = '<option value="">Select Party</option>';
            
            // Add parties to the dropdown
            parties.forEach(party => {
                const option = document.createElement('option');
                option.value = party.id;
                option.textContent = party.firm;
                partyIdSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading parties:', error);
            showToast('Error loading parties', 'error');
        }
    }
    
    async function loadVouchers(page = 1) {
        try {
            const search = searchVouchersInput.value.trim();
            const filterType = filterTypeSelect.value;
            
            let url = `/ledger/api/vouchers?page=${page}&limit=${itemsPerPage}`;
            
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }
            
            if (filterType) {
                url += `&type=${encodeURIComponent(filterType)}`;
            }
            
            const data = await apiGetJson(url);
            
            // Update pagination
            currentPage = page;
            currentPageSpan.textContent = page;
            
            // Update table
            renderVouchersTable(data.vouchers);
            
            // Update pagination info
            const totalItems = data.total || 0;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            
            paginationInfo.textContent = `Showing ${Math.min((page - 1) * itemsPerPage + 1, totalItems)} to ${Math.min(page * itemsPerPage, totalItems)} of ${totalItems}`;
            
            // Update pagination buttons
            prevPageBtn.disabled = page <= 1;
            nextPageBtn.disabled = page >= totalPages || data.vouchers.length < itemsPerPage;
        } catch (error) {
            console.error('Error loading vouchers:', error);
            showToast('Error loading vouchers', 'error');
            
            // Show empty state
            vouchersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-4 text-center text-red-500">
                        Error loading transactions: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
    
    function renderVouchersTable(vouchers) {
        if (!vouchers || vouchers.length === 0) {
            vouchersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                        No transactions found
                    </td>
                </tr>
            `;
            return;
        }
        
        vouchersTableBody.innerHTML = vouchers.map(voucher => {
            const voucherDate = new Date(voucher.transaction_date).toLocaleDateString('en-IN');
            const formattedAmount = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(voucher.amount);
            
            let typeClass = '';
            let typeText = '';
            
            if (voucher.voucher_type === 'RECEIPT') {
                typeClass = 'bg-green-100 text-green-800';
                typeText = 'Receipt';
            } else if (voucher.voucher_type === 'PAYMENT') {
                typeClass = 'bg-red-100 text-red-800';
                typeText = 'Payment';
            } else {
                typeClass = 'bg-gray-100 text-gray-800';
                typeText = voucher.voucher_type;
            }
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${voucher.voucher_no || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeClass}">
                            ${typeText}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${voucher.party_name || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${formattedAmount}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${voucherDate}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${voucher.payment_mode || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button data-voucher-id="${voucher.id}" class="view-voucher-btn text-blue-600 hover:text-blue-900 mr-3">View</button>
                        <button data-voucher-id="${voucher.id}" class="print-voucher-btn text-green-600 hover:text-green-900">Print</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Attach event listeners using event delegation
        attachVoucherActionListeners();
    }
    
    function attachVoucherActionListeners() {
        // Remove old listeners if any
        const oldViewButtons = vouchersTableBody.querySelectorAll('.view-voucher-btn');
        const oldPrintButtons = vouchersTableBody.querySelectorAll('.print-voucher-btn');
        
        oldViewButtons.forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        oldPrintButtons.forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        // Attach new listeners
        vouchersTableBody.querySelectorAll('.view-voucher-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const voucherId = this.getAttribute('data-voucher-id');
                viewVoucher(voucherId);
            });
        });
        
        vouchersTableBody.querySelectorAll('.print-voucher-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const voucherId = this.getAttribute('data-voucher-id');
                printVoucher(voucherId);
            });
        });
    }
    
    async function loadSummaryStats() {
        try {
            const summary = await apiGetJson('/ledger/api/vouchers/summary');
            
            // Update summary cards
            totalReceiptsEl.textContent = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(summary.total_receipts || 0);
            
            totalPaymentsEl.textContent = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(summary.total_payments || 0);
            
            const netPosition = (summary.total_receipts || 0) - (summary.total_payments || 0);
            netPositionEl.textContent = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(netPosition);
            
            recentTransactionsEl.textContent = summary.recent_transactions_count || 0;
        } catch (error) {
            console.error('Error loading summary stats:', error);
            // Don't show error to user for summary stats, just log it
        }
    }
    
    // Event Listeners
    voucherForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Disable submit button
        submitVoucherBtn.disabled = true;
        submitVoucherBtn.textContent = 'Processing...';
        
        try {
            const formData = new FormData(voucherForm);
            const voucherData = Object.fromEntries(formData);
            
            // Convert amount to number
            voucherData.amount = parseFloat(voucherData.amount);
            
            // Make API call to create voucher
            await apiPostJson('/ledger/api/vouchers', voucherData);
            
            showToast('Voucher created successfully!', 'success');
            
            // Reset form
            voucherForm.reset();
            transactionDateInput.valueAsDate = new Date();
            
            // Reload vouchers
            await loadVouchers(currentPage);
            
            // Reload summary stats
            await loadSummaryStats();
        } catch (error) {
            console.error('Error creating voucher:', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            // Re-enable submit button
            submitVoucherBtn.disabled = false;
            submitVoucherBtn.textContent = 'Record Transaction';
        }
    });
    
    resetFormBtn.addEventListener('click', function() {
        voucherForm.reset();
        transactionDateInput.valueAsDate = new Date();
    });
    
    searchVouchersInput.addEventListener('input', function() {
        // Debounce search
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            loadVouchers(1); // Reset to first page on search
        }, 500);
    });
    
    filterTypeSelect.addEventListener('change', function() {
        loadVouchers(1); // Reset to first page on filter change
    });
    
    prevPageBtn.addEventListener('click', function() {
        if (currentPage > 1) {
            loadVouchers(currentPage - 1);
        }
    });
    
    nextPageBtn.addEventListener('click', function() {
        loadVouchers(currentPage + 1);
    });
    
    // Functions for voucher actions (no longer need to be global)
    function viewVoucher(id) {
        alert(`View voucher details for ID: ${id}`);
        // In a real implementation, this would open a modal or navigate to a detail page
    }
    
    function printVoucher(id) {
        alert(`Print voucher with ID: ${id}`);
        // In a real implementation, this would open a print dialog
    }

}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVouchersPage);
} else {
    initVouchersPage();
}

// Toast function (assuming it's available globally)
function showToast(message, type = 'info') {
    // Create toast element if not exists
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.backgroundColor = type === 'error' ? '#dc2626' : type === 'success' ? '#22c55e' : '#3b82f6';
    toast.style.color = 'white';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '6px';
    toast.style.marginBottom = '10px';
    toast.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}