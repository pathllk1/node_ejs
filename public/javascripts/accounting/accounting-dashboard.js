// Accounting Dashboard JavaScript
console.log('Accounting dashboard script loaded');

// Wait for Chart.js to be loaded before initializing
function initializeAccountingDashboard() {
    // Load real accounting data
    loadAccountingStats();
    loadAccountingCharts();
    loadRecentTransactions();
    loadAccountSummary();
}

// Check if Chart.js is loaded, if not wait and retry
function checkChartJsLoaded() {
    if (typeof Chart !== 'undefined') {
        console.log('Chart.js is loaded, initializing dashboard');
        initializeAccountingDashboard();
    } else {
        console.log('Chart.js not loaded yet, waiting...');
        setTimeout(checkChartJsLoaded, 100); // Check again in 100ms
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded, checking Chart.js availability');
    checkChartJsLoaded();
});

async function loadAccountingStats() {
    try {
        // Fetch accounting statistics from existing API
        const response = await window.api.get('/api/dashboard/accounting/stats');
        if (response.ok) {
            const data = await response.json();
            
            document.getElementById('totalRevenue').textContent = data.totalRevenue ? `₹${parseInt(data.totalRevenue).toLocaleString()}` : '₹0';
            document.getElementById('totalExpenses').textContent = data.totalExpenses ? `₹${parseInt(data.totalExpenses).toLocaleString()}` : '₹0';
            document.getElementById('netProfit').textContent = data.netProfit ? `₹${parseInt(data.netProfit).toLocaleString()}` : '₹0';
            document.getElementById('outstandingReceivables').textContent = data.outstandingReceivables ? `₹${parseInt(data.outstandingReceivables).toLocaleString()}` : '₹0';
        }
    } catch (error) {
        console.error('Error loading accounting stats:', error);
        
        // Fallback to sample data if API fails
        document.getElementById('totalRevenue').textContent = '₹4,58,200';
        document.getElementById('totalExpenses').textContent = '₹2,85,400';
        document.getElementById('netProfit').textContent = '₹1,72,800';
        document.getElementById('outstandingReceivables').textContent = '₹67,350';
    }
}

async function loadAccountingCharts() {
    try {
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library not loaded');
            return;
        }
        
        // Fetch data for charts from existing API
        const response = await window.api.get('/api/dashboard/accounting/charts');
        if (response.ok) {
            const data = await response.json();
            
            // Debug logging
            console.log('Received accounting chart data:', data);
            
            // Create Revenue vs Expenses Chart
            console.log('Attempting to create revenue vs expenses chart...');
            console.log('Canvas element exists?', !!document.getElementById('revenueExpensesChart'));
            console.log('Data available?', !!data.revenueExpenses);
            console.log('Categories:', data.revenueExpenses.categories);
            console.log('Revenue:', data.revenueExpenses.revenue);
            console.log('Expenses:', data.revenueExpenses.expenses);
            
            const revenueExpensesCanvas = document.getElementById('revenueExpensesChart');
            if (!revenueExpensesCanvas) {
                console.error('Revenue vs Expenses canvas element not found');
                return;
            }
            
            const revenueExpensesCtx = revenueExpensesCanvas.getContext('2d');
            if (data.revenueExpenses) {
                console.log('Creating revenue vs expenses chart with data');
                
                // Destroy existing chart instance if it exists
                if (window.revenueExpensesChartInstance) {
                    console.log('Destroying existing revenue chart instance');
                    window.revenueExpensesChartInstance.destroy();
                }
                
                try {
                    window.revenueExpensesChartInstance = new Chart(revenueExpensesCtx, {
                        type: 'line',
                        data: {
                            labels: data.revenueExpenses.categories || [],
                            datasets: [
                                {
                                    label: 'Revenue',
                                    data: data.revenueExpenses.revenue || [],
                                    borderColor: '#10b981',
                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    fill: true,
                                    tension: 0.4
                                },
                                {
                                    label: 'Expenses',
                                    data: data.revenueExpenses.expenses || [],
                                    borderColor: '#ef4444',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    fill: true,
                                    tension: 0.4
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: function(value) {
                                            return '₹' + value.toLocaleString();
                                        }
                                    }
                                }
                            }
                        }
                    });
                    console.log('Revenue vs expenses chart created successfully');
                } catch (chartError) {
                    console.error('Error creating revenue vs expenses chart:', chartError);
                }
            } else {
                console.warn('No revenueExpenses data available');
            }

            // Create Cash Flow Chart
            console.log('Attempting to create cash flow chart...');
            console.log('Cash flow canvas element exists?', !!document.getElementById('cashFlowChart'));
            console.log('Cash flow data available?', !!data.cashFlow);
            console.log('Cash flow categories:', data.cashFlow.categories);
            console.log('Cash flow data:', data.cashFlow.data);
            
            const cashFlowCanvas = document.getElementById('cashFlowChart');
            if (!cashFlowCanvas) {
                console.error('Cash Flow canvas element not found');
                return;
            }
            
            const cashFlowCtx = cashFlowCanvas.getContext('2d');
            if (data.cashFlow) {
                console.log('Creating cash flow chart with data');
                
                // Destroy existing chart instance if it exists
                if (window.cashFlowChartInstance) {
                    console.log('Destroying existing cash flow chart instance');
                    window.cashFlowChartInstance.destroy();
                }
                
                try {
                    window.cashFlowChartInstance = new Chart(cashFlowCtx, {
                        type: 'bar',
                        data: {
                            labels: data.cashFlow.categories || [],
                            datasets: [{
                                label: 'Cash Flow',
                                data: data.cashFlow.data || [],
                                backgroundColor: '#8b5cf6',
                                borderWidth: 0
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: function(value) {
                                            return '₹' + value.toLocaleString();
                                        }
                                    }
                                }
                            }
                        }
                    });
                    console.log('Cash flow chart created successfully');
                } catch (chartError) {
                    console.error('Error creating cash flow chart:', chartError);
                }
            } else {
                console.warn('No cashFlow data available');
            }
        }
    } catch (error) {
        console.error('Error loading accounting data:', error);
        // Log more details for debugging
        console.error('Full error details:', error.message, error.stack);
    }
}

