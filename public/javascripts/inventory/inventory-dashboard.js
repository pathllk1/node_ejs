// Inventory Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Load real inventory data
    loadInventoryStats();
    loadInventoryCharts();
    loadRecentActivity();
    loadTopProducts();
});

async function loadInventoryStats() {
    try {
        // Fetch inventory statistics from existing API
        const response = await window.api.get('/api/dashboard/inventory/stats');
        if (response.ok) {
            const data = await response.json();
            
            document.getElementById('totalProducts').textContent = data.totalProducts || '0';
            document.getElementById('lowStockItems').textContent = data.lowStockItems || '0';
            document.getElementById('totalQuantity').textContent = data.totalQuantity || '0';
            document.getElementById('expiringSoon').textContent = data.expiringSoon || '0';
        }
    } catch (error) {
        console.error('Error loading inventory stats:', error);
        
        // Fallback to sample data if API fails
        document.getElementById('totalProducts').textContent = '1,248';
        document.getElementById('lowStockItems').textContent = '23';
        document.getElementById('totalQuantity').textContent = '15,642';
        document.getElementById('expiringSoon').textContent = '8';
    }
}

async function loadInventoryCharts() {
    try {
        // Fetch data for charts from existing API
        const response = await window.api.get('/api/dashboard/inventory/charts');
        if (response.ok) {
            const data = await response.json();
            
            // Create Inventory Value Chart
            const inventoryValueCtx = document.getElementById('inventoryValueChart').getContext('2d');
            if (data.valueDistribution) {
                new Chart(inventoryValueCtx, {
                    type: 'doughnut',
                    data: {
                        labels: data.valueDistribution.labels || [],
                        datasets: [{
                            data: data.valueDistribution.series || [],
                            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            }
                        }
                    }
                });
            }

            // Create Stock Levels Chart
            const stockLevelsCtx = document.getElementById('stockLevelsChart').getContext('2d');
            if (data.stockLevels) {
                new Chart(stockLevelsCtx, {
                    type: 'bar',
                    data: {
                        labels: data.stockLevels.categories || [],
                        datasets: [{
                            label: 'Products',
                            data: data.stockLevels.data || [],
                            backgroundColor: '#3b82f6',
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading inventory data:', error);
        // Keep default data if API fails
    }
}

async function loadRecentActivity() {
    try {
        // Fetch recent inventory activity
        const response = await window.api.get('/api/dashboard/inventory/recent-activity');
        if (response.ok) {
            const data = await response.json();
            
            const activityContainer = document.getElementById('recentActivity');
            if (activityContainer && data.activity) {
                activityContainer.innerHTML = '';
                
                data.activity.forEach(activity => {
                    const activityEl = document.createElement('div');
                    activityEl.className = 'flex items-center p-3 bg-gray-50 rounded-lg';
                    activityEl.innerHTML = `
                        <div class="w-2 h-2 ${activity.color || 'bg-blue-500'} rounded-full mr-3"></div>
                        <div class="flex-1">
                            <p class="text-sm font-medium">${activity.title}</p>
                            <p class="text-xs text-gray-500">${activity.description}</p>
                        </div>
                        <span class="text-xs text-gray-500">${activity.time}</span>
                    `;
                    activityContainer.appendChild(activityEl);
                });
            }
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        // Keep the placeholder content if API fails
    }
}

async function loadTopProducts() {
    try {
        // Fetch top products
        const response = await window.api.get('/api/dashboard/inventory/top-products');
        if (response.ok) {
            const data = await response.json();
            
            const productsContainer = document.getElementById('topProducts');
            if (productsContainer && data.products) {
                productsContainer.innerHTML = '';
                
                data.products.forEach(product => {
                    const productEl = document.createElement('div');
                    productEl.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
                    productEl.innerHTML = `
                        <div>
                            <p class="font-medium">${product.name}</p>
                            <p class="text-sm text-gray-500">${product.category}</p>
                        </div>
                        <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">${product.quantity} units</span>
                    `;
                    productsContainer.appendChild(productEl);
                });
            }
        }
    } catch (error) {
        console.error('Error loading top products:', error);
        // Keep the placeholder content if API fails
    }
}

function createFallbackInventoryCharts() {
    // Inventory Value Chart
    const inventoryValueOptions = {
        chart: {
            type: 'donut',
            height: '100%'
        },
        series: [44, 55, 13, 33],
        labels: ['Electronics', 'Clothing', 'Home Goods', 'Other'],
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
        responsive: [{
            breakpoint: 480,
            options: {
                chart: {
                    width: 200
                },
                legend: {
                    position: 'bottom'
                }
            }
        }]
    };

    const inventoryValueChart = new ApexCharts(document.querySelector("#inventoryValueChart"), inventoryValueOptions);
    inventoryValueChart.render();

    // Stock Levels Chart
    const stockLevelsOptions = {
        chart: {
            type: 'bar',
            height: '100%'
        },
        series: [{
            name: 'Products',
            data: [400, 430, 448, 470, 540, 580, 690, 1100, 1200, 1380]
        }],
        xaxis: {
            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
        },
        colors: ['#3b82f6'],
        plotOptions: {
            bar: {
                borderRadius: 4,
                horizontal: false,
            }
        }
    };

    const stockLevelsChart = new ApexCharts(document.querySelector("#stockLevelsChart"), stockLevelsOptions);
    stockLevelsChart.render();
}