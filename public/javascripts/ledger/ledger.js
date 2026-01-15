(function() {
    // Global variables for elements
    let elements = {};

    // State for pagination and filtering
    let state = {
        currentPage: 1,
        itemsPerPage: 10,
        allAccounts: [],
        filteredAccounts: [],
        accountTypeSummaries: [],
        searchTerm: '',
        accountTypeFilter: '',
        activeTab: 'tab-content-2'
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

function formatNumber(num) {
    return new Intl.NumberFormat('en-IN').format(num);
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

async function loadAccountDetails(accountHead, startDate = null, endDate = null) {
    try {
        let url = `/ledger/api/details/${encodeURIComponent(accountHead)}`;
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await window.api.get(url);
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

async function loadAccountTypeSummaries() {
    try {
        const response = await window.api.get('/ledger/api/type-summaries');
        const summaries = await response.json();
        
        if (response.ok) {
            state.accountTypeSummaries = summaries;
            renderAccountTypeSummaries();
        } else {
            showErrorInSummaryTab(`Failed to load account type summaries: ${summaries.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error loading account type summaries:', error);
        showErrorInSummaryTab('Error loading account type summaries');
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
    if (elements.totalRecords) elements.totalRecords.textContent = state.filteredAccounts.length;
    
    if (elements.currentPageStartDesktop) elements.currentPageStartDesktop.textContent = startIndex;
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

// --- EXPORT FUNCTIONS ---

async function exportAccountLedgerPdf(accountHead, startDate = null, endDate = null) {
    try {
        // Show loading state
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        if (exportPdfBtn) {
            exportPdfBtn.disabled = true;
            exportPdfBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Exporting...';
        }
        
        let url = `/ledger/api/export-pdf/${encodeURIComponent(accountHead)}`;
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await window.api.get(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Export failed with status ${response.status}`);
        }
        
        // Create a blob from the PDF response
        const blob = await response.blob();
        const urlObject = window.URL.createObjectURL(blob);
        
        // Create a temporary link and trigger download
        const a = document.createElement('a');
        a.href = urlObject;
        
        // Create filename with date range if provided
        let filename = `Ledger_${accountHead.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        if (startDate && endDate) {
            filename += `_from_${startDate}_to_${endDate}`;
        } else if (startDate) {
            filename += `_from_${startDate}`;
        } else if (endDate) {
            filename += `_to_${endDate}`;
        }
        filename += '.pdf';
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(urlObject);
        document.body.removeChild(a);
        
        // Restore button
        if (exportPdfBtn) {
            exportPdfBtn.disabled = false;
            exportPdfBtn.innerHTML = '<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path></svg> Export PDF';
        }
    } catch (err) {
        console.error('PDF export failed:', err);
        
        // Restore button
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        if (exportPdfBtn) {
            exportPdfBtn.disabled = false;
            exportPdfBtn.innerHTML = '<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path></svg> Export PDF';
        }
        
        alert('PDF export failed: ' + err.message);
    }
}

async function exportGeneralLedgerPdf(startDate = null, endDate = null) {
    try {
        let url = '/ledger/api/export-general-ledger';
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await window.api.get(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Export failed with status ${response.status}`);
        }
        
        // Create a blob from the PDF response
        const blob = await response.blob();
        const urlObject = window.URL.createObjectURL(blob);
        
        // Create a temporary link and trigger download
        const a = document.createElement('a');
        a.href = urlObject;
        
        // Create filename with date range if provided
        let filename = 'General_Ledger';
        if (startDate && endDate) {
            filename += `_from_${startDate}_to_${endDate}`;
        } else if (startDate) {
            filename += `_from_${startDate}`;
        } else if (endDate) {
            filename += `_to_${endDate}`;
        }
        filename += '.pdf';
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(urlObject);
        document.body.removeChild(a);
    } catch (err) {
        console.error('General ledger PDF export failed:', err);
        alert('General ledger PDF export failed: ' + err.message);
    }
}

async function exportTrialBalancePdf(startDate = null, endDate = null) {
    try {
        let url = '/ledger/api/export-trial-balance';
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await window.api.get(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Export failed with status ${response.status}`);
        }
        
        // Create a blob from the PDF response
        const blob = await response.blob();
        const urlObject = window.URL.createObjectURL(blob);
        
        // Create a temporary link and trigger download
        const a = document.createElement('a');
        a.href = urlObject;
        
        // Create filename with date range if provided
        let filename = 'Trial_Balance';
        if (startDate && endDate) {
            filename += `_from_${startDate}_to_${endDate}`;
        } else if (startDate) {
            filename += `_from_${startDate}`;
        } else if (endDate) {
            filename += `_to_${endDate}`;
        }
        filename += '.pdf';
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(urlObject);
        document.body.removeChild(a);
    } catch (err) {
        console.error('Trial balance PDF export failed:', err);
        alert('Trial balance PDF export failed: ' + err.message);
    }
}

async function exportAccountTypePdf(accounts, accountType) {
    try {
        // Send the data to the backend via POST request
        const response = await window.api.post('/ledger/api/export-account-type-pdf', {
            accounts: accounts,
            account_type: accountType
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Export failed with status ${response.status}`);
        }
        
        // Create a blob from the PDF response
        const blob = await response.blob();
        const urlObject = window.URL.createObjectURL(blob);
        
        // Create a temporary link and trigger download
        const a = document.createElement('a');
        a.href = urlObject;
        
        // Create filename
        let filename = `Account_Type_${accountType.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(urlObject);
        document.body.removeChild(a);
    } catch (err) {
        console.error('Account type PDF export failed:', err);
        alert('Account type PDF export failed: ' + err.message);
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

function renderAccountTypeSummaries() {
    if (!elements.accountTypeSummaryBody) return;
    
    if (state.accountTypeSummaries.length === 0) {
        elements.accountTypeSummaryBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                    <div class="flex flex-col items-center">
                        <svg class="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>No account type summaries found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    elements.accountTypeSummaryBody.innerHTML = state.accountTypeSummaries.map(summary => {
        const balance = summary.total_balance || 0;
        const balanceClass = balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-700';
        const balanceLabel = balance > 0 ? 'DR' : balance < 0 ? 'CR' : '0';
        
        return `
            <tr class="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ${summary.account_type}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-right text-gray-900">${formatNumber(summary.account_count)}</td>
                <td class="px-4 py-3 text-sm text-right text-gray-900">${formatCurrency(summary.total_debit || 0)}</td>
                <td class="px-4 py-3 text-sm text-right text-gray-900">${formatCurrency(summary.total_credit || 0)}</td>
                <td class="px-4 py-3 text-sm text-right font-medium ${balanceClass}">
                    ${formatCurrency(Math.abs(balance))} <span class="text-xs">${balanceLabel}</span>
                </td>
                <td class="px-4 py-3 text-center">
                    <button 
                        data-account-type="${summary.account_type.replace(/"/g, '&quot;')}" 
                        class="view-type-accounts-btn inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                        title="View accounts of type ${summary.account_type}"
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
    elements.accountTypeSummaryBody.querySelectorAll('.view-type-accounts-btn').forEach(btn => {
        btn.removeEventListener('click', handleViewTypeAccountsClick); // Remove any existing listener
        btn.addEventListener('click', handleViewTypeAccountsClick);
    });
}

function showErrorInSummaryTab(message) {
    if (elements.accountTypeSummaryBody) {
        elements.accountTypeSummaryBody.innerHTML = `
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

function handleViewTypeAccountsClick(event) {
    event.preventDefault();
    const accountType = event.currentTarget.getAttribute('data-account-type');
    if (accountType) {
        openAccountTypeDetails(accountType);
    }
}

async function openAccountTypeDetails(accountType) {
    try {
        // Show loading state
        elements.modalBody.innerHTML = `
            <div class="flex flex-col items-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p class="text-gray-600">Loading ${accountType} accounts...</p>
            </div>
        `;
        
        elements.modalTitle.textContent = `${accountType} Accounts - Transaction Details`;
        elements.modal.classList.remove('hidden');
        
        // Load all accounts and filter by type
        const response = await window.api.get('/ledger/api/accounts');
        const allAccounts = await response.json();
        
        if (response.ok) {
            const accountsOfType = allAccounts.filter(acc => acc.account_type === accountType);
            
            if (accountsOfType.length > 0) {
                renderAccountTypeDetails(accountsOfType, accountType);
            } else {
                elements.modalBody.innerHTML = `
                    <div class="py-12 text-center text-gray-500">
                        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <p class="text-lg font-medium text-gray-700">No accounts found</p>
                        <p class="text-sm text-gray-500 mt-1">There are no accounts of type ${accountType}.</p>
                    </div>
                `;
            }
        } else {
            showErrorInModal(`Failed to load accounts: ${allAccounts.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error opening account type details:', error);
        showErrorInModal(error.message || 'An unknown error occurred');
    }
}

function renderAccountTypeDetails(accounts, accountType) {
    if (!elements.modalBody) return;
    
    elements.modalBody.innerHTML = `
        <div class="mb-4">
            <div class="flex justify-between items-center mb-4">
                <div class="text-sm text-gray-600">
                    Showing ${accounts.length} account(s) of type ${accountType}
                </div>
                <div class="flex space-x-2">
                    <button id="printAccountTypeDetails" class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 transition-colors duration-150 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print
                    </button>
                    <button id="exportAccountTypePdf" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500 focus:ring-offset-1 transition-colors duration-150 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                        Export PDF
                    </button>
                </div>
            </div>
        </div>
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Head</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit Total</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Total</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                        <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${accounts.map(account => {
                        const balance = account.balance || 0;
                        const balanceClass = balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-700';
                        const balanceLabel = balance > 0 ? 'DR' : balance < 0 ? 'CR' : '0';
                        
                        return `
                            <tr class="hover:bg-gray-50 transition-colors duration-150">
                                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${account.account_head}</td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">${formatCurrency(account.total_debit || 0)}</td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">${formatCurrency(account.total_credit || 0)}</td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${balanceClass}">${formatCurrency(Math.abs(balance))} <span class="text-xs">${balanceLabel}</span></td>
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
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Add event listeners to the view buttons using event delegation
    elements.modalBody.querySelectorAll('.view-account-btn').forEach(btn => {
        btn.removeEventListener('click', handleViewAccountClick); // Remove any existing listener
        btn.addEventListener('click', handleViewAccountClick);
    });
    
    // Add event listener for the print button
    const printBtn = document.getElementById('printAccountTypeDetails');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            printAccountTypeDetails(accounts, accountType);
        });
    }
    
    // Add event listener for the export PDF button
    const exportPdfBtn = document.getElementById('exportAccountTypePdf');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            exportAccountTypePdf(accounts, accountType);
        });
    }
}

function showErrorInModal(message) {
    if (elements.modalBody) {
        elements.modalBody.innerHTML = `
            <div class="py-12 text-center text-red-500">
                <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-lg font-medium">Error loading details</p>
                <p class="text-sm mt-1">${message}</p>
            </div>
        `;
    }
}

function printAccountTypeDetails(accounts, accountType) {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    
    // Get current firm information if available
    const firmName = document.querySelector('.firm_name') ? document.querySelector('.firm_name').textContent : 'Company';
    
    // Generate printable HTML
    const printHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${accountType} Accounts - ${firmName}</title>
            <link rel="stylesheet" href="/stylesheets/style.css">
            <link rel="stylesheet" href="/stylesheets/print-styles.css">
        </head>
        <body class="print-body">
            <div class="print-header">
                <div class="print-firm-name">${firmName}</div>
                <div class="print-report-title">ACCOUNT TYPE SUMMARY REPORT</div>
                <div class="print-account-info">Account Type: ${accountType}</div>
                <div class="print-date-info">Generated on: ${new Date().toLocaleString()}</div>
            </div>
            
            <div class="summary-info">
                <p>Showing ${accounts.length} account(s) of type ${accountType}</p>
            </div>
            
            <table class="print-table">
                <thead>
                    <tr>
                        <th class="print-th">Account Head</th>
                        <th class="print-th text-right">Debit Total</th>
                        <th class="print-th text-right">Credit Total</th>
                        <th class="print-th text-right">Balance</th>
                        <th class="print-th text-center">Type</th>
                    </tr>
                </thead>
                <tbody>
                    ${accounts.map(account => {
                        const balance = account.balance || 0;
                        const balanceClass = balance > 0 ? 'print-balance-dr' : balance < 0 ? 'print-balance-cr' : '';
                        const balanceLabel = balance > 0 ? 'DR' : balance < 0 ? 'CR' : '0';
                        
                        return `
                            <tr>
                                <td class="print-td">${account.account_head}</td>
                                <td class="print-td print-debit-amount">${formatCurrency(account.total_debit || 0)}</td>
                                <td class="print-td print-credit-amount">${formatCurrency(account.total_credit || 0)}</td>
                                <td class="print-td print-balance \${balanceClass}">${formatCurrency(Math.abs(balance))} ${balanceLabel}</td>
                                <td class="print-td text-center">${account.account_type}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <div class="print-footer">
                <p>Generated by Accounting System</p>
            </div>
        </body>
        </html>
    `;
    
    // Write the HTML to the print window
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
}

function printAccountDetails(details, accountHead, startDate, endDate) {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    
    // Get current firm information if available
    const firmName = document.querySelector('.firm_name') ? document.querySelector('.firm_name').textContent : 'Company';
    
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
    
    // Format dates for display
    const formatDateRange = () => {
        if (startDate && endDate) {
            return `${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}`;
        } else if (startDate) {
            return `From ${new Date(startDate).toLocaleDateString('en-IN')}`;
        } else if (endDate) {
            return `To ${new Date(endDate).toLocaleDateString('en-IN')}`;
        }
        return '';
    };
    
    // Generate printable HTML
    const printHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${accountHead} - Account Ledger - ${firmName}</title>
            <link rel="stylesheet" href="/stylesheets/style.css">
            <link rel="stylesheet" href="/stylesheets/print-styles.css">
        </head>
        <body class="print-body">
            <div class="print-header">
                <div class="print-firm-name">${firmName}</div>
                <div class="print-report-title">ACCOUNT LEDGER</div>
                <div class="print-account-info">Account: ${accountHead}</div>
                ${startDate || endDate ? `
                <div class="print-date-info">Date Range: ${formatDateRange()}</div>
                ` : ''}
                <div class="print-date-info">Generated on: ${new Date().toLocaleString()}</div>
            </div>
            
            <table class="print-table">
                <thead>
                    <tr>
                        <th class="print-th">Date</th>
                        <th class="print-th">Voucher No</th>
                        <th class="print-th">Voucher Type</th>
                        <th class="print-th">Narration</th>
                        <th class="print-th text-right">Debit</th>
                        <th class="print-th text-right">Credit</th>
                        <th class="print-th text-right">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    ${details.map(detail => {
                        const debitFormatted = detail.debit_amount > 0 ? formatCurrency(detail.debit_amount) : '';
                        const creditFormatted = detail.credit_amount > 0 ? formatCurrency(detail.credit_amount) : '';
                        const balanceClass = detail.balance_after > 0 ? 'print-balance-dr' : detail.balance_after < 0 ? 'print-balance-cr' : '';
                        const balanceLabel = detail.balance_after > 0 ? 'DR' : detail.balance_after < 0 ? 'CR' : '';
                        
                        return `
                            <tr>
                                <td class="print-td">${detail.transaction_date}</td>
                                <td class="print-td">${detail.voucher_no}</td>
                                <td class="print-td">${detail.voucher_type}</td>
                                <td class="print-td">${detail.narration || ''}</td>
                                <td class="print-td print-debit-amount">${debitFormatted}</td>
                                <td class="print-td print-credit-amount">${creditFormatted}</td>
                                <td class="print-td print-balance \${balanceClass}">${formatCurrency(Math.abs(detail.balance_after))} ${balanceLabel}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <div class="print-footer">
                <p>Generated by Accounting System</p>
            </div>
        </body>
        </html>
    `;
    
    // Write the HTML to the print window
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
    
    // Extract the account head from the modal title
    const accountHead = elements.modalTitle.textContent.split(' - ')[0];
    
    elements.modalBody.innerHTML = `
        <div class="mb-4">
            <div class="flex justify-between items-center mb-4">
                <div class="flex space-x-2">
                    <div class="flex items-center space-x-1">
                        <label class="text-xs font-medium text-gray-700">From:</label>
                        <input type="date" id="startDateFilter" class="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="flex items-center space-x-1">
                        <label class="text-xs font-medium text-gray-700">To:</label>
                        <input type="date" id="endDateFilter" class="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <button id="applyDateFilter" class="px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 transition-colors duration-150">
                        Apply
                    </button>
                    <button id="clearDateFilter" class="px-2 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:ring-offset-1 transition-colors duration-150">
                        Clear
                    </button>
                </div>
                <div class="flex space-x-2">
                    <button id="printAccountDetails" class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 transition-colors duration-150 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print
                    </button>
                    <button id="exportPdfBtn" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500 focus:ring-offset-1 transition-colors duration-150 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                        </svg>
                        Export PDF
                    </button>
                </div>
            </div>
        </div>
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
    
    // Add event listeners for the export PDF and print buttons
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            // Get current date range filters if they exist
            const startDate = document.getElementById('startDateFilter')?.value;
            const endDate = document.getElementById('endDateFilter')?.value;
            exportAccountLedgerPdf(accountHead, startDate, endDate);
        });
    }
    
    // Add event listener for the print button
    const printBtn = document.getElementById('printAccountDetails');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            // Get current date range filters if they exist
            const startDate = document.getElementById('startDateFilter')?.value;
            const endDate = document.getElementById('endDateFilter')?.value;
            printAccountDetails(details, accountHead, startDate, endDate);
        });
    }
    
    // Add event listeners for date filter controls
    const startDateInput = document.getElementById('startDateFilter');
    const endDateInput = document.getElementById('endDateFilter');
    const applyFilterBtn = document.getElementById('applyDateFilter');
    const clearFilterBtn = document.getElementById('clearDateFilter');
    
    if (startDateInput && endDateInput && applyFilterBtn) {
        applyFilterBtn.addEventListener('click', async () => {
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;
            
            if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
                alert('Start date cannot be greater than end date');
                return;
            }
            
            // Show loading state
            elements.modalBody.innerHTML = `
                <div class="flex flex-col items-center py-12">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                    <p class="text-gray-600">Loading filtered account details...</p>
                </div>
            `;
            
            // Reload account details with date range
            const filteredDetails = await loadAccountDetails(accountHead, startDate, endDate);
            
            if (filteredDetails.length > 0) {
                renderAccountDetails(filteredDetails);
            } else {
                elements.modalBody.innerHTML = `
                    <div class="py-12 text-center text-gray-500">
                        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <p class="text-lg font-medium text-gray-700">No transactions found</p>
                        <p class="text-sm text-gray-500 mt-1">There are no transactions recorded for this account in the selected date range.</p>
                    </div>
                `;
            }
        });
    }
    
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', async () => {
            // Clear the date inputs
            if (startDateInput) startDateInput.value = '';
            if (endDateInput) endDateInput.value = '';
            
            // Reload account details without date range
            const allDetails = await loadAccountDetails(accountHead);
            
            if (allDetails.length > 0) {
                renderAccountDetails(allDetails);
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
        });
    }
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
    
    // Tab switching
    if (elements.tab1) {
        elements.tab1.removeEventListener('click', handleTabSwitch);
        elements.tab1.addEventListener('click', handleTabSwitch);
    }
    
    if (elements.tab2) {
        elements.tab2.removeEventListener('click', handleTabSwitch);
        elements.tab2.addEventListener('click', handleTabSwitch);
    }
    
    // Export buttons
    if (elements.exportGeneralLedgerBtn) {
        elements.exportGeneralLedgerBtn.removeEventListener('click', handleExportGeneralLedger);
        elements.exportGeneralLedgerBtn.addEventListener('click', handleExportGeneralLedger);
    }
    
    if (elements.exportTrialBalanceBtn) {
        elements.exportTrialBalanceBtn.removeEventListener('click', handleExportTrialBalance);
        elements.exportTrialBalanceBtn.addEventListener('click', handleExportTrialBalance);
    }
}

function handleTabSwitch(event) {
    event.preventDefault();
    
    const tabId = event.currentTarget.dataset.tab;
    
    // Update active tab state
    state.activeTab = tabId;
    
    // Hide all tab contents
    elements.tabContent1.classList.add('hidden');
    elements.tabContent2.classList.add('hidden');
    
    // Remove active class from all tabs
    elements.tab1.classList.remove('active-tab');
    elements.tab1.classList.remove('bg-blue-50');
    elements.tab1.classList.add('inactive-tab');
    elements.tab1.classList.add('text-gray-500');
    elements.tab1.classList.add('hover:text-gray-700');
    elements.tab1.classList.add('hover:border-gray-300');
    elements.tab1.classList.remove('border-b-2');
    elements.tab1.classList.remove('border-blue-600');
    elements.tab1.classList.remove('text-blue-600');
    
    elements.tab2.classList.remove('active-tab');
    elements.tab2.classList.remove('bg-blue-50');
    elements.tab2.classList.add('inactive-tab');
    elements.tab2.classList.add('text-gray-500');
    elements.tab2.classList.add('hover:text-gray-700');
    elements.tab2.classList.add('hover:border-gray-300');
    elements.tab2.classList.remove('border-b-2');
    elements.tab2.classList.remove('border-blue-600');
    elements.tab2.classList.remove('text-blue-600');
    
    // Show selected tab content
    if (tabId === 'tab-content-1') {
        elements.tabContent1.classList.remove('hidden');
        elements.tab1.classList.remove('inactive-tab');
        elements.tab1.classList.remove('text-gray-500');
        elements.tab1.classList.remove('hover:text-gray-700');
        elements.tab1.classList.remove('hover:border-gray-300');
        elements.tab1.classList.add('active-tab');
        elements.tab1.classList.add('bg-blue-50');
        elements.tab1.classList.add('border-b-2');
        elements.tab1.classList.add('border-blue-600');
        elements.tab1.classList.add('text-blue-600');
    } else if (tabId === 'tab-content-2') {
        elements.tabContent2.classList.remove('hidden');
        elements.tab2.classList.remove('inactive-tab');
        elements.tab2.classList.remove('text-gray-500');
        elements.tab2.classList.remove('hover:text-gray-700');
        elements.tab2.classList.remove('hover:border-gray-300');
        elements.tab2.classList.add('active-tab');
        elements.tab2.classList.add('bg-blue-50');
        elements.tab2.classList.add('border-b-2');
        elements.tab2.classList.add('border-blue-600');
        elements.tab2.classList.add('text-blue-600');
        
        // Load account type summaries if not already loaded
        if (state.accountTypeSummaries.length === 0) {
            loadAccountTypeSummaries();
        }
    }
}

// Handler for export general ledger
function handleExportGeneralLedger() {
    exportGeneralLedgerPdf();
}

// Handler for export trial balance
function handleExportTrialBalance() {
    exportTrialBalancePdf();
}

// Initialize the ledger system
function initLedger() {
    console.log('Ledger: Initializing...');
    
    // Cache DOM elements
    elements = {
        accountTableBody: document.getElementById('accountTableBody'),
        accountTypeSummaryBody: document.getElementById('accountTypeSummaryBody'),
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
        totalRecords: document.getElementById('totalRecords'),
        currentPageStartDesktop: document.getElementById('currentPageStartDesktop'),
        totalRecordsDesktop: document.getElementById('totalRecordsDesktop'),
        tab1: document.getElementById('tab1'),
        tab2: document.getElementById('tab2'),
        tabContent1: document.getElementById('tab-content-1'),
        tabContent2: document.getElementById('tab-content-2'),
        exportGeneralLedgerBtn: document.getElementById('exportGeneralLedgerBtn'),
        exportTrialBalanceBtn: document.getElementById('exportTrialBalanceBtn')
    };
    
    // Validate elements exist
    const missingElements = Object.entries(elements)
        .filter(([key, value]) => !value)
        .map(([key, value]) => key);
    
    if (missingElements.length > 0) {
        console.error('Ledger: Missing required DOM elements:', missingElements);
        return;
    }
    
    // Set initial tab state
    // Initially hide both tabs
    elements.tabContent1.classList.add('hidden');
    elements.tabContent2.classList.remove('hidden'); // Show second tab by default
    
    // Update tab button states
    elements.tab1.classList.remove('active-tab');
    elements.tab1.classList.remove('bg-blue-50');
    elements.tab1.classList.add('inactive-tab');
    elements.tab1.classList.add('text-gray-500');
    elements.tab1.classList.add('hover:text-gray-700');
    elements.tab1.classList.add('hover:border-gray-300');
    elements.tab1.classList.remove('border-b-2');
    elements.tab1.classList.remove('border-blue-600');
    elements.tab1.classList.remove('text-blue-600');
    
    elements.tab2.classList.remove('inactive-tab');
    elements.tab2.classList.remove('text-gray-500');
    elements.tab2.classList.remove('hover:text-gray-700');
    elements.tab2.classList.remove('hover:border-gray-300');
    elements.tab2.classList.add('active-tab');
    elements.tab2.classList.add('bg-blue-50');
    elements.tab2.classList.add('border-b-2');
    elements.tab2.classList.add('border-blue-600');
    elements.tab2.classList.add('text-blue-600');
    
    // Load account type summaries for the second tab
    loadAccountTypeSummaries();
    
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