async function loadRecentTransactions() {
    try {
        // Fetch recent transactions
        const response = await window.api.get('/api/dashboard/accounting/recent-transactions');
        if (response.ok) {
            const data = await response.json();
            
            const transactionsContainer = document.getElementById('recentTransactions');
            if (transactionsContainer && data.transactions) {
                transactionsContainer.innerHTML = '';
                
                data.transactions.forEach(transaction => {
                    const transactionEl = document.createElement('div');
                    transactionEl.className = `flex items-center justify-between p-3 ${transaction.bgColor || 'bg-gray-50'} rounded-lg border ${transaction.borderColor || 'border-gray-100'}`;
                    transactionEl.innerHTML = `
                        <div class="flex items-center">
                            <div class="w-10 h-10 ${transaction.iconBgColor || 'bg-gray-100'} rounded-full flex items-center justify-center mr-3">
                                <svg class="w-5 h-5 ${transaction.iconColor || 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${transaction.iconPath || 'M5 13l4 4L19 7'}"></path>
                                </svg>
                            </div>
                            <div>
                                <p class="font-medium text-gray-800">${transaction.title}</p>
                                <p class="text-sm text-gray-500">${transaction.description}</p>
                            </div>
                        </div>
                        <span class="${transaction.amountColor || 'text-gray-600'} font-semibold">${transaction.amount}</span>
                    `;
                    transactionsContainer.appendChild(transactionEl);
                });
            }
        }
    } catch (error) {
        console.error('Error loading recent transactions:', error);
        // Keep the placeholder content if API fails
    }
}

async function loadAccountSummary() {
    try {
        // Fetch account summary
        const response = await window.api.get('/api/dashboard/accounting/account-summary');
        if (response.ok) {
            const data = await response.json();
            
            const summaryContainer = document.getElementById('accountSummary');
            if (summaryContainer && data.accounts) {
                summaryContainer.innerHTML = '';
                
                data.accounts.forEach(account => {
                    const accountEl = document.createElement('div');
                    accountEl.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
                    accountEl.innerHTML = `
                        <div>
                            <p class="font-medium">${account.name}</p>
                            <p class="text-sm text-gray-500">${account.description}</p>
                        </div>
                        <span class="font-semibold text-gray-800">${account.balance}</span>
                    `;
                    summaryContainer.appendChild(accountEl);
                });
            }
        }
    } catch (error) {
        console.error('Error loading account summary:', error);
        // Keep the placeholder content if API fails
    }
}

