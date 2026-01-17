(function initStockMovements() {
    // Global State
    let allMovements = [];
    let filteredMovements = [];
    let currentPage = 1;
    let totalPages = 1;
    let itemsPerPage = 20;
    let allStocks = [];

    /**
     * ==========================================
     * 1. TOAST NOTIFICATION SYSTEM
     * ==========================================
     */
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const template = document.getElementById('toast-template');

        if (!container || !template) {
            console.warn('Toast container or template not found in DOM.');
            alert(message); // Fallback
            return;
        }

        // Clone the template
        const toast = template.cloneNode(true);
        
        // Remove the ID to avoid duplicates in DOM
        toast.removeAttribute('id');
        
        // Remove 'hidden' immediately so it exists in layout,
        // but keep translate-x-full/opacity-0 for the animation start state
        toast.classList.remove('hidden');

        // 1. Set Message
        const msgEl = toast.querySelector('#toast-message');
        if (msgEl) msgEl.textContent = message;

        // 2. Set Icon & Color based on type
        const iconContainer = toast.querySelector('#toast-icon');
        
        // Reset borders
        toast.classList.remove('border-l-4');
        toast.classList.add('border-l-4'); // Re-add base class

        if (type === 'success') {
            toast.classList.add('border-green-500');
            if (iconContainer) {
                iconContainer.innerHTML = `
                    <svg class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>`;
            }
        } else {
            toast.classList.add('border-red-500');
            if (iconContainer) {
                iconContainer.innerHTML = `
                    <svg class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>`;
            }
        }

        // 3. Attach Close Event (Manual listener to avoid inline CSP issues)
        const closeBtn = toast.querySelector('button');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.preventDefault();
                removeToast(toast);
            };
        }

        // 4. Append to Container
        container.appendChild(toast);

        // 5. Trigger Animation (Small timeout ensures DOM reflow happens first)
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 50);

        // 6. Auto Dismiss
        setTimeout(() => {
            removeToast(toast);
        }, 3000);
    }

    function removeToast(element) {
        if (!element) return;
        
        // Slide out
        element.classList.add('translate-x-full', 'opacity-0');
        
        // Remove from DOM after transition matches CSS duration (300ms)
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 350);
    }

    // Initialize
    (function initStockMovementsPage() {
        console.log("Stock movements page loaded...");
        setupEventListeners();
        fetchStocksForFilter(); // Load stocks for filter dropdown
        fetchMovements();
    })();

    // Fetch all stocks for filter dropdown
    async function fetchStocksForFilter() {
        try {
            const res = await window.api.get('/inventory/api/stocks');
            const data = await res.json();
            
            if (data.error) throw new Error(data.error);
            
            allStocks = data;
            populateStockFilter(allStocks);
        } catch (err) {
            console.error('Failed to fetch stocks for filter:', err);
        }
    }

    // Populate stock filter dropdown
    function populateStockFilter(stocks) {
        const stockFilter = document.getElementById('stockFilter');
        stockFilter.innerHTML = '<option value="">All Items</option>';
        
        stocks.forEach(stock => {
            const option = document.createElement('option');
            option.value = stock.id;
            option.textContent = stock.item;
            stockFilter.appendChild(option);
        });
    }

    // Fetch Movements using window.api
    async function fetchMovements(page = 1) {
        try {
            // Build query parameters from filters
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('limit', itemsPerPage);

            const startDate = document.getElementById('startDateFilter').value;
            if (startDate) params.append('startDate', startDate);

            const endDate = document.getElementById('endDateFilter').value;
            if (endDate) params.append('endDate', endDate);

            const stockId = document.getElementById('stockFilter').value;
            if (stockId) params.append('stockId', stockId);

            const type = document.getElementById('typeFilter').value;
            if (type) params.append('type', type);

            const batch = document.getElementById('batchFilter').value;
            if (batch) params.append('batch', batch);

            const search = document.getElementById('searchFilter').value;
            if (search) params.append('search', search);

            const res = await window.api.get(`/inventory/api/stock-movements?${params.toString()}`);
            const data = await res.json();
            
            // Handle API errors embedded in JSON
            if (data.error) throw new Error(data.error);

            allMovements = data.movements;
            currentPage = data.pagination.page;
            totalPages = data.pagination.pages;
            
            renderTable();
            updatePaginationInfo(data.pagination);
        } catch (err) {
            console.error('Failed to fetch movements:', err);
            document.getElementById('movementsTableBody').innerHTML = `<tr><td colspan="12" class="text-center p-4 text-red-500">Error loading data</td></tr>`;
            showToast('Failed to fetch movements: ' + err.message, 'error');
        }
    }

    // Setup Event Listeners
    function setupEventListeners() {
        // 1. Filter Controls
        document.getElementById('applyFiltersBtn').addEventListener('click', () => {
            currentPage = 1;
            fetchMovements(currentPage);
        });

        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            document.getElementById('startDateFilter').value = '';
            document.getElementById('endDateFilter').value = '';
            document.getElementById('stockFilter').value = '';
            document.getElementById('typeFilter').value = '';
            document.getElementById('batchFilter').value = '';
            document.getElementById('searchFilter').value = '';
            currentPage = 1;
            fetchMovements(currentPage);
        });

        // 2. Pagination Buttons
        document.getElementById('prevMovementsBtn').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                fetchMovements(currentPage);
            }
        });

        document.getElementById('nextMovementsBtn').addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                fetchMovements(currentPage);
            }
        });

        // 3. Modal Controls
        document.getElementById('addMovementBtn').addEventListener('click', openMovementModal);
        document.getElementById('closeMovementModalBtn').addEventListener('click', closeMovementModal);
        document.getElementById('cancelMovementModalBtn').addEventListener('click', closeMovementModal);
        document.getElementById('exportMovementsBtn').addEventListener('click', exportMovementsToExcel);

        // 4. Form Submit
        document.getElementById('movementForm').addEventListener('submit', handleMovementFormSubmit);

        // 5. Table Actions (Event Delegation)
        document.getElementById('movementsTableBody').addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            if (target.classList.contains('js-view-movement')) {
                const id = target.getAttribute('data-id');
                viewMovement(id);
            }
        });
    }

    // Render Movement Table
    function renderTable() {
        const tbody = document.getElementById('movementsTableBody');
        tbody.innerHTML = '';

        if (allMovements.length === 0) {
            tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-gray-500 italic">No movement records found.</td></tr>`;
            return;
        }

        allMovements.forEach(movement => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-gray-100 hover:bg-lime-300 transition-colors group";
            
            tr.innerHTML = `
                <td class="px-4 py-2 font-mono text-gray-400 text-[10px]">${movement.id}</td>
                <td class="px-4 py-2 font-semibold text-gray-800">
                    <span class="px-2 py-1 rounded-full text-xs ${
                        movement.type === 'SALE' ? 'bg-red-100 text-red-800' :
                        movement.type === 'RECEIPT' ? 'bg-green-100 text-green-800' :
                        movement.type === 'TRANSFER' ? 'bg-blue-100 text-blue-800' :
                        movement.type === 'ADJUSTMENT' ? 'bg-yellow-100 text-yellow-800' :
                        movement.type === 'OPENING' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                    }">${movement.type}</span>
                </td>
                <td class="px-4 py-2 text-gray-600">${movement.bdate || '-'}</td>
                <td class="px-4 py-2 font-medium text-gray-800">${movement.item}</td>
                <td class="px-4 py-2 text-gray-600">${movement.batch || '-'}</td>
                <td class="px-4 py-2 text-right font-medium text-blue-600">${parseFloat(movement.qty).toFixed(2)}</td>
                <td class="px-4 py-2 text-center text-[10px] bg-gray-50 rounded text-gray-500">${movement.uom}</td>
                <td class="px-4 py-2 text-right">${movement.rate ? parseFloat(movement.rate).toFixed(2) : '0.00'}</td>
                <td class="px-4 py-2 text-right font-bold text-gray-800">${parseFloat(movement.total).toFixed(2)}</td>
                <td class="px-4 py-2 text-gray-500">${movement.bno || movement.bill_number || '-'}</td>
                <td class="px-4 py-2 text-gray-500">${movement.user}</td>
                <td class="px-4 py-2 text-[11px] text-gray-400">${new Date(movement.created_at).toLocaleDateString()}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function updatePaginationInfo(pagination) {
        const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
        const end = Math.min(pagination.page * pagination.limit, pagination.total);
        document.getElementById('movementsPageInfo').innerText = `Showing ${start} - ${end} of ${pagination.total} movements`;
        
        document.getElementById('prevMovementsBtn').disabled = pagination.page === 1;
        document.getElementById('nextMovementsBtn').disabled = pagination.page >= pagination.pages || pagination.total === 0;
    }

    // Modal Functions
    function openMovementModal() {
        const form = document.getElementById('movementForm');
        form.reset();
        document.getElementById('movementId').value = '';
        document.getElementById('movementModalTitle').innerText = 'Add New Stock Movement';
        
        // Load stocks for dropdown
        loadStocksForMovement();
        
        const modal = document.getElementById('movementModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function closeMovementModal() {
        const modal = document.getElementById('movementModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        
        // Reset the form
        const form = document.getElementById('movementForm');
        form.reset();
        document.getElementById('movementId').value = '';
        document.getElementById('movementModalTitle').innerText = 'Add New Stock Movement';
    }

    // Load stocks for movement form dropdown
    async function loadStocksForMovement() {
        try {
            const res = await window.api.get('/inventory/api/stocks');
            const data = await res.json();
            
            if (data.error) throw new Error(data.error);
            
            const stockSelect = document.getElementById('movementStockId');
            stockSelect.innerHTML = '';
            
            data.forEach(stock => {
                const option = document.createElement('option');
                option.value = stock.id;
                option.textContent = `${stock.item} (${stock.qty} ${stock.uom})`;
                stockSelect.appendChild(option);
            });
        } catch (err) {
            console.error('Failed to load stocks for movement form:', err);
            showToast('Failed to load stocks: ' + err.message, 'error');
        }
    }

    async function handleMovementFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        let data = Object.fromEntries(formData.entries());
        
        // Convert numeric fields
        data.qty = parseFloat(data.qty);
        data.rate = data.rate ? parseFloat(data.rate) : 0;
        data.total = data.total ? parseFloat(data.total) : 0;
        data.stockId = parseInt(data.stockId);

        try {
            const res = await window.api.post('/inventory/api/stock-movements', data);
            const result = await res.json();
            
            if (!res.ok) throw new Error(result.error || 'Operation failed');
            
            closeMovementModal();
            fetchMovements(currentPage); // Refresh current page
            showToast(result.message || 'Stock movement added successfully!', 'success');
        } catch (err) {
            console.error('Error submitting movement:', err);
            showToast('Error: ' + err.message, 'error');
        }
    }

    function viewMovement(id) {
        // Placeholder for viewing movement details
        console.log('View movement with ID:', id);
        showToast('View movement functionality coming soon', 'info');
    }

    // Export to Excel
    function exportMovementsToExcel() {
        // Prepare data for export
        const exportData = allMovements.map(movement => ({
            ID: movement.id,
            Type: movement.type,
            Date: movement.bdate,
            Item: movement.item,
            Batch: movement.batch || '',
            Quantity: parseFloat(movement.qty).toFixed(2),
            UOM: movement.uom,
            Rate: movement.rate ? parseFloat(movement.rate).toFixed(2) : '0.00',
            Total: parseFloat(movement.total).toFixed(2),
            Reference: movement.bno || movement.bill_number || '',
            User: movement.user,
            'Created At': new Date(movement.created_at).toLocaleString()
        }));
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Stock Movements");
        XLSX.writeFile(wb, "stock_movements_" + new Date().toISOString().split('T')[0] + ".xlsx");
    }
})();