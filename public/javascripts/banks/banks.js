/**
 * Bank Accounts Management JavaScript
 * Handles UI interactions for bank account management
 */

(function initBanksPage() {
    console.log('=== INITIALIZING BANKS PAGE ===');
    
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
    
    // API helper functions (following the same pattern as other JS files)
    async function apiCall(url, options = {}) {
        // Ensure window.api is available
        if (!window.api || typeof window.api.get !== 'function') {
            console.warn('window.api not available, waiting for availability');
            // Wait for window.api to become available
            let attempts = 0;
            const maxAttempts = 10; // Maximum 1 second wait (10 * 100ms)
            
            while (attempts < maxAttempts && (!window.api || typeof window.api.get !== 'function')) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.api || typeof window.api.get !== 'function') {
                console.error('window.api still not available after waiting');
                // Fall back to direct fetch
                const response = await fetch(url, {
                    method: options.method || 'GET',
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
                    body: options.body ? JSON.stringify(options.body) : undefined
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
        
        // Use window.api methods based on the HTTP method
        let response;
        if (options.method === 'POST') {
            response = await window.api.post(url, options.body);
        } else if (options.method === 'PUT') {
            response = await window.api.put(url, options.body);
        } else if (options.method === 'DELETE') {
            response = await window.api.delete(url);
        } else {
            // Default to GET
            response = await window.api.get(url);
        }
        
        if (!response) {
            throw new Error('No response received');
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;
    }

    // DOM Elements
    const bankAccountsList = document.getElementById('bankAccountsList');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const bankAccountsContainer = document.getElementById('bankAccountsContainer');
    const paginationContainer = document.getElementById('paginationContainer');
    
    // Debug: Check if DOM elements exist
    console.log('DOM Elements check:');
    console.log('- bankAccountsList:', !!bankAccountsList);
    console.log('- loadingSpinner:', !!loadingSpinner);
    console.log('- bankAccountsContainer:', !!bankAccountsContainer);
    console.log('- paginationContainer:', !!paginationContainer);
    
    if (!bankAccountsList) {
        console.error('ERROR: bankAccountsList element not found!');
    }
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationStart = document.getElementById('paginationStart');
    const paginationEnd = document.getElementById('paginationEnd');
    const paginationTotal = document.getElementById('paginationTotal');
    const paginationNav = document.getElementById('paginationNav');
    
    // Modal Elements
    const bankAccountModal = document.getElementById('bankAccountModal');
    const bankAccountForm = document.getElementById('bankAccountForm');
    const modalTitle = document.getElementById('modalTitle');
    const bankAccountIdInput = document.getElementById('bankAccountId');
    const bankNameInput = document.getElementById('bankName');
    const accountHolderNameInput = document.getElementById('accountHolderName');
    const accountNumberInput = document.getElementById('accountNumber');
    const confirmAccountNumberInput = document.getElementById('confirmAccountNumber');
    const accountTypeInput = document.getElementById('accountType');
    const ifscCodeInput = document.getElementById('ifscCode');
    const micrCodeInput = document.getElementById('micrCode');
    const branchNameInput = document.getElementById('branchName');
    const branchAddressInput = document.getElementById('branchAddress');
    const openingBalanceInput = document.getElementById('openingBalance');
    const accountStatusInput = document.getElementById('accountStatus');
    
    // Button Elements
    const openCreateBankModalBtn = document.getElementById('openCreateBankModal');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelModalBtn = document.getElementById('cancelModal');
    const saveBankAccountBtn = document.getElementById('saveBankAccountBtn');
    const applyFiltersBtn = document.getElementById('applyFilters');
    
    // Filter Elements
    const searchInput = document.getElementById('searchInput');
    const accountTypeFilter = document.getElementById('accountTypeFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    // Validate filter elements exist
    if (!searchInput) {
        console.warn('Warning: searchInput element not found');
    }
    if (!accountTypeFilter) {
        console.warn('Warning: accountTypeFilter element not found');
    }
    if (!statusFilter) {
        console.warn('Warning: statusFilter element not found');
    }
    
    // Transaction Modal Elements
    const bankTransactionModal = document.getElementById('bankTransactionModal');
    const bankTransactionForm = document.getElementById('bankTransactionForm');
    const transactionModalTitle = document.getElementById('transactionModalTitle');
    const transactionBankAccountId = document.getElementById('transactionBankAccountId');
    const transactionType = document.getElementById('transactionType');
    const transactionDescription = document.getElementById('transactionDescription');
    const transactionAmount = document.getElementById('transactionAmount');
    const transferToSection = document.getElementById('transferToSection');
    const transferToAccount = document.getElementById('transferToAccount');
    const transactionDate = document.getElementById('transactionDate');
    const executeTransactionBtn = document.getElementById('executeTransactionBtn');
    
    // Transaction Button Elements
    const transactionButtons = document.getElementById('transactionButtons');
    const depositBtn = document.getElementById('depositBtn');
    const withdrawBtn = document.getElementById('withdrawBtn');
    const transferBtn = document.getElementById('transferBtn');
    
    // Validate transaction button elements
    if (!transactionButtons) {
        console.warn('Warning: transactionButtons element not found');
    }
    if (!depositBtn) {
        console.warn('Warning: depositBtn element not found');
    }
    if (!withdrawBtn) {
        console.warn('Warning: withdrawBtn element not found');
    }
    if (!transferBtn) {
        console.warn('Warning: transferBtn element not found');
    }
    
    // Transaction Modal Button Elements
    const closeTransactionModalBtn = document.getElementById('closeTransactionModal');
    const cancelTransactionModalBtn = document.getElementById('cancelTransactionModal');
    
    // Validate transaction modal button elements
    if (!closeTransactionModalBtn) {
        console.warn('Warning: closeTransactionModalBtn element not found');
    }
    if (!cancelTransactionModalBtn) {
        console.warn('Warning: cancelTransactionModalBtn element not found');
    }
    
    // Pagination Variables
    let currentPage = 1;
    let totalPages = 1;
    let totalRecords = 0;
    const limit = 10;
    
    // Event Listeners
    if (openCreateBankModalBtn) openCreateBankModalBtn.addEventListener('click', openCreateModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
    if (bankAccountForm) bankAccountForm.addEventListener('submit', handleFormSubmit);
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', loadBankAccounts);
    
    // Transaction Modal Event Listeners
    if (closeTransactionModalBtn) closeTransactionModalBtn.addEventListener('click', closeTransactionModal);
    if (cancelTransactionModalBtn) cancelTransactionModalBtn.addEventListener('click', closeTransactionModal);
    if (bankTransactionForm) bankTransactionForm.addEventListener('submit', handleTransactionSubmit);
    
    // Transaction Button Event Listeners
    if (depositBtn) depositBtn.addEventListener('click', () => openTransactionModal('deposit'));
    if (withdrawBtn) withdrawBtn.addEventListener('click', () => openTransactionModal('withdrawal'));
    if (transferBtn) transferBtn.addEventListener('click', () => openTransactionModal('transfer'));
    
    // Add event delegation for dynamically generated buttons in the bank accounts table
    if (bankAccountsList) bankAccountsList.addEventListener('click', function(e) {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const action = button.getAttribute('data-action');
        const accountId = button.getAttribute('data-account-id');
        
        switch(action) {
            case 'record-transaction':
                const transactionType = button.getAttribute('data-transaction-type');
                recordBankTransaction(parseInt(accountId), transactionType);
                break;
            case 'view-account':
                window.viewBankAccount(parseInt(accountId));
                break;
            case 'edit-account':
                window.editBankAccount(parseInt(accountId));
                break;
            case 'delete-account':
                window.deleteBankAccount(parseInt(accountId));
                break;
        }
    });
    
    /**
     * Load bank accounts with pagination and filtering
     */
    async function loadBankAccounts() {
        showLoading();
        
        try {
            const params = new URLSearchParams({
                page: currentPage,
                limit: limit
            });
            
            console.log('API Params:', params.toString());
            
            // Add filters if present
            if (searchInput && searchInput.value && searchInput.value.trim()) {
                params.append('search', searchInput.value.trim());
            }
            
            if (accountTypeFilter && accountTypeFilter.value) {
                params.append('account_type', accountTypeFilter.value);
            }
            
            if (statusFilter && statusFilter.value) {
                params.append('account_status', statusFilter.value);
            }
            
            const apiUrl = `/banks?${params.toString()}`;
            console.log('Making API call to:', apiUrl);
            
            const response = await apiCall(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('API Response received:', response);
            
            if (response.bankAccounts) {
                const { bankAccounts, page, totalPages: responseTotalPages, total, limit: responseLimit } = response;
                
                currentPage = page;
                totalPages = responseTotalPages;
                totalRecords = total;
                
                renderBankAccounts(bankAccounts);
                renderPagination();
                hideLoading();
            } else {
                showToast(response.error || 'Failed to load bank accounts', 'error');
                hideLoading();
            }
        } catch (error) {
            console.error('Error loading bank accounts:', error);
            showToast('An error occurred while loading bank accounts', 'error');
            hideLoading();
        }
    }
    
    /**
     * Render bank accounts in the table
     */
    function renderBankAccounts(accounts) {
        if (!accounts || accounts.length === 0) {
            bankAccountsList.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-4 text-center text-gray-500">
                        No bank accounts found
                    </td>
                </tr>
            `;
            return;
        }
        
        bankAccountsList.innerHTML = accounts.map(account => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${escapeHtml(account.bank_name)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500">${maskAccountNumber(escapeHtml(account.account_number))}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500">${escapeHtml(account.account_type || 'N/A')}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500">${escapeHtml(account.ifsc_code || 'N/A')}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500">${escapeHtml(account.branch_name || 'N/A')}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${account.account_status === 'Active' ? 'bg-green-100 text-green-800' : 
                          account.account_status === 'Inactive' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}">
                        ${escapeHtml(account.account_status)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ₹${parseFloat(account.current_balance || 0).toFixed(2)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button data-action="record-transaction" data-account-id="${account.id}" data-transaction-type="deposit" class="text-green-600 hover:text-green-900 mr-2">Deposit</button>
                    <button data-action="record-transaction" data-account-id="${account.id}" data-transaction-type="withdrawal" class="text-yellow-600 hover:text-yellow-900 mr-2">Withdraw</button>
                    <button data-action="record-transaction" data-account-id="${account.id}" data-transaction-type="transfer" class="text-purple-600 hover:text-purple-900 mr-3">Transfer</button>
                    <button data-action="view-account" data-account-id="${account.id}" class="text-indigo-600 hover:text-indigo-900 mr-2">View</button>
                    <button data-action="edit-account" data-account-id="${account.id}" class="text-blue-600 hover:text-blue-900 mr-2">Edit</button>
                    <button data-action="delete-account" data-account-id="${account.id}" class="text-red-600 hover:text-red-900">Delete</button>
                </td>
            </tr>
        `).join('');
        
    }
    
    /**
     * Render pagination controls
     */
    function renderPagination() {
        if (totalPages <= 1) {
            paginationContainer.classList.add('hidden');
            return;
        }
        
        paginationContainer.classList.remove('hidden');
        
        // Update pagination info
        const start = (currentPage - 1) * limit + 1;
        const end = Math.min(currentPage * limit, totalRecords);
        paginationStart.textContent = start;
        paginationEnd.textContent = end;
        paginationTotal.textContent = totalRecords;
        
        // Generate pagination buttons
        paginationNav.innerHTML = '';
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.className = `relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`;
        prevButton.innerHTML = '&laquo; Prev';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => goToPage(currentPage - 1));
        paginationNav.appendChild(prevButton);
        
        // Page buttons
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = `relative inline-flex items-center px-4 py-2 border text-sm font-medium ${i === currentPage ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`;
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => goToPage(i));
            paginationNav.appendChild(pageButton);
        }
        
        // Next button
        const nextButton = document.createElement('button');
        nextButton.className = `relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`;
        nextButton.innerHTML = 'Next &raquo;';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => goToPage(currentPage + 1));
        paginationNav.appendChild(nextButton);
    }
    
    /**
     * Navigate to a specific page
     */
    function goToPage(page) {
        if (page < 1 || page > totalPages || page === currentPage) {
            return;
        }
        
        currentPage = page;
        loadBankAccounts();
    }
    
    /**
     * Open the create bank account modal
     */
    function openCreateModal() {
        // Reset form
        bankAccountForm.reset();
        bankAccountIdInput.value = '';
        modalTitle.textContent = 'Create Bank Account';
        saveBankAccountBtn.textContent = 'Create Bank Account';
        
        // Reset validation states
        clearValidationErrors();
        
        // Show modal
        bankAccountModal.classList.remove('hidden');
    }
    
    /**
     * Open the edit bank account modal
     */
    async function openEditModal(accountId) {
        try {
            const response = await apiCall(`/banks/${accountId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.id) {
                const account = response;
                
                // Populate form with account data
                bankAccountIdInput.value = account.id;
                bankNameInput.value = account.bank_name || '';
                accountHolderNameInput.value = account.account_holder_name || '';
                accountNumberInput.value = account.account_number || '';
                confirmAccountNumberInput.value = account.account_number || '';
                accountTypeInput.value = account.account_type || 'Savings';
                ifscCodeInput.value = account.ifsc_code || '';
                micrCodeInput.value = account.micr_code || '';
                branchNameInput.value = account.branch_name || '';
                branchAddressInput.value = account.branch_address || '';
                openingBalanceInput.value = account.opening_balance || '0';
                accountStatusInput.value = account.account_status || 'Active';
                
                modalTitle.textContent = 'Edit Bank Account';
                saveBankAccountBtn.textContent = 'Update Bank Account';
                
                // Reset validation states
                clearValidationErrors();
                
                // Show modal
                bankAccountModal.classList.remove('hidden');
            } else {
                showToast(response.error || 'Failed to load bank account details', 'error');
            }
        } catch (error) {
            console.error('Error loading bank account details:', error);
            showToast('An error occurred while loading bank account details', 'error');
        }
    }
    
    /**
     * Close the modal
     */
    function closeModal() {
        bankAccountModal.classList.add('hidden');
    }
    
    /**
     * Handle form submission (create/update)
     */
    async function handleFormSubmit(event) {
        event.preventDefault();
        
        // Get form data
        const formData = {
            bank_name: bankNameInput.value.trim(),
            account_holder_name: accountHolderNameInput.value.trim(),
            account_number: accountNumberInput.value.trim(),
            confirm_account_number: confirmAccountNumberInput.value.trim(),
            account_type: accountTypeInput.value,
            ifsc_code: ifscCodeInput.value.trim(),
            micr_code: micrCodeInput.value.trim(),
            branch_name: branchNameInput.value.trim(),
            branch_address: branchAddressInput.value.trim(),
            opening_balance: openingBalanceInput.value,
            account_status: accountStatusInput.value
        };
        
        // Validate form
        if (!validateForm(formData)) {
            return;
        }
        
        // Disable button during submission
        saveBankAccountBtn.disabled = true;
        saveBankAccountBtn.textContent = 'Saving...';
        
        try {
            const accountId = bankAccountIdInput.value;
            let response;
            
            if (accountId) {
                // Update existing bank account
                response = await apiCall(`/banks/${accountId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        bank_name: formData.bank_name,
                        account_holder_name: formData.account_holder_name,
                        account_number: formData.account_number,
                        account_type: formData.account_type,
                        ifsc_code: formData.ifsc_code,
                        micr_code: formData.micr_code,
                        branch_name: formData.branch_name,
                        branch_address: formData.branch_address,
                        account_status: formData.account_status
                    })
                });
            } else {
                // Create new bank account
                response = await apiCall('/banks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        bank_name: formData.bank_name,
                        account_holder_name: formData.account_holder_name,
                        account_number: formData.account_number,
                        account_type: formData.account_type,
                        ifsc_code: formData.ifsc_code,
                        micr_code: formData.micr_code,
                        branch_name: formData.branch_name,
                        branch_address: formData.branch_address,
                        opening_balance: parseFloat(formData.opening_balance) || 0
                    })
                });
            }
            
            if (response.message) {
                showToast(
                    accountId ? 'Bank account updated successfully' : 'Bank account created successfully', 
                    'success'
                );
                
                // Reset form and close modal
                bankAccountForm.reset();
                closeModal();
                
                // Reload the bank accounts list
                loadBankAccounts();
            } else {
                showToast(response.error || 'Operation failed', 'error');
            }
        } catch (error) {
            console.error('Error saving bank account:', error);
            showToast('An error occurred while saving the bank account', 'error');
        } finally {
            // Re-enable button
            saveBankAccountBtn.disabled = false;
            saveBankAccountBtn.textContent = accountId ? 'Update Bank Account' : 'Create Bank Account';
        }
    }
    
    /**
     * Validate form data
     */
    function validateForm(data) {
        clearValidationErrors();
        let isValid = true;
        
        // Validate required fields
        if (!data.bank_name) {
            showError('bankName', 'Bank name is required');
            isValid = false;
        }
        
        if (!data.account_number) {
            showError('accountNumber', 'Account number is required');
            isValid = false;
        }
        
        // Validate account number match
        if (data.account_number !== data.confirm_account_number) {
            showError('confirmAccountNumber', 'Account numbers do not match');
            isValid = false;
        }
        
        // Validate IFSC code format if provided (should be 11 characters: 4 letters, 5 digits, 2 letters)
        if (data.ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifsc_code.toUpperCase())) {
            showError('ifscCode', 'Invalid IFSC code format (e.g., ABCD0123456)');
            isValid = false;
        }
        
        // Validate MICR code format if provided (should be 9 digits)
        if (data.micr_code && !/^\d{9}$/.test(data.micr_code)) {
            showError('micrCode', 'Invalid MICR code format (9 digits)');
            isValid = false;
        }
        
        // Validate opening balance if provided
        if (data.opening_balance && isNaN(parseFloat(data.opening_balance))) {
            showError('openingBalance', 'Opening balance must be a valid number');
            isValid = false;
        }
        
        return isValid;
    }
    
    /**
     * Show error for a specific field
     */
    function showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        field.classList.add('border-red-500');
        
        // Create error element if it doesn't exist
        let errorElement = document.querySelector(`#${fieldId}-error`);
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = `${fieldId}-error`;
            errorElement.className = 'text-red-500 text-sm mt-1';
            field.parentNode.insertBefore(errorElement, field.nextSibling);
        }
        
        errorElement.textContent = message;
    }
    
    /**
     * Clear validation errors
     */
    function clearValidationErrors() {
        // Remove error classes and error messages
        document.querySelectorAll('.border-red-500').forEach(element => {
            element.classList.remove('border-red-500');
        });
        
        document.querySelectorAll('[id$="-error"]').forEach(element => {
            element.remove();
        });
    }
    
    /**
     * View bank account details (placeholder)
     */
    window.viewBankAccount = function(accountId) {
        // This could open a detailed view modal or navigate to a detail page
        alert(`View bank account with ID: ${accountId}`);
    };
    
    /**
     * Record a bank transaction
     */
    window.recordBankTransaction = function(accountId, type) {
        // Set the account ID in the transaction modal
        transactionBankAccountId.value = accountId;
        
        // Open the transaction modal
        openTransactionModal(type);
    };
    
    /**
     * Edit bank account
     */
    window.editBankAccount = function(accountId) {
        openEditModal(accountId);
    };
    
    /**
     * Delete bank account
     */
    window.deleteBankAccount = function(accountId) {
        if (confirm('Are you sure you want to delete this bank account? This action cannot be undone.')) {
            deleteBankAccountConfirmed(accountId);
        }
    };
    
    /**
     * Confirm and delete bank account
     */
    async function deleteBankAccountConfirmed(accountId) {
        try {
            const response = await apiCall(`/banks/${accountId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.message) {
                showToast('Bank account deleted successfully', 'success');
                loadBankAccounts(); // Reload the list
            } else {
                showToast(response.error || 'Failed to delete bank account', 'error');
            }
        } catch (error) {
            console.error('Error deleting bank account:', error);
            showToast('An error occurred while deleting the bank account', 'error');
        }
    }
    
    /**
     * Show loading spinner
     */
    function showLoading() {
        loadingSpinner.classList.remove('hidden');
        bankAccountsContainer.classList.add('hidden');
    }
    
    /**
     * Hide loading spinner
     */
    function hideLoading() {
        loadingSpinner.classList.add('hidden');
        bankAccountsContainer.classList.remove('hidden');
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Mask account number (show only first 4 and last 4 digits)
     */
    function maskAccountNumber(accountNumber) {
        if (!accountNumber || accountNumber.length <= 8) {
            return accountNumber;
        }
        
        const firstFour = accountNumber.substring(0, 4);
        const lastFour = accountNumber.substring(accountNumber.length - 4);
        const middleMask = 'XXXXXX'; // Fixed mask for middle portion
        
        return `${firstFour}${middleMask}${lastFour}`;
    }
    
    /**
     * Open the transaction modal
     */
    function openTransactionModal(type) {
        // Set transaction type
        transactionType.value = type;
        
        // Set modal title based on transaction type
        let title = 'Bank Transaction';
        if (type === 'deposit') {
            title = 'Bank Deposit';
        } else if (type === 'withdrawal') {
            title = 'Bank Withdrawal';
        } else if (type === 'transfer') {
            title = 'Bank Transfer';
        }
        transactionModalTitle.textContent = title;
        
        // Show/hide transfer section based on type
        if (type === 'transfer') {
            transferToSection.classList.remove('hidden');
            loadBankAccountsForTransfer();
        } else {
            transferToSection.classList.add('hidden');
        }
        
        // Set default transaction date to today
        const today = new Date().toISOString().split('T')[0];
        transactionDate.value = today;
        
        // Reset form
        transactionDescription.value = '';
        transactionAmount.value = '';
        
        // Show modal
        bankTransactionModal.classList.remove('hidden');
    }
    
    /**
     * Close the transaction modal
     */
    function closeTransactionModal() {
        bankTransactionModal.classList.add('hidden');
    }
    
    /**
     * Load bank accounts for transfer
     */
    async function loadBankAccountsForTransfer() {
        try {
            const response = await apiCall('/banks', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.bankAccounts) {
                const accounts = response.bankAccounts;
                
                // Clear existing options except the first one
                transferToAccount.innerHTML = '<option value="">Select destination account</option>';
                
                // Add options for each bank account
                accounts.forEach(account => {
                    // Skip the current account (from account)
                    // Convert both to numbers for proper comparison
                    if (parseInt(account.id) != parseInt(transactionBankAccountId.value)) {
                        const option = document.createElement('option');
                        option.value = account.id;
                        option.textContent = `${account.bank_name} - ${maskAccountNumber(account.account_number)}`;
                        transferToAccount.appendChild(option);
                    }
                });
            } else {
                showToast(response.error || 'Failed to load bank accounts for transfer', 'error');
            }
        } catch (error) {
            console.error('Error loading bank accounts for transfer:', error);
            showToast('An error occurred while loading bank accounts for transfer', 'error');
        }
    }
    
    /**
     * Handle transaction form submission
     */
    async function handleTransactionSubmit(event) {
        event.preventDefault();
        
        const type = transactionType.value;
        const bankAccountId = transactionBankAccountId.value;
        const description = transactionDescription.value.trim();
        const amount = transactionAmount.value;
        const date = transactionDate.value;
        
        // Validate form
        if (!validateTransactionForm(type, bankAccountId, description, amount, date)) {
            return;
        }
        
        // Disable button during submission
        executeTransactionBtn.disabled = true;
        executeTransactionBtn.textContent = 'Processing...';
        
        try {
            let endpoint = '';
            let payload = {};
            
            if (type === 'deposit') {
                endpoint = '/bank-transactions/deposit';
                payload = {
                    bank_account_id: bankAccountId,
                    amount: amount,
                    description: description,
                    transaction_date: date
                };
            } else if (type === 'withdrawal') {
                endpoint = '/bank-transactions/withdrawal';
                payload = {
                    bank_account_id: bankAccountId,
                    amount: amount,
                    description: description,
                    transaction_date: date
                };
            } else if (type === 'transfer') {
                const toAccountId = transferToAccount.value;
                if (!toAccountId) {
                    showToast('Please select a destination account for transfer', 'error');
                    return;
                }
                
                endpoint = '/bank-transactions/transfer';
                payload = {
                    from_bank_account_id: bankAccountId,
                    to_bank_account_id: toAccountId,
                    amount: amount,
                    description: description,
                    transaction_date: date
                };
            }
            
            const response = await apiCall(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (response.message) {
                showToast(
                    type === 'deposit' ? 'Deposit recorded successfully' :
                    type === 'withdrawal' ? 'Withdrawal recorded successfully' :
                    'Transfer recorded successfully',
                    'success'
                );
                
                // Close modal and reload bank accounts
                closeTransactionModal();
                loadBankAccounts();
            } else {
                showToast(response.error || 'Transaction failed', 'error');
            }
        } catch (error) {
            console.error('Error processing transaction:', error);
            showToast('An error occurred while processing the transaction', 'error');
        } finally {
            // Re-enable button
            executeTransactionBtn.disabled = false;
            executeTransactionBtn.textContent = 'Execute Transaction';
        }
    }
    
    /**
     * Validate transaction form
     */
    function validateTransactionForm(type, bankAccountId, description, amount, date) {
        clearTransactionValidationErrors();
        let isValid = true;
        
        if (!bankAccountId) {
            showTransactionError('transactionAmount', 'Bank account is not selected');
            isValid = false;
        }
        
        if (!description) {
            showTransactionError('transactionDescription', 'Description is required');
            isValid = false;
        }
        
        if (!amount || parseFloat(amount) <= 0) {
            showTransactionError('transactionAmount', 'Valid positive amount is required');
            isValid = false;
        }
        
        if (!date) {
            showTransactionError('transactionDate', 'Transaction date is required');
            isValid = false;
        }
        
        if (type === 'transfer') {
            if (!transferToAccount.value) {
                showTransactionError('transferToAccount', 'Destination account is required for transfer');
                isValid = false;
            }
            
            if (transferToAccount.value == bankAccountId) {
                showTransactionError('transferToAccount', 'Destination account cannot be the same as source account');
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    /**
     * Show error for a transaction field
     */
    function showTransactionError(fieldId, message) {
        const field = document.getElementById(fieldId);
        field.classList.add('border-red-500');
        
        // Create error element if it doesn't exist
        let errorElement = document.querySelector(`#${fieldId}-transaction-error`);
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = `${fieldId}-transaction-error`;
            errorElement.className = 'text-red-500 text-sm mt-1';
            field.parentNode.insertBefore(errorElement, field.nextSibling);
        }
        
        errorElement.textContent = message;
    }
    
    /**
     * Clear transaction validation errors
     */
    function clearTransactionValidationErrors() {
        // Remove error classes and error messages
        document.querySelectorAll('.border-red-500').forEach(element => {
            element.classList.remove('border-red-500');
        });
        
        document.querySelectorAll('[id$="-transaction-error"]').forEach(element => {
            element.remove();
        });
    }

    // Initialize the page when the function runs
    console.log('=== CALLING loadBankAccounts from initBanksPage ===');
    loadBankAccounts();

})();

// Also expose the function globally for AJAX navigation
window.initBanksPage = typeof initBanksPage !== 'undefined' ? initBanksPage : function() {
    // If called via AJAX navigation, re-initialize
    console.log('Reinitializing banks page via AJAX navigation');
    if (typeof loadBankAccounts === 'function') {
        loadBankAccounts();
    }
};