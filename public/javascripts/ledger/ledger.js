(function() {
    // Global variables for elements
    let elements = {};

    // State for pagination and filtering
    let state = {
        currentPage: 1,
        itemsPerPage: 10,
        allAccounts: [],
        filteredAccounts: [],
        searchTerm: '',
        accountTypeFilter: ''
    };

// --- HELPER FUNCTIONS ---

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// --- API FUNCTIONS ---

async function loadAccountBalances() {
    try {
        const response = await window.api.get('/ledger/api/accounts');
        const accounts = await response.json();
        
        if (response.ok) {
            state.allAccounts = accounts;
            applyFilters();
            renderAccountTable();
            setupEventListeners();
        } else {
            showError(`Failed to load accounts: ${accounts.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error loading account balances:', error);
        showError('Error loading account balances');
    }
}

async function loadAccountDetails(accountHead) {
    try {
        const response = await window.api.get(`/ledger/api/details/${encodeURIComponent(accountHead)}`);
        const details = await response.json();
        
        if (response.ok) {
            return details;
        } else {
            showError(`Failed to load account details: ${details.error || 'Unknown error'}`);
            return [];
        }
    } catch (error) {
        console.error('Error loading account details:', error);
        showError('Error loading account details');
        return [];
    }
}

// --- FILTERING AND SEARCH ---

function applyFilters() {
    state.filteredAccounts = state.allAccounts.filter(account => {
        const matchesSearch = !state.searchTerm || 
            account.account_head.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
            account.account_type.toLowerCase().includes(state.searchTerm.toLowerCase());
        
        const matchesType = !state.accountTypeFilter || 
            account.account_type === state.accountTypeFilter;
        
        return matchesSearch && matchesType;
    });
    
    // Reset to first page when filters change
    state.currentPage = 1;
}

// --- PAGINATION FUNCTIONS ---

function getCurrentPageData() {
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    return state.filteredAccounts.slice(startIndex, endIndex);
}

function getTotalPages() {
    return Math.ceil(state.filteredAccounts.length / state.itemsPerPage);
}

function renderPagination() {
    const totalPages = getTotalPages();
    const currentPage = state.currentPage;
    
    // Update pagination info
    const startIndex = (currentPage - 1) * state.itemsPerPage + 1;
    const endIndex = Math.min(currentPage * state.itemsPerPage, state.filteredAccounts.length);
    
    if (elements.currentPageStart) elements.currentPageStart.textContent = startIndex;
    if (elements.currentPageEnd) elements.currentPageEnd.textContent = endIndex;
    if (elements.totalRecords) elements.totalRecords.textContent = state.filteredAccounts.length;
    
    if (elements.currentPageStartDesktop) elements.currentPageStartDesktop.textContent = startIndex;
    if (elements.currentPageEndDesktop) elements.currentPageEndDesktop.textContent = endIndex;
    if (elements.totalRecordsDesktop) elements.totalRecordsDesktop.textContent = state.filteredAccounts.length;
    
    // Update pagination buttons
    if (elements.prevPage) {
        elements.prevPage.style.pointerEvents = currentPage === 1 ? 'none' : 'auto';
        elements.prevPage.style.opacity = currentPage === 1 ? '0.5' : '1';
    }
    
    if (elements.nextPage) {
        elements.nextPage.style.pointerEvents = currentPage === totalPages ? 'none' : 'auto';
        elements.nextPage.style.opacity = currentPage === totalPages ? '0.5' : '1';
    }
    
    // Render page numbers
    if (elements.pageNumbers) {
        elements.pageNumbers.innerHTML = '';
        
        // Determine which page numbers to show
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageLink = document.createElement('a');
            pageLink.href = '#';
            pageLink.className = `pagination-btn relative inline-flex items-center px-4 py-2 border text-sm font-medium ${i === currentPage ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`;
            pageLink.textContent = i;
            pageLink.onclick = (e) => {
                e.preventDefault();
                state.currentPage = i;
                renderAccountTable();
                renderPagination();
            };
            elements.pageNumbers.appendChild(pageLink);
        }
    }
}

// --- RENDERING FUNCTIONS ---

function renderAccountTable() {
    if (!elements.accountTableBody) return;
    
    const currentPageData = getCurrentPageData();
    
    if (currentPageData.length === 0) {
        elements.accountTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                    <div class="flex flex-col items-center">
                        <svg class="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>No accounts found matching your criteria</p>
                    </div>
                </td>
            </tr>
        `;
        renderPagination();
        return;
    }
    
    elements.accountTableBody.innerHTML = currentPageData.map(account => {
        const balance = account.balance || 0;
        const balanceClass = balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-700';
        const balanceLabel = balance > 0 ? 'DR' : balance < 0 ? 'CR' : '0';
        
        return `
            <tr class="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">${account.account_head}</td>
                <td class="px-4 py-3 text-sm text-gray-500">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ${account.account_type}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-right text-gray-900">${formatCurrency(account.total_debit || 0)}</td>
                <td class="px-4 py-3 text-sm text-right text-gray-900">${formatCurrency(account.total_credit || 0)}</td>
                <td class="px-4 py-3 text-sm text-right font-medium ${balanceClass}">
                    ${formatCurrency(Math.abs(balance))} <span class="text-xs">${balanceLabel}</span>
                </td>
                <td class="px-4 py-3 text-center">
                    <button 
                        data-account-head="${account.account_head.replace(/"/g, '&quot;')}" 
                        class="view-account-btn inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                        title="View details for ${account.account_head}"
                    >
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners to the view buttons using event delegation
    elements.accountTableBody.querySelectorAll('.view-account-btn').forEach(btn => {
        btn.removeEventListener('click', handleViewAccountClick); // Remove any existing listener
        btn.addEventListener('click', handleViewAccountClick);
    });
    
    renderPagination();
}

function showError(message) {
    if (elements.accountTableBody) {
        elements.accountTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-8 text-center text-red-600 font-medium">
                    <div class="flex flex-col items-center">
                        <svg class="w-12 h-12 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        ${message}
                    </div>
                </td>
            </tr>
        `;
    }
}

// --- EVENT HANDLERS ---

function handleViewAccountClick(event) {
    event.preventDefault();
    const accountHead = event.currentTarget.getAttribute('data-account-head');
    if (accountHead) {
        openAccountDetails(accountHead);
    }
}

function handleSearchInput(event) {
    state.searchTerm = event.target.value;
    applyFilters();
    renderAccountTable();
    renderPagination();
}

function handleAccountTypeFilter(event) {
    state.accountTypeFilter = event.target.value;
    applyFilters();
    renderAccountTable();
    renderPagination();
}

function handlePrevPage(event) {
    event.preventDefault();
    if (state.currentPage > 1) {
        state.currentPage--;
        renderAccountTable();
        renderPagination();
    }
}

function handleNextPage(event) {
    event.preventDefault();
    const totalPages = getTotalPages();
    if (state.currentPage < totalPages) {
        state.currentPage++;
        renderAccountTable();
        renderPagination();
    }
}

// --- MODAL FUNCTIONS ---

async function openAccountDetails(accountHead) {
    try {
        // Show loading state
        elements.modalBody.innerHTML = `
            <div class="flex flex-col items-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p class="text-gray-600">Loading account details...</p>
            </div>
        `;
        
        elements.modalTitle.textContent = `${accountHead} - Transaction Details`;
        elements.modal.classList.remove('hidden');
        
        // Load actual details
        const details = await loadAccountDetails(accountHead);
        
        if (details.length > 0) {
            renderAccountDetails(details);
        } else {
            elements.modalBody.innerHTML = `
                <div class="py-12 text-center text-gray-500">
                    <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p class="text-lg font-medium text-gray-700">No transactions found</p>
                    <p class="text-sm text-gray-500 mt-1">There are no transactions recorded for this account.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error opening account details:', error);
        elements.modalBody.innerHTML = `
            <div class="py-12 text-center text-red-500">
                <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-lg font-medium">Error loading details</p>
                <p class="text-sm mt-1">${error.message || 'An unknown error occurred'}</p>
            </div>
        `;
    }
}

function renderAccountDetails(details) {
    if (!elements.modalBody) return;
    
    // Calculate running balance
    let runningBalance = 0;
    details.forEach(detail => {
        detail.running_balance = runningBalance;
        if (detail.voucher_type.startsWith('PAYMENT') || detail.voucher_type.startsWith('JOURNAL')) {
            // For PAYMENT and JOURNAL entries, determine DR/CR based on amounts
            if (detail.debit_amount > 0) {
                runningBalance += detail.debit_amount;
                detail.balance_after = runningBalance;
            } else if (detail.credit_amount > 0) {
                runningBalance -= detail.credit_amount;
                detail.balance_after = runningBalance;
            }
        } else {
            // For SALES/PURCHASE, follow standard convention
            runningBalance += detail.debit_amount - detail.credit_amount;
            detail.balance_after = runningBalance;
        }
    });
    
    elements.modalBody.innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher No</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher Type</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narration</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${details.map(detail => {
                        const debitFormatted = detail.debit_amount > 0 ? formatCurrency(detail.debit_amount) : '';
                        const creditFormatted = detail.credit_amount > 0 ? formatCurrency(detail.credit_amount) : '';
                        const balanceClass = detail.balance_after > 0 ? 'text-green-600' : detail.balance_after < 0 ? 'text-red-600' : 'text-gray-700';
                        
                        return `
                            <tr class="hover:bg-gray-50 transition-colors duration-150">
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${detail.transaction_date}</td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${detail.voucher_no}</td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getVoucherTypeColor(detail.voucher_type)}">
                                        ${detail.voucher_type}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title="${detail.narration || ''}">${detail.narration || ''}</td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">${debitFormatted}</td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">${creditFormatted}</td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${balanceClass}">${formatCurrency(Math.abs(detail.balance_after))} ${detail.balance_after > 0 ? 'DR' : detail.balance_after < 0 ? 'CR' : ''}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function getVoucherTypeColor(voucherType) {
    const colors = {
        'SALES': 'bg-green-100 text-green-800',
        'PURCHASE': 'bg-blue-100 text-blue-800',
        'PAYMENT': 'bg-yellow-100 text-yellow-800',
        'RECEIPT': 'bg-purple-100 text-purple-800',
        'JOURNAL': 'bg-gray-100 text-gray-800',
        'CONTRA': 'bg-indigo-100 text-indigo-800'
    };
    return colors[voucherType] || 'bg-gray-100 text-gray-800';
}

// Close modal when close button is clicked
function initializeModalClose() {
    if (elements.closeModal) {
        elements.closeModal.removeEventListener('click', handleModalClose); // Remove any existing listener
        elements.closeModal.addEventListener('click', handleModalClose);
    }
}

// Handler for modal close
function handleModalClose() {
    elements.modal.classList.add('hidden');
}

// Close modal when clicking outside of it
function initializeModalBackdrop() {
    elements.modal.removeEventListener('click', handleModalBackdropClick); // Remove any existing listener
    elements.modal.addEventListener('click', handleModalBackdropClick);
}

function handleModalBackdropClick(event) {
    if (event.target === elements.modal) {
        elements.modal.classList.add('hidden');
    }
}

// Close modal with ESC key
function handleEscapeKey(event) {
    if (event.key === 'Escape' && elements.modal && !elements.modal.classList.contains('hidden')) {
        elements.modal.classList.add('hidden');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    if (elements.searchInput) {
        elements.searchInput.removeEventListener('input', handleSearchInput);
        elements.searchInput.addEventListener('input', handleSearchInput);
    }
    
    // Account type filter
    if (elements.accountTypeFilter) {
        elements.accountTypeFilter.removeEventListener('change', handleAccountTypeFilter);
        elements.accountTypeFilter.addEventListener('change', handleAccountTypeFilter);
    }
    
    // Pagination buttons
    if (elements.prevPage) {
        elements.prevPage.removeEventListener('click', handlePrevPage);
        elements.prevPage.addEventListener('click', handlePrevPage);
    }
    
    if (elements.nextPage) {
        elements.nextPage.removeEventListener('click', handleNextPage);
        elements.nextPage.addEventListener('click', handleNextPage);
    }
}

// Initialize the ledger system
function initLedger() {
    console.log('Ledger: Initializing...');
    
    // Cache DOM elements
    elements = {
        accountTableBody: document.getElementById('accountTableBody'),
        modal: document.getElementById('ledgerModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalBody: document.getElementById('modalBody'),
        closeModal: document.getElementById('closeModal'),
        searchInput: document.getElementById('searchInput'),
        accountTypeFilter: document.getElementById('accountTypeFilter'),
        prevPage: document.getElementById('prevPage'),
        nextPage: document.getElementById('nextPage'),
        pageNumbers: document.getElementById('pageNumbers'),
        currentPageStart: document.getElementById('currentPageStart'),
        currentPageEnd: document.getElementById('currentPageEnd'),
        totalRecords: document.getElementById('totalRecords'),
        currentPageStartDesktop: document.getElementById('currentPageStartDesktop'),
        currentPageEndDesktop: document.getElementById('currentPageEndDesktop'),
        totalRecordsDesktop: document.getElementById('totalRecordsDesktop')
    };
    
    // Validate elements exist
    const missingElements = Object.entries(elements)
        .filter(([key, value]) => !value)
        .map(([key, value]) => key);
    
    if (missingElements.length > 0) {
        console.error('Ledger: Missing required DOM elements:', missingElements);
        return;
    }
    
    // Initialize modal close functionality
    initializeModalClose();
    initializeModalBackdrop();
    
    // Add ESC key listener for modal
    document.removeEventListener('keydown', handleEscapeKey);
    document.addEventListener('keydown', handleEscapeKey);
    
    // Load account balances
    loadAccountBalances();
}

    // Wait for DOM to be ready before initializing
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLedger);
    } else {
        initLedger();
    }
})();
