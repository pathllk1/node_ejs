(function initStock() {
// Global State
let allStocks = [];
let filteredStocks = [];
let currentPage = 1;
const itemsPerPage = 12;

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
(function initStocksPage() {
    console.log("Stocks page loaded...");
    setupEventListeners();
    fetchStocks();
})();

// Fetch Data using window.api
async function fetchStocks() {
    try {
        const res = await window.api.get('/inventory/api/stocks');
        const data = await res.json();
        
        // Handle API errors embedded in JSON
        if (data.error) throw new Error(data.error);

        allStocks = data;
        filteredStocks = data;
        renderTable();
    } catch (err) {
        console.error('Failed to fetch stocks:', err);
        document.getElementById('stockTableBody').innerHTML = `<tr><td colspan="13" class="text-center p-4 text-red-500">Error loading data</td></tr>`;
        showToast('Failed to fetch stocks: ' + err.message, 'error');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // 1. Search Input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            filteredStocks = allStocks.filter(stock => {
                return Object.values(stock).some(val => 
                    String(val).toLowerCase().includes(term)
                );
            });
            currentPage = 1;
            renderTable();
        });
    }

    // 2. Pagination Buttons
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });

    // 3. Modal Controls
    document.getElementById('addStockBtn').addEventListener('click', openModal);
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
    document.getElementById('exportBtn').addEventListener('click', exportToExcel);

    // 4. Auto Calculation Logic
    const qtyInput = document.getElementById('qty');
    const rateInput = document.getElementById('rate');
    const gstInput = document.getElementById('grate');
    
    // Output Elements
    const displayTotal = document.getElementById('displayTotal');
    const calcTax = document.getElementById('calcTax');
    const calcGrandTotal = document.getElementById('calcGrandTotal');

    const updateCalculations = () => {
        const qty = parseFloat(qtyInput.value) || 0;
        const rate = parseFloat(rateInput.value) || 0;
        const gstPercent = parseFloat(gstInput.value) || 0;

        const basicTotal = qty * rate;
        const taxAmount = basicTotal * (gstPercent / 100);
        const grandTotal = basicTotal + taxAmount;

        // Update UI
        displayTotal.textContent = basicTotal.toFixed(2);
        calcTax.textContent = taxAmount.toFixed(2);
        calcGrandTotal.textContent = grandTotal.toFixed(2);
    };

    [qtyInput, rateInput, gstInput].forEach(input => {
        input.addEventListener('input', updateCalculations);
    });

    // 5. Form Submit
    document.getElementById('stockForm').addEventListener('submit', handleFormSubmit);

    // 6. Table Actions (Event Delegation)
    document.getElementById('stockTableBody').addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        if (target.classList.contains('js-edit')) {
            const id = target.getAttribute('data-id');
            const stock = allStocks.find(s => s.id == id);
            if (stock) editStock(stock);
        }

        if (target.classList.contains('js-delete')) {
            const id = target.getAttribute('data-id');
            deleteStock(id);
        }
    });
}

// Render Table
function renderTable() {
    const tbody = document.getElementById('stockTableBody');
    tbody.innerHTML = '';

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredStocks.slice(start, end);

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="p-8 text-center text-gray-500 italic">No stock records found.</td></tr>`;
        updatePaginationInfo(0);
        return;
    }

    pageData.forEach(stock => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-100 hover:bg-lime-100 transition-colors group";
        
        tr.innerHTML = `
            <td class="px-4 py-2 font-mono text-gray-400 text-[10px]">${stock.id}</td>
            <td class="px-4 py-2 font-semibold text-gray-800">${stock.item}</td>
            <td class="px-4 py-2 text-gray-600">${stock.pno || '-'}</td>
            <td class="px-4 py-2 text-gray-600">${stock.batch || '-'}</td>
            <td class="px-4 py-2 text-gray-500">${stock.hsn}</td>
            <td class="px-4 py-2 text-right font-medium text-blue-600">${parseFloat(stock.qty).toFixed(2)}</td>
            <td class="px-4 py-2 text-center text-[10px] bg-gray-50 rounded text-gray-500">${stock.uom}</td>
            <td class="px-4 py-2 text-right">${parseFloat(stock.rate).toFixed(2)}</td>
            <td class="px-4 py-2 text-right text-gray-500 text-[11px]">${parseFloat(stock.grate)}%</td>
            <td class="px-4 py-2 text-right font-bold text-gray-800">${parseFloat(stock.total).toFixed(2)}</td>
            <td class="px-4 py-2 text-right text-gray-400">${stock.mrp ? parseFloat(stock.mrp).toFixed(2) : '-'}</td>
            <td class="px-4 py-2 text-[11px] ${getExpiryColor(stock.expiryDate)}">
                ${stock.expiryDate ? new Date(stock.expiryDate).toLocaleDateString() : '-'}
            </td>
            <td class="px-4 py-2 text-center">
                <div class="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="js-edit text-indigo-600 hover:bg-indigo-50 p-1 rounded transition" data-id="${stock.id}" title="Edit">✎</button>
                    <button class="js-delete text-red-500 hover:bg-red-50 p-1 rounded transition" data-id="${stock.id}" title="Delete">×</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updatePaginationInfo(filteredStocks.length);
}

