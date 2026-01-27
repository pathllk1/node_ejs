/**
 * Journal Entries Page JavaScript
 * Handles general journal entry functionality
 */

let journalEntriesPageInitialized = false; // Flag to prevent multiple initializations

function initJournalEntriesPage() {
    // Prevent multiple initializations
    if (journalEntriesPageInitialized) {
        console.log('Journal entries page already initialized, skipping duplicate initialization');
        return;
    }
    
    // DOM Elements
    const journalEntryForm = document.getElementById('journalEntryForm');
    const transactionDateInput = document.getElementById('transactionDate');
    const overallNarrationInput = document.getElementById('overallNarration');
    const journalEntryLines = document.getElementById('journalEntryLines');
    const addLineBtn = document.getElementById('addLineBtn');
    const submitJournalEntryBtn = document.getElementById('submitJournalEntry');
    const resetFormBtn = document.getElementById('resetForm');
    const journalEntriesTableBody = document.getElementById('journalEntriesTableBody');
    const searchJournalEntriesInput = document.getElementById('searchJournalEntries');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const currentPageSpan = document.getElementById('currentPage');
    const paginationInfo = document.getElementById('paginationInfo');
    const totalEntriesEl = document.getElementById('total-entries');
    const recentEntriesEl = document.getElementById('recent-entries');
    
    // State
    let currentPage = 1;
    const itemsPerPage = 10;
    
    // Check if all required DOM elements exist before initializing
    const requiredElements = [
        journalEntryForm, transactionDateInput, overallNarrationInput, 
        journalEntryLines, addLineBtn, submitJournalEntryBtn,
        resetFormBtn, journalEntriesTableBody, searchJournalEntriesInput,
        prevPageBtn, nextPageBtn, currentPageSpan, paginationInfo,
        totalEntriesEl, recentEntriesEl
    ];
    
    const hasMissingElements = requiredElements.some(el => !el);
    if (hasMissingElements) {
        console.warn('Some required DOM elements not found, deferring initialization');
        // Retry initialization after a short delay to handle potential timing issues
        setTimeout(() => {
            if (document.getElementById('journalEntriesTableBody')) {
                initJournalEntriesPage(); // Re-attempt initialization
            }
        }, 100);
        return;
    }
    
    // Mark as initialized to prevent multiple runs
    journalEntriesPageInitialized = true;
    
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
    
    async function apiPutJson(url, body) {
        // Ensure window.api is available
        if (!window.api || typeof window.api.put !== 'function') {
            console.warn('window.api.put not available, waiting for availability');
            // Wait for window.api to become available
            let attempts = 0;
            const maxAttempts = 10; // Maximum 1 second wait (10 * 100ms)
            
            while (attempts < maxAttempts && (!window.api || typeof window.api.put !== 'function')) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.api || typeof window.api.put !== 'function') {
                console.error('window.api.put still not available after waiting');
                // Fall back to direct fetch
                const response = await fetch(url, {
                    method: 'PUT',
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
        
        const response = await window.api.put(url, body);
        
        if (!response) {
            throw new Error('No response received');
        }

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }

        return result;
    }
    
    async function apiDeleteJson(url) {
        // Ensure window.api is available
        if (!window.api || typeof window.api.delete !== 'function') {
            console.warn('window.api.delete not available, waiting for availability');
            // Wait for window.api to become available
            let attempts = 0;
            const maxAttempts = 10; // Maximum 1 second wait (10 * 100ms)
            
            while (attempts < maxAttempts && (!window.api || typeof window.api.delete !== 'function')) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.api || typeof window.api.delete !== 'function') {
                console.error('window.api.delete still not available after waiting');
                // Fall back to direct fetch
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
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
                    }
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
        
        const response = await window.api.delete(url);
        
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
            
            // Add event listeners for journal entry lines
            addLineBtn.addEventListener('click', function() {
                if (typeof window.addJournalEntryLine === 'function' && typeof apiGetJson === 'function') {
                    window.addJournalEntryLine(apiGetJson);
                } else {
                    console.error('addJournalEntryLine or apiGetJson not available');
                }
            });
            
            // Add event listener for form submission
            journalEntryForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                // Disable submit button
                submitJournalEntryBtn.disabled = true;
                submitJournalEntryBtn.textContent = 'Processing...';
                
                try {
                    // Collect form data
                    const formData = new FormData(journalEntryForm);
                    const journalEntryData = Object.fromEntries(formData);
                    
                    // Get all journal entry lines
                    const lines = [];
                    const lineElements = document.querySelectorAll('.journal-entry-line');
                    
                    lineElements.forEach((line, index) => {
                        const accountHeadInput = line.querySelector('input[name="account_head"]');
                        const accountHead = accountHeadInput ? accountHeadInput.value : '';
                        
                        const accountTypeInput = line.querySelector('input[name="account_type"]');
                        const accountType = accountTypeInput ? accountTypeInput.value : 'GENERAL';
                        
                        const debitInput = line.querySelector('input[name="debit_amount"]');
                        const debitAmount = debitInput ? parseFloat(debitInput.value) || 0 : 0;
                        
                        const creditInput = line.querySelector('input[name="credit_amount"]');
                        const creditAmount = creditInput ? parseFloat(creditInput.value) || 0 : 0;
                        
                        const narrationInput = line.querySelector('input[name="line_narration"]');
                        const lineNarration = narrationInput ? narrationInput.value : '';
                        
                        if (accountHead || debitAmount > 0 || creditAmount > 0) {
                            lines.push({
                                account_head: accountHead,
                                account_type: accountType,
                                debit_amount: debitAmount,
                                credit_amount: creditAmount,
                                narration: lineNarration
                            });
                        }
                    });
                    
                    // Validate that we have at least one line
                    if (lines.length === 0) {
                        throw new Error('At least one journal entry line is required');
                    }
                    
                    // Prepare the full journal entry data
                    const fullJournalEntryData = {
                        entries: lines,
                        narration: journalEntryData.narration,
                        transaction_date: journalEntryData.transaction_date
                    };
                    
                    // Make API call to create journal entry
                    await apiPostJson('/ledger/api/journal-entries', fullJournalEntryData);
                    
                    showToast('Journal entry created successfully!', 'success');
                    
                    // Reset form
                    journalEntryForm.reset();
                    transactionDateInput.valueAsDate = new Date();
                    
                    // Clear all lines except the first one
                    while (journalEntryLines.children.length > 1) {
                        journalEntryLines.removeChild(journalEntryLines.lastChild);
                    }
                    
                    // Recalculate totals
                    recalculateTotals();
                    
                    // Reload journal entries
                    await loadJournalEntries(currentPage);
                    
                    // Reload summary stats
                    await loadSummaryStats();
                } catch (error) {
                    console.error('Error creating journal entry:', error);
                    showToast(`Error: ${error.message}`, 'error');
                } finally {
                    // Re-enable submit button
                    submitJournalEntryBtn.disabled = false;
                    submitJournalEntryBtn.textContent = 'Record Journal Entry';
                }
            });
            
            // Add event listener for reset button
            resetFormBtn.addEventListener('click', function() {
                journalEntryForm.reset();
                transactionDateInput.valueAsDate = new Date();
                
                // Clear all lines except the first one
                while (journalEntryLines.children.length > 1) {
                    journalEntryLines.removeChild(journalEntryLines.lastChild);
                }
                
                // Recalculate totals
                if (typeof window.recalculateTotals === 'function') {
                    window.recalculateTotals();
                }
            });
            
            // Add event listener for search
            searchJournalEntriesInput.addEventListener('input', function() {
                // Debounce search
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    loadJournalEntries(1); // Reset to first page on search
                }, 500);
            });
            
            // Add event listeners for pagination
            prevPageBtn.addEventListener('click', function() {
                if (currentPage > 1) {
                    loadJournalEntries(currentPage - 1);
                }
            });
            
            nextPageBtn.addEventListener('click', function() {
                loadJournalEntries(currentPage + 1);
            });
            
            // Initialize date to today
            transactionDateInput.valueAsDate = new Date();
            
            // Add event listeners to existing input fields (the default line)
            const existingLines = document.querySelectorAll('.journal-entry-line');
            existingLines.forEach(line => {
                const debitInput = line.querySelector('input[name="debit_amount"]');
                const creditInput = line.querySelector('input[name="credit_amount"]');
                
                if (debitInput) {
                    debitInput.addEventListener('input', window.recalculateTotals);
                }
                if (creditInput) {
                    creditInput.addEventListener('input', window.recalculateTotals);
                }
            });
            
            // Load initial data
            await loadJournalEntries(1);
            await loadSummaryStats();
            
            // Initially calculate totals to set the proper button state
            if (typeof window.recalculateTotals === 'function') {
                window.recalculateTotals();
            }
        } catch (error) {
            console.error('Error initializing page:', error);
            showToast('Error initializing page', 'error');
        }
    }
    
    function addJournalEntryLine() {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'journal-entry-line bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-indigo-300 transition-colors duration-200';
        lineDiv.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div class="md:col-span-5">
                    <label class="block text-xs font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                        <span>Account</span>
                    </label>
                    <div class="autocomplete-wrapper relative">
                        <input type="text" name="account_head" required placeholder="Search or enter account name" class="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white autocomplete-input">
                        <div class="autocomplete-suggestions absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 hidden max-h-60 overflow-y-auto"></div>
                    </div>
                </div>
                
                <div class="md:col-span-2">
                    <label class="block text-xs font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"></path>
                        </svg>
                        <span>Type</span>
                    </label>
                    <input type="text" name="account_type" placeholder="Account type" class="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white" readonly>
                </div>
                
                <div class="md:col-span-2">
                    <label class="block text-xs font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                        <span>Debit</span>
                    </label>
                    <input type="number" name="debit_amount" step="0.01" placeholder="0.00" class="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white">
                </div>
                
                <div class="md:col-span-2">
                    <label class="block text-xs font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                        <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m0 0l-4-4m4 4l4-4"></path>
                        </svg>
                        <span>Credit</span>
                    </label>
                    <input type="number" name="credit_amount" step="0.01" placeholder="0.00" class="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white">
                </div>
                
                <div class="md:col-span-1 flex items-end pb-3">
                    <button type="button" class="remove-line-btn w-full py-3 px-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="mt-4 pt-4 border-t border-gray-200">
                <label class="block text-xs font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                    </svg>
                    <span>Line Narration</span>
                </label>
                <input type="text" name="line_narration" placeholder="Line-specific narration" class="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white">
            </div>
        `;
        
        journalEntryLines.appendChild(lineDiv);
        
        // Add event listener to the remove button
        const removeBtn = lineDiv.querySelector('.remove-line-btn');
        removeBtn.addEventListener('click', function() {
            if (journalEntryLines.children.length > 1) { // Don't remove the last line
                lineDiv.remove();
                recalculateTotals();
            }
        });
        
        // Add event listeners to the inputs for real-time total calculation
        const debitInput = lineDiv.querySelector('input[name="debit_amount"]');
        const creditInput = lineDiv.querySelector('input[name="credit_amount"]');
        
        debitInput.addEventListener('input', window.recalculateTotals);
        creditInput.addEventListener('input', window.recalculateTotals);
    }
    
    // Make recalculateTotals globally accessible
    window.recalculateTotals = function() {
        let totalDebits = 0;
        let totalCredits = 0;
        
        const lineElements = document.querySelectorAll('.journal-entry-line');
        lineElements.forEach(line => {
            const debitInput = line.querySelector('input[name="debit_amount"]');
            const creditInput = line.querySelector('input[name="credit_amount"]');
            
            const debitValue = parseFloat(debitInput.value) || 0;
            const creditValue = parseFloat(creditInput.value) || 0;
            
            totalDebits += debitValue;
            totalCredits += creditValue;
        });
        
        // Update the totals display
        const totalDebitsElement = document.getElementById('totalDebits');
        const totalCreditsElement = document.getElementById('totalCredits');
        if (totalDebitsElement) totalDebitsElement.textContent = `₹${totalDebits.toFixed(2)}`;
        if (totalCreditsElement) totalCreditsElement.textContent = `₹${totalCredits.toFixed(2)}`;
        
        // Update the detailed balance status
        const debitsAmountElement = document.getElementById('debits-amount');
        const creditsAmountElement = document.getElementById('credits-amount');
        const differenceAmountElement = document.getElementById('difference-amount');
        if (debitsAmountElement) debitsAmountElement.textContent = `₹${totalDebits.toFixed(2)}`;
        if (creditsAmountElement) creditsAmountElement.textContent = `₹${totalCredits.toFixed(2)}`;
        if (differenceAmountElement) differenceAmountElement.textContent = `₹${Math.abs(totalDebits - totalCredits).toFixed(2)}`;
        
        // Update summary display elements
        const totalDebitsDisplay = document.getElementById('total-debits-display');
        const totalCreditsDisplay = document.getElementById('total-credits-display');
        if (totalDebitsDisplay) {
            totalDebitsDisplay.textContent = `₹${totalDebits.toFixed(2)}`;
        }
        if (totalCreditsDisplay) {
            totalCreditsDisplay.textContent = `₹${totalCredits.toFixed(2)}`;
        }
        
        // Update the balance status
        const difference = Math.abs(totalDebits - totalCredits);
        const statusElement = document.getElementById('balanceStatus');
        
        if (statusElement) {
            // Style the status based on balance
            if (Math.abs(difference) < 0.01) { // Allow for small rounding differences
                statusElement.className = 'mt-2 p-2 rounded text-center font-medium text-green-600 bg-green-50';
                statusElement.textContent = `Debits: ₹${totalDebits.toFixed(2)} | Credits: ₹${totalCredits.toFixed(2)} | Difference: ₹${difference.toFixed(2)} (Balanced)`;
                
                // Enable the submit button when balanced
                if (submitJournalEntryBtn) submitJournalEntryBtn.disabled = false;
            } else {
                statusElement.className = 'mt-2 p-2 rounded text-center font-medium text-red-600 bg-red-50';
                statusElement.textContent = `Debits: ₹${totalDebits.toFixed(2)} | Credits: ₹${totalCredits.toFixed(2)} | Difference: ₹${difference.toFixed(2)} (Unbalanced)`;
                
                // Disable the submit button when unbalanced
                if (submitJournalEntryBtn) submitJournalEntryBtn.disabled = true;
            }
        }
    }
    
    async function loadJournalEntries(page = 1) {
        try {
            const search = searchJournalEntriesInput.value.trim();
            
            let url = `/ledger/api/journal-entries?page=${page}&limit=${itemsPerPage}`;
            
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }
            
            const data = await apiGetJson(url);
            
            // Update pagination
            currentPage = page;
            currentPageSpan.textContent = page;
            
            // Update table
            renderJournalEntriesTable(data.journalEntries);
            
            // Update pagination info
            const totalItems = data.total || 0;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            
            paginationInfo.textContent = `Showing ${Math.min((page - 1) * itemsPerPage + 1, totalItems)} to ${Math.min(page * itemsPerPage, totalItems)} of ${totalItems}`;
            
            // Update pagination buttons
            prevPageBtn.disabled = page <= 1;
            nextPageBtn.disabled = page >= totalPages || data.journalEntries.length < itemsPerPage;
        } catch (error) {
            console.error('Error loading journal entries:', error);
            showToast('Error loading journal entries', 'error');
            
            // Show empty state
            journalEntriesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-red-500">
                        Error loading journal entries: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
    
    function renderJournalEntriesTable(entries) {
        if (!entries || entries.length === 0) {
            journalEntriesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                        No journal entries found
                    </td>
                </tr>
            `;
            return;
        }
        
        journalEntriesTableBody.innerHTML = entries.map(entry => {
            const entryDate = new Date(entry.transaction_date).toLocaleDateString('en-IN');
            const formattedDebit = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(entry.total_debit || 0);
            
            const formattedCredit = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(entry.total_credit || 0);
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${entry.voucher_no || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${entryDate}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${entry.narration || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">${formattedDebit}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">${formattedCredit}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button data-entry-id="${entry.id}" class="edit-entry-btn text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
                        <button data-entry-id="${entry.id}" class="view-entry-btn text-blue-600 hover:text-blue-900 mr-3">View</button>
                        <button data-entry-id="${entry.id}" class="delete-entry-btn text-red-600 hover:text-red-900">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Attach event listeners using event delegation
        attachJournalEntryActionListeners();
    }
    
    function attachJournalEntryActionListeners() {
        // Remove old listeners if any
        const oldViewButtons = journalEntriesTableBody.querySelectorAll('.view-entry-btn');
        const oldDeleteButtons = journalEntriesTableBody.querySelectorAll('.delete-entry-btn');
        
        oldViewButtons.forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        oldDeleteButtons.forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        // Attach new listeners
        journalEntriesTableBody.querySelectorAll('.edit-entry-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const entryId = this.getAttribute('data-entry-id');
                editJournalEntry(entryId);
            });
        });
        
        journalEntriesTableBody.querySelectorAll('.view-entry-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const entryId = this.getAttribute('data-entry-id');
                viewJournalEntry(entryId);
            });
        });
        
        journalEntriesTableBody.querySelectorAll('.delete-entry-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const entryId = this.getAttribute('data-entry-id');
                deleteJournalEntry(entryId);
            });
        });
    }
    
    async function loadSummaryStats() {
        try {
            const summary = await apiGetJson('/ledger/api/journal-entries/summary');
            
            // Update summary cards
            if (totalEntriesEl) totalEntriesEl.textContent = summary.total_journal_entries || 0;
            if (recentEntriesEl) recentEntriesEl.textContent = summary.recent_journal_entries_count || 0;
            
            // Update total debits and credits displays if they exist
            const totalDebitsDisplay = document.getElementById('total-debits-display');
            const totalCreditsDisplay = document.getElementById('total-credits-display');
            
            if (totalDebitsDisplay || totalCreditsDisplay) {
                // We'll update this with the current form values after initial setup
                setTimeout(() => {
                    recalculateTotals();
                }, 100);
            }
        } catch (error) {
            console.error('Error loading summary stats:', error);
            // Don't show error to user for summary stats, just log it
        }
    }
    
    // Function to view a journal entry
    function viewJournalEntry(id) {
        alert(`View journal entry details for ID: ${id}`);
        // In a real implementation, this would open a modal or navigate to a detail page
    }
    
    // Function to delete a journal entry
    async function deleteJournalEntry(id) {
        if (!confirm('Are you sure you want to delete this journal entry? This action cannot be undone.')) {
            return;
        }
        
        try {
            await apiDeleteJson(`/ledger/api/journal-entries/${id}`);
            showToast('Journal entry deleted successfully!', 'success');
            
            // Reload journal entries
            await loadJournalEntries(currentPage);
            
            // Reload summary stats
            await loadSummaryStats();
        } catch (error) {
            console.error('Error deleting journal entry:', error);
            showToast(`Error deleting journal entry: ${error.message}`, 'error');
        }
    }
    
    // Function to edit a journal entry
    async function editJournalEntry(id) {
        try {
            // Fetch the journal entry details
            const entryData = await apiGetJson(`/ledger/api/journal-entries/${id}`);
            
            // Open the edit modal and populate it with data
            openEditJournalEntryModal(entryData);
        } catch (error) {
            console.error('Error loading journal entry for edit:', error);
            showToast(`Error loading journal entry: ${error.message}`, 'error');
        }
    }
    
    // Function to open the edit modal
    function openEditJournalEntryModal(entryData) {
        const modal = document.getElementById('editJournalEntryModal');
        const form = document.getElementById('editJournalEntryForm');
        const linesContainer = document.getElementById('editJournalEntryLines');
        
        if (!modal || !form || !linesContainer) {
            console.error('Edit modal elements not found');
            return;
        }
        
        // Reset form
        form.reset();
        
        // Set the entry ID
        document.getElementById('editJournalEntryId').value = entryData.id;
        
        // Populate form fields
        document.getElementById('editTransactionDate').value = entryData.transaction_date.split('T')[0];
        document.getElementById('editOverallNarration').value = entryData.narration || '';
        
        // Clear existing lines
        linesContainer.innerHTML = '';
        
        // Add lines
        if (entryData.entries && entryData.entries.length > 0) {
            entryData.entries.forEach(entry => {
                addEditLine(entry);
            });
        } else {
            // Add at least one empty line if no entries
            addEditLine();
        }
        
        // Recalculate totals
        recalculateEditTotals();
        
        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Add event listeners for the edit modal
        attachEditModalEventListeners();
    }
    
    // Function to add a line to the edit modal
    function addEditLine(entry = null) {
        const linesContainer = document.getElementById('editJournalEntryLines');
        if (!linesContainer) return;
        
        const lineDiv = document.createElement('div');
        lineDiv.className = 'journal-entry-line bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-indigo-300 transition-colors duration-200';
        lineDiv.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div class="md:col-span-5">
                    <label class="block text-xs font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                        <span>Account</span>
                    </label>
                    <div class="autocomplete-wrapper relative">
                        <input type="text" name="account_head" required placeholder="Search or enter account name" class="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white autocomplete-input" value="${entry?.account_head || ''}">
                        <div class="autocomplete-suggestions absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 hidden max-h-60 overflow-y-auto"></div>
                    </div>
                </div>
                
                <div class="md:col-span-2">
                    <label class="block text-xs font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"></path>
                        </svg>
                        <span>Type</span>
                    </label>
                    <input type="text" name="account_type" placeholder="Account type" class="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white" readonly value="${entry?.account_type || 'GENERAL'}">
                </div>
                
                <div class="md:col-span-2">
                    <label class="block text-xs font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                        <span>Debit</span>
                    </label>
                    <input type="number" name="debit_amount" step="0.01" placeholder="0.00" class="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white" value="${entry?.debit_amount || 0}">
                </div>
                
                <div class="md:col-span-2">
                    <label class="block text-xs font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                        <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m0 0l-4-4m4 4l4-4"></path>
                        </svg>
                        <span>Credit</span>
                    </label>
                    <input type="number" name="credit_amount" step="0.01" placeholder="0.00" class="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white" value="${entry?.credit_amount || 0}">
                </div>
                
                <div class="md:col-span-1 flex items-end pb-3">
                    <button type="button" class="remove-edit-line-btn w-full py-3 px-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="mt-4 pt-4 border-t border-gray-200">
                <label class="block text-xs font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                    </svg>
                    <span>Line Narration</span>
                </label>
                <input type="text" name="line_narration" placeholder="Line-specific narration" class="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white" value="${entry?.narration || ''}">
            </div>
        `;
        
        linesContainer.appendChild(lineDiv);
        
        // Add event listeners
        const removeBtn = lineDiv.querySelector('.remove-edit-line-btn');
        const debitInput = lineDiv.querySelector('input[name="debit_amount"]');
        const creditInput = lineDiv.querySelector('input[name="credit_amount"]');
        
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                if (linesContainer.children.length > 1) {
                    lineDiv.remove();
                    recalculateEditTotals();
                }
            });
        }
        
        if (debitInput) {
            debitInput.addEventListener('input', recalculateEditTotals);
        }
        
        if (creditInput) {
            creditInput.addEventListener('input', recalculateEditTotals);
        }
        
        // Initialize autocomplete
        const autocompleteInput = lineDiv.querySelector('.autocomplete-input');
        if (autocompleteInput && typeof apiGetJson === 'function') {
            setupAutocomplete(autocompleteInput, apiGetJson);
        }
    }
    
    // Function to recalculate totals in edit modal
    function recalculateEditTotals() {
        let totalDebits = 0;
        let totalCredits = 0;
        
        const linesContainer = document.getElementById('editJournalEntryLines');
        if (!linesContainer) return;
        
        const lineElements = linesContainer.querySelectorAll('.journal-entry-line');
        lineElements.forEach(line => {
            const debitInput = line.querySelector('input[name="debit_amount"]');
            const creditInput = line.querySelector('input[name="credit_amount"]');
            
            const debitValue = parseFloat(debitInput?.value) || 0;
            const creditValue = parseFloat(creditInput?.value) || 0;
            
            totalDebits += debitValue;
            totalCredits += creditValue;
        });
        
        // Update totals display
        const totalDebitsElement = document.getElementById('editTotalDebits');
        const totalCreditsElement = document.getElementById('editTotalCredits');
        const debitsAmountElement = document.getElementById('editDebitsAmount');
        const creditsAmountElement = document.getElementById('editCreditsAmount');
        const differenceAmountElement = document.getElementById('editDifferenceAmount');
        const balanceStatusElement = document.getElementById('editBalanceStatus');
        
        if (totalDebitsElement) totalDebitsElement.textContent = `₹${totalDebits.toFixed(2)}`;
        if (totalCreditsElement) totalCreditsElement.textContent = `₹${totalCredits.toFixed(2)}`;
        if (debitsAmountElement) debitsAmountElement.textContent = `₹${totalDebits.toFixed(2)}`;
        if (creditsAmountElement) creditsAmountElement.textContent = `₹${totalCredits.toFixed(2)}`;
        if (differenceAmountElement) differenceAmountElement.textContent = `₹${Math.abs(totalDebits - totalCredits).toFixed(2)}`;
        
        // Update save button state
        const saveBtn = document.getElementById('saveEditBtn');
        const difference = Math.abs(totalDebits - totalCredits);
        
        if (balanceStatusElement) {
            if (Math.abs(difference) < 0.01) {
                balanceStatusElement.className = 'mt-4 p-4 rounded-xl text-center font-bold text-lg border-2 bg-green-50 border-green-200 text-green-800';
                balanceStatusElement.innerHTML = `<div class="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-4">
                    <div class="flex items-center space-x-2">
                        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                        <span>Debits: <span class="font-extrabold">₹${totalDebits.toFixed(2)}</span></span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m0 0l-4-4m4 4l4-4"></path>
                        </svg>
                        <span>Credits: <span class="font-extrabold">₹${totalCredits.toFixed(2)}</span></span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                        <span>Difference: <span class="font-extrabold">₹${difference.toFixed(2)}</span> (Balanced)</span>
                    </div>
                </div>`;
                
                if (saveBtn) saveBtn.disabled = false;
            } else {
                balanceStatusElement.className = 'mt-4 p-4 rounded-xl text-center font-bold text-lg border-2 bg-red-50 border-red-200 text-red-800';
                balanceStatusElement.innerHTML = `<div class="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-4">
                    <div class="flex items-center space-x-2">
                        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                        <span>Debits: <span class="font-extrabold">₹${totalDebits.toFixed(2)}</span></span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m0 0l-4-4m4 4l4-4"></path>
                        </svg>
                        <span>Credits: <span class="font-extrabold">₹${totalCredits.toFixed(2)}</span></span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                        <span>Difference: <span class="font-extrabold">₹${difference.toFixed(2)}</span> (Unbalanced)</span>
                    </div>
                </div>`;
                
                if (saveBtn) saveBtn.disabled = true;
            }
        }
    }
    
    // Function to attach event listeners for edit modal
    function attachEditModalEventListeners() {
        const addEditLineBtn = document.getElementById('addEditLineBtn');
        const closeEditModalBtn = document.getElementById('closeEditModal');
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        const editJournalEntryForm = document.getElementById('editJournalEntryForm');
        
        if (addEditLineBtn) {
            addEditLineBtn.onclick = function() {
                addEditLine();
                recalculateEditTotals();
            };
        }
        
        if (closeEditModalBtn) {
            closeEditModalBtn.onclick = function() {
                document.getElementById('editJournalEntryModal').classList.add('hidden');
                document.getElementById('editJournalEntryModal').classList.remove('flex');
            };
        }
        
        if (cancelEditBtn) {
            cancelEditBtn.onclick = function() {
                document.getElementById('editJournalEntryModal').classList.add('hidden');
                document.getElementById('editJournalEntryModal').classList.remove('flex');
            };
        }
        
        if (editJournalEntryForm) {
            editJournalEntryForm.onsubmit = handleEditJournalEntrySubmit;
        }
    }
    
    // Function to handle edit form submission
    async function handleEditJournalEntrySubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const journalEntryId = document.getElementById('editJournalEntryId').value;
        
        if (!journalEntryId) {
            showToast('Error: No journal entry ID found', 'error');
            return;
        }
        
        try {
            // Disable submit button
            const saveBtn = document.getElementById('saveEditBtn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<div class="flex items-center space-x-2">
                <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span>Saving...</span>
            </div>`;
            
            // Collect form data
            const transactionDate = document.getElementById('editTransactionDate').value;
            const overallNarration = document.getElementById('editOverallNarration').value;
            
            // Get all journal entry lines
            const lines = [];
            const linesContainer = document.getElementById('editJournalEntryLines');
            const lineElements = linesContainer.querySelectorAll('.journal-entry-line');
            
            lineElements.forEach((line, index) => {
                const accountHeadInput = line.querySelector('input[name="account_head"]');
                const accountHead = accountHeadInput ? accountHeadInput.value : '';
                
                const accountTypeInput = line.querySelector('input[name="account_type"]');
                const accountType = accountTypeInput ? accountTypeInput.value : 'GENERAL';
                
                const debitInput = line.querySelector('input[name="debit_amount"]');
                const debitAmount = debitInput ? parseFloat(debitInput.value) || 0 : 0;
                
                const creditInput = line.querySelector('input[name="credit_amount"]');
                const creditAmount = creditInput ? parseFloat(creditInput.value) || 0 : 0;
                
                const narrationInput = line.querySelector('input[name="line_narration"]');
                const lineNarration = narrationInput ? narrationInput.value : '';
                
                if (accountHead || debitAmount > 0 || creditAmount > 0) {
                    lines.push({
                        account_head: accountHead,
                        account_type: accountType,
                        debit_amount: debitAmount,
                        credit_amount: creditAmount,
                        narration: lineNarration
                    });
                }
            });
            
            // Validate that we have at least one line
            if (lines.length === 0) {
                throw new Error('At least one journal entry line is required');
            }
            
            // Prepare the full journal entry data
            const journalEntryData = {
                entries: lines,
                narration: overallNarration,
                transaction_date: transactionDate
            };
            
            // Make API call to update journal entry
            await apiPutJson(`/ledger/api/journal-entries/${journalEntryId}`, journalEntryData);
            
            showToast('Journal entry updated successfully!', 'success');
            
            // Close modal
            document.getElementById('editJournalEntryModal').classList.add('hidden');
            document.getElementById('editJournalEntryModal').classList.remove('flex');
            
            // Reload journal entries
            await loadJournalEntries(currentPage);
            
            // Reload summary stats
            await loadSummaryStats();
        } catch (error) {
            console.error('Error updating journal entry:', error);
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            // Re-enable submit button
            const saveBtn = document.getElementById('saveEditBtn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = `<div class="flex items-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Save Changes</span>
                </div>`;
            }
        }
    }
    
    // Add event listeners to existing line removal buttons
    document.querySelectorAll('.remove-line-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const lineDiv = this.closest('.journal-entry-line');
            if (document.querySelectorAll('.journal-entry-line').length > 1) { // Don't remove the last line
                lineDiv.remove();
                recalculateTotals();
            }
        });
    });
    
    // Add event listeners to existing line inputs for real-time total calculation
    document.querySelectorAll('.journal-entry-line input[name="debit_amount"], .journal-entry-line input[name="credit_amount"]').forEach(input => {
        input.addEventListener('input', recalculateTotals);
    });
    

    
    // Initial calculation
    recalculateTotals();
    
    // Initialize autocomplete for existing account inputs
    initializeAutocomplete(apiGetJson);
}

// Autocomplete functionality
let autocompleteTimeout;

function initializeAutocomplete(apiGetJson) {
    // Add event listeners for autocomplete to existing inputs
    document.querySelectorAll('.autocomplete-input').forEach(input => {
        setupAutocomplete(input, apiGetJson);
    });
}

function setupAutocomplete(inputElement, apiGetJson) {
let suggestionsDiv = inputElement.nextElementSibling;

// Create suggestions div if it doesn't exist
if (!suggestionsDiv || !suggestionsDiv.classList.contains('autocomplete-suggestions')) {
    suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'autocomplete-suggestions absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 hidden max-h-60 overflow-y-auto';
    inputElement.parentNode.appendChild(suggestionsDiv);
}

// Event listeners for autocomplete
inputElement.addEventListener('input', function() {
    const value = this.value.trim();
    
    // Clear previous timeout
    clearTimeout(autocompleteTimeout);
    
    // Hide suggestions if input is empty
    if (value.length === 0) {
        hideSuggestions(suggestionsDiv);
        return;
    }
    
    // Debounce the API call
    autocompleteTimeout = setTimeout(async () => {
        try {
            const response = await apiGetJson(`/ledger/api/account-suggestions?q=${encodeURIComponent(value)}`);
            if (response && Array.isArray(response)) {
                showSuggestions(response, suggestionsDiv, inputElement);
            }
        } catch (error) {
            console.error('Error fetching account suggestions:', error);
        }
    }, 300);
});

// Hide suggestions when clicking outside
document.addEventListener('click', function(e) {
    if (!inputElement.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        hideSuggestions(suggestionsDiv);
    }
});
}

function showSuggestions(suggestions, suggestionsDiv, inputElement) {
    if (suggestions.length === 0) {
        hideSuggestions(suggestionsDiv);
        return;
    }
    
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.classList.remove('hidden');
    
    suggestions.forEach(suggestion => {
        const suggestionElement = document.createElement('div');
        suggestionElement.className = 'px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 flex justify-between items-center';
        suggestionElement.innerHTML = `
            <div>
                <div class="font-medium text-gray-900">${suggestion.account_head}</div>
                <div class="text-sm text-gray-500">${suggestion.account_type}</div>
            </div>
            <div class="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                ${suggestion.account_type}
            </div>
        `;
        
        suggestionElement.addEventListener('click', function() {
            // Set the input value
            inputElement.value = suggestion.account_head;
            
            // Find the corresponding account type input and set it
            const lineDiv = inputElement.closest('.journal-entry-line');
            if (lineDiv) {
                const accountTypeInput = lineDiv.querySelector('input[name="account_type"]');
                if (accountTypeInput) {
                    // Set the account type directly from the suggestion
                    accountTypeInput.value = suggestion.account_type;
                }
            }
            
            // Hide suggestions
            hideSuggestions(suggestionsDiv);
            
            // Trigger input event to recalculate totals if needed
            if (typeof window.recalculateTotals === 'function') {
                window.recalculateTotals();
            }
        });
        
        suggestionsDiv.appendChild(suggestionElement);
    });
}

function hideSuggestions(suggestionsDiv) {
    suggestionsDiv.classList.add('hidden');
}



// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJournalEntriesPage);
} else {
    initJournalEntriesPage();
}

// Global function for adding journal entry line with autocomplete
window.addJournalEntryLine = function(apiGetJson) {
    const journalEntryLines = document.getElementById('journalEntryLines');
    const lineDiv = document.createElement('div');
    lineDiv.className = 'journal-entry-line bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-indigo-300 transition-colors duration-200';
    lineDiv.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div class="md:col-span-5">
                <label class="block text-xs font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                    <span>Account</span>
                </label>
                <div class="autocomplete-wrapper relative">
                    <input type="text" name="account_head" required placeholder="Search or enter account name" class="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white autocomplete-input">
                    <div class="autocomplete-suggestions absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 hidden max-h-60 overflow-y-auto"></div>
                </div>
            </div>
            
            <div class="md:col-span-2">
                <label class="block text-xs font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"></path>
                    </svg>
                    <span>Type</span>
                </label>
                <input type="text" name="account_type" placeholder="Account type" class="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white" readonly>
            </div>
            
            <div class="md:col-span-2">
                <label class="block text-xs font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                    <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                    </svg>
                    <span>Debit</span>
                </label>
                <input type="number" name="debit_amount" step="0.01" placeholder="0.00" class="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white">
            </div>
            
            <div class="md:col-span-2">
                <label class="block text-xs font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                    <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m0 0l-4-4m4 4l4-4"></path>
                    </svg>
                    <span>Credit</span>
                </label>
                <input type="number" name="credit_amount" step="0.01" placeholder="0.00" class="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white">
            </div>
            
            <div class="md:col-span-1 flex items-end pb-3">
                <button type="button" class="remove-line-btn w-full py-3 px-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
        
        <div class="mt-4 pt-4 border-t border-gray-200">
            <label class="block text-xs font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                </svg>
                <span>Line Narration</span>
            </label>
            <input type="text" name="line_narration" placeholder="Line-specific narration" class="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white">
        </div>
    `;
     
    journalEntryLines.appendChild(lineDiv);
    
    // Add event listener to the remove button
    const removeBtn = lineDiv.querySelector('.remove-line-btn');
    removeBtn.addEventListener('click', function() {
        if (journalEntryLines.children.length > 1) { // Don't remove the last line
            lineDiv.remove();
            // Recalculate totals after removal
            if (typeof window.recalculateTotals === 'function') {
                window.recalculateTotals();
            }
        }
    });
    
    // Add event listeners to the inputs for real-time total calculation
    const debitInput = lineDiv.querySelector('input[name="debit_amount"]');
    const creditInput = lineDiv.querySelector('input[name="credit_amount"]');
    
    if (debitInput) {
        debitInput.addEventListener('input', window.recalculateTotals);
    }
    if (creditInput) {
        creditInput.addEventListener('input', window.recalculateTotals);
    }
    
    // Set up autocomplete for the new input
    const newInput = lineDiv.querySelector('.autocomplete-input');
    if (newInput && typeof setupAutocomplete === 'function') {
        setupAutocomplete(newInput, apiGetJson);
    }
};

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