// Helper: Color code expiry dates
function getExpiryColor(dateString) {
    if (!dateString) return 'text-gray-400';
    const expiry = new Date(dateString);
    const now = new Date();
    const threeMonths = new Date();
    threeMonths.setMonth(now.getMonth() + 3);

    if (expiry < now) return 'text-red-600 font-bold'; 
    if (expiry < threeMonths) return 'text-orange-500 font-medium';
    return 'text-green-600';
}

function updatePaginationInfo(totalItems) {
    const start = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    document.getElementById('pageInfo').innerText = `Showing ${start} - ${end} of ${totalItems}`;
    
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage >= Math.ceil(totalItems / itemsPerPage) || totalItems === 0;
}

// Modal Functions
function openModal() {
    const form = document.getElementById('stockForm');
    form.reset();
    document.getElementById('stockId').value = '';
    document.getElementById('modalTitle').innerText = 'Add New Stock';
    
    document.getElementById('displayTotal').innerText = '0.00';
    document.getElementById('calcTax').innerText = '0.00';
    document.getElementById('calcGrandTotal').innerText = '0.00';
    
    const modal = document.getElementById('stockModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeModal() {
    const modal = document.getElementById('stockModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function editStock(stock) {
    openModal();
    document.getElementById('modalTitle').innerText = 'Edit Stock';
    document.getElementById('stockId').value = stock.id;
    
    const form = document.getElementById('stockForm');
    form.item.value = stock.item;
    form.pno.value = stock.pno || '';
    form.batch.value = stock.batch || '';
    form.oem.value = stock.oem || '';
    form.hsn.value = stock.hsn;
    form.qty.value = stock.qty;
    form.uom.value = stock.uom;
    form.rate.value = stock.rate;
    form.grate.value = stock.grate;
    form.mrp.value = stock.mrp || '';
    form.expiryDate.value = stock.expiryDate ? stock.expiryDate.split('T')[0] : '';
    
    // Trigger calculation update
    form.qty.dispatchEvent(new Event('input'));
}

// CRUD Operations using window.api
async function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const id = document.getElementById('stockId').value;
    
    data.user = 'Admin'; // Hardcoded user

    const method = id ? 'put' : 'post';
    const url = id ? `/inventory/api/stocks/${id}` : '/inventory/api/stocks';

    try {
        const res = await window.api[method](url, data);
        const result = await res.json();
        
        if (!res.ok) throw new Error(result.error || 'Operation failed');
        
        closeModal();
        fetchStocks();
        showToast(id ? 'Stock updated successfully!' : 'Stock added successfully!', 'success');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function deleteStock(id) {
    if (!confirm('Are you sure you want to delete this record permanently?')) return;
    
    try {
        await window.api.delete(`/inventory/api/stocks/${id}`);
        fetchStocks();
        showToast('Stock deleted successfully!', 'success');
    } catch (err) {
        console.error(err);
        showToast('Failed to delete stock: ' + err.message, 'error');
    }
}

// Export to Excel
function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(filteredStocks);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stocks");
    XLSX.writeFile(wb, "stocks_" + new Date().toISOString().split('T')[0] + ".xlsx");
}
})();