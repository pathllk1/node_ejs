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
                // Check standard fields
                const standardMatch = Object.values(stock).some(val => 
                    String(val).toLowerCase().includes(term)
                );
                
                // Check batch information if present
                const batchMatch = (stock.batches && Array.isArray(stock.batches)) ? 
                    stock.batches.some(batch => 
                        Object.values(batch).some(batchVal => 
                            String(batchVal).toLowerCase().includes(term)
                        )
                    ) : false;
                
                return standardMatch || batchMatch;
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
        
        if (target.classList.contains('js-expand-batches')) {
            // Handled in renderTable function
            return;
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
        // Main row
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-100 hover:bg-lime-300 transition-colors group";
        tr.setAttribute('data-stock-id', stock.id);
        
        tr.innerHTML = `
            <td class="px-4 py-2 font-mono text-gray-400 text-[10px]">${stock.id}</td>
            <td class="px-4 py-2 font-semibold text-gray-800">${stock.item}</td>
            <td class="px-4 py-2 text-gray-600">${stock.pno || '-'}</td>
            <td class="px-4 py-2 text-gray-600">
                ${(stock.batches && Array.isArray(stock.batches) && stock.batches.length > 0) 
                    ? (stock.batches.length === 1 
                        ? (stock.batches[0].batch || 'No Batch') 
                        : `${stock.batches.length} batches`) 
                    : (stock.batch || '-')}
            </td>
            <td class="px-4 py-2 text-gray-500">${stock.hsn}</td>
            <td class="px-4 py-2 text-right font-medium text-blue-600">${parseFloat(stock.qty).toFixed(2)}</td>
            <td class="px-4 py-2 text-center text-[10px] bg-gray-50 rounded text-gray-500">${stock.uom}</td>
            <td class="px-4 py-2 text-right">${parseFloat(stock.rate).toFixed(2)}</td>
            <td class="px-4 py-2 text-right text-gray-500 text-[11px]">${parseFloat(stock.grate)}%</td>
            <td class="px-4 py-2 text-right font-bold text-gray-800">${parseFloat(stock.total).toFixed(2)}</td>
            <td class="px-4 py-2 text-right text-gray-400">
                ${(stock.batches && Array.isArray(stock.batches) && stock.batches.length > 0) 
                    ? (stock.batches.length === 1 
                        ? (stock.batches[0].mrp ? parseFloat(stock.batches[0].mrp).toFixed(2) : '-') 
                        : `${stock.batches.length} batches`) 
                    : (stock.mrp ? parseFloat(stock.mrp).toFixed(2) : '-')}
            </td>
            <td class="px-4 py-2 text-[11px] ${getExpiryColor(stock)}">
                ${getDisplayExpiryDate(stock)}
            </td>
            <td class="px-4 py-2 text-center">
                <div class="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="js-expand-batches text-blue-500 hover:bg-blue-50 p-1 rounded transition" data-id="${stock.id}" title="View Batches">≡</button>
                    <button class="js-edit text-indigo-600 hover:bg-indigo-50 p-1 rounded transition" data-id="${stock.id}" title="Edit">✎</button>
                    <button class="js-delete text-red-500 hover:bg-red-50 p-1 rounded transition" data-id="${stock.id}" title="Delete">×</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
        
        // Add expandable batch details row if there are multiple batches
        if (stock.batches && Array.isArray(stock.batches) && stock.batches.length > 1) {
            const batchDetailsRow = document.createElement('tr');
            batchDetailsRow.className = 'batch-details-row hidden';
            batchDetailsRow.setAttribute('data-parent-id', stock.id);
            
            let batchDetailsHTML = '<td colspan="13" class="p-0 border-0">';
            batchDetailsHTML += '<div class="bg-blue-50 p-3 border-t border-blue-100">';
            batchDetailsHTML += '<div class="text-sm font-medium text-blue-800 mb-2">Batch Details:</div>';
            batchDetailsHTML += '<div class="grid grid-cols-12 gap-2 text-xs font-medium text-gray-600 mb-1 px-2">';
            batchDetailsHTML += '<div class="col-span-3">Batch No</div>';
            batchDetailsHTML += '<div class="col-span-2 text-right">Quantity</div>';
            batchDetailsHTML += '<div class="col-span-2 text-right">Rate</div>';
            batchDetailsHTML += '<div class="col-span-2 text-right">MRP</div>';
            batchDetailsHTML += '<div class="col-span-3">Expiry</div>';
            batchDetailsHTML += '</div>';
            
            stock.batches.forEach(batch => {
                batchDetailsHTML += '<div class="grid grid-cols-12 gap-2 text-xs py-1 px-2 border-b border-blue-100">';
                batchDetailsHTML += `<div class="col-span-3 font-medium">${batch.batch || 'No Batch'}</div>`;
                batchDetailsHTML += `<div class="col-span-2 text-right">${batch.qty ? parseFloat(batch.qty).toFixed(2) : '0.00'}</div>`;
                batchDetailsHTML += `<div class="col-span-2 text-right">${batch.rate ? parseFloat(batch.rate).toFixed(2) : '0.00'}</div>`;
                batchDetailsHTML += `<div class="col-span-2 text-right">${batch.mrp ? parseFloat(batch.mrp).toFixed(2) : '-'}</div>`;
                batchDetailsHTML += `<div class="col-span-3 ${getExpiryStatusClass(batch.expiry)}">${batch.expiry ? new Date(batch.expiry).toLocaleDateString() : '-'}</div>`;
                batchDetailsHTML += '</div>';
            });
            
            batchDetailsHTML += '</div></td>';
            
            batchDetailsRow.innerHTML = batchDetailsHTML;
            tbody.appendChild(batchDetailsRow);
        }
    });
    
    // Add event listener for expand/collapse buttons
    document.querySelectorAll('.js-expand-batches').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const stockId = this.getAttribute('data-id');
            const batchRow = document.querySelector(`[data-parent-id="${stockId}"]`);
            
            if (batchRow) {
                batchRow.classList.toggle('hidden');
                
                // Toggle the icon
                if (batchRow.classList.contains('hidden')) {
                    this.textContent = '≡'; // Collapsed icon
                } else {
                    this.textContent = '⊟'; // Expanded icon
                }
            }
        });
    });

    updatePaginationInfo(filteredStocks.length);
}

// Helper function to get expiry status class
function getExpiryStatusClass(expiryDate) {
    if (!expiryDate) return 'text-gray-400';
    const expiry = new Date(expiryDate);
    const now = new Date();
    const threeMonths = new Date();
    threeMonths.setMonth(now.getMonth() + 3);

    if (expiry < now) return 'text-red-600 font-bold'; 
    if (expiry < threeMonths) return 'text-orange-500 font-medium';
    return 'text-green-600';
}

// Helper: Get expiry date for display
function getDisplayExpiryDate(stock) {
    // Check if we have batch information
    if (stock.batches && Array.isArray(stock.batches) && stock.batches.length > 0) {
        // If there's only one batch, show its expiry
        if (stock.batches.length === 1) {
            const batchExpiry = stock.batches[0].expiry;
            return batchExpiry ? new Date(batchExpiry).toLocaleDateString() : '-';
        } else {
            // Multiple batches - show a summary
            const expiries = stock.batches
                .filter(batch => batch.expiry) // Only batches with expiry dates
                .map(batch => new Date(batch.expiry));
            
            if (expiries.length === 0) return '-';
            
            // Find earliest and latest expiry dates
            const earliest = new Date(Math.min.apply(null, expiries));
            const latest = new Date(Math.max.apply(null, expiries));
            
            if (earliest.getTime() === latest.getTime()) {
                // Same expiry for all batches
                return earliest.toLocaleDateString();
            } else {
                // Different expiries
                return `${earliest.toLocaleDateString()} to ${latest.toLocaleDateString()}`;
            }
        }
    }
    
    // Fall back to old expiryDate field
    return stock.expiryDate ? new Date(stock.expiryDate).toLocaleDateString() : '-';
}

// Helper: Color code expiry dates
function getExpiryColor(stock) {
    let dateString;
    
    // Check if we have batch information
    if (stock.batches && Array.isArray(stock.batches) && stock.batches.length > 0) {
        if (stock.batches.length === 1) {
            // Single batch - use its expiry
            dateString = stock.batches[0].expiry;
        } else {
            // Multiple batches - find the earliest expiry date
            const expiries = stock.batches
                .filter(batch => batch.expiry)
                .map(batch => new Date(batch.expiry));
            
            if (expiries.length > 0) {
                const earliest = new Date(Math.min.apply(null, expiries));
                dateString = earliest.toISOString().split('T')[0];
            } else {
                dateString = null; // No expiry dates in batches
            }
        }
    } else {
        // Fall back to old expiryDate field
        dateString = stock.expiryDate;
    }
    
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
    
    // Reset hidden fields
    document.getElementById('stockData').value = '';
    document.getElementById('selectedBatchIndex').value = '';
    
    // Reset the batch field to original state to ensure clean state
    resetBatchFieldToOriginal();
    
    const modal = document.getElementById('stockModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeModal() {
    const modal = document.getElementById('stockModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    // Reset the form completely
    const form = document.getElementById('stockForm');
    form.reset();
    document.getElementById('stockId').value = '';
    document.getElementById('modalTitle').innerText = 'Add New Stock';
    
    document.getElementById('displayTotal').innerText = '0.00';
    document.getElementById('calcTax').innerText = '0.00';
    document.getElementById('calcGrandTotal').innerText = '0.00';
    
    // Reset hidden fields
    document.getElementById('stockData').value = '';
    document.getElementById('selectedBatchIndex').value = '';
    
    // Restore the original batch field structure
    resetBatchFieldToOriginal();
}

// Function to reset batch field to original structure
function resetBatchFieldToOriginal() {
    // Get the original HTML for the batch field container
    const originalBatchHtml = `
        <label class="block text-gray-600 font-medium mb-1">Batch No</label>
        <input type="text" name="batch" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-indigo-500 outline-none">
    `;
    
    // Find the batch field container and reset it to original state
    const batchContainers = document.querySelectorAll('.col-span-4');
    
    batchContainers.forEach(container => {
        // Check if this container has our batch selection dropdown
        const hasDropdown = container.querySelector('select[name="batch-select"]');
        if (hasDropdown) {
            container.innerHTML = originalBatchHtml;
        }
    });
}

function editStock(stock) {
    openModal();
    document.getElementById('modalTitle').innerText = 'Edit Stock';
    document.getElementById('stockId').value = stock.id;
    
    const form = document.getElementById('stockForm');
    form.item.value = stock.item;
    form.pno.value = stock.pno || '';
    form.oem.value = stock.oem || '';
    form.hsn.value = stock.hsn;
    form.qty.value = stock.qty;
    form.uom.value = stock.uom;
    form.rate.value = stock.rate;
    form.grate.value = stock.grate;
    
    // Initialize MRP and expiry date from main stock object first
    // This ensures they show initially even if batch logic modifies them later
    form.mrp.value = '';
    form.expiryDate.value = '';
    
    // Set initial values based on main stock object if available
    if (stock.mrp !== undefined && stock.mrp !== null) {
        form.mrp.value = stock.mrp;
    }
    if (stock.expiryDate) {
        form.expiryDate.value = stock.expiryDate.split('T')[0];
    }
    
    // Handle batch information - show batch selection if multiple batches exist
    if (stock.batches && Array.isArray(stock.batches) && stock.batches.length > 0) {
        // Store the original stock data for batch operations
        document.getElementById('stockData').value = JSON.stringify(stock);
        
        if (stock.batches.length > 1) {
            // Show batch selection dropdown
            showBatchSelectionForEdit(stock);
        } else {
            // Only one batch, load it directly
            const firstBatch = stock.batches[0];
            form.batch.value = firstBatch.batch || '';
            
            // Override with batch values if they exist
            if (firstBatch.mrp !== undefined && firstBatch.mrp !== null) {
                form.mrp.value = firstBatch.mrp;
            }
            if (firstBatch.expiry) {
                form.expiryDate.value = firstBatch.expiry.split('T')[0];
            }
            
            // Also update qty and rate if they came from the batch
            if (firstBatch.qty !== undefined) {
                form.qty.value = firstBatch.qty;
                // Trigger calculation update for qty
                form.qty.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (firstBatch.rate !== undefined) {
                form.rate.value = firstBatch.rate;
                // Trigger calculation update for rate
                form.rate.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    } else {
        // Fallback to old fields
        form.batch.value = stock.batch || '';
        form.mrp.value = stock.mrp || '';
        form.expiryDate.value = stock.expiryDate ? stock.expiryDate.split('T')[0] : '';
    }
    
    // Trigger calculation update
    setTimeout(() => {
        form.qty.dispatchEvent(new Event('input'));
    }, 0); // Use timeout to ensure DOM is updated first
}

// Show batch selection dropdown when multiple batches exist for editing
function showBatchSelectionForEdit(stock) {
    const form = document.getElementById('stockForm');
    
    // Create batch selection UI
    const batchField = form.batch;
    const originalDiv = batchField.parentElement;
    
    // Preserve the original classes of the parent div to maintain layout
    const originalClasses = originalDiv.className;
    
    // Create a wrapper div to replace the batch field
    const wrapper = document.createElement('div');
    wrapper.className = originalClasses; // Maintain original grid layout
    
    // Create the label for batch selection
    const label = document.createElement('label');
    label.className = 'block text-gray-600 font-medium mb-1';
    label.textContent = 'Select Batch to Edit';
    
    // Create the batch selection dropdown
    const select = document.createElement('select');
    select.id = 'batch-select';
    select.name = 'batch-select';
    select.className = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none';
    
    // Add an option for "Select a batch" as default
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a batch to edit';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    select.appendChild(defaultOption);
    
    // Add options for each batch
    stock.batches.forEach((batch, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${batch.batch || 'No Batch'} (Qty: ${batch.qty}, Exp: ${batch.expiry || 'N/A'})`;
        select.appendChild(option);
    });
    
    // Create a container for batch details
    const detailsContainer = document.createElement('div');
    detailsContainer.id = 'batch-details';
    detailsContainer.className = 'mt-2 p-3 bg-gray-50 rounded text-sm hidden';
    detailsContainer.innerHTML = '<p class="text-gray-600">Select a batch to see details and edit</p>';
    
    wrapper.appendChild(label);
    wrapper.appendChild(select);
    wrapper.appendChild(detailsContainer);
    
    // Replace the original batch field with our new wrapper
    originalDiv.parentNode.replaceChild(wrapper, originalDiv);
    
    // Add event listener to handle batch selection
    select.addEventListener('change', function() {
        const batchIndex = parseInt(this.value);
        if (!isNaN(batchIndex) && batchIndex >= 0) {
            const selectedBatch = stock.batches[batchIndex];
            
            // Update form fields with selected batch data
            form.batch.value = selectedBatch.batch || '';
            form.mrp.value = selectedBatch.mrp || '';
            form.expiryDate.value = selectedBatch.expiry ? selectedBatch.expiry.split('T')[0] : '';
            
            // Update quantity and rate fields as well
            form.qty.value = selectedBatch.qty || '';
            form.rate.value = selectedBatch.rate || '';
            
            // Manually trigger input events to ensure calculations are updated
            form.qty.dispatchEvent(new Event('input', { bubbles: true }));
            form.rate.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Update the calculated values
            const qty = parseFloat(form.qty.value) || 0;
            const rate = parseFloat(form.rate.value) || 0;
            const gst = parseFloat(form.grate.value) || 0;
            
            const basicTotal = qty * rate;
            const taxAmount = basicTotal * (gst / 100);
            const grandTotal = basicTotal + taxAmount;
            
            document.getElementById('displayTotal').textContent = basicTotal.toFixed(2);
            document.getElementById('calcTax').textContent = taxAmount.toFixed(2);
            document.getElementById('calcGrandTotal').textContent = grandTotal.toFixed(2);
            
            // Show batch details
            detailsContainer.innerHTML = `
                <div class="font-medium text-gray-800">Selected Batch: ${selectedBatch.batch || 'No Batch'}</div>
                <div class="text-gray-600">Quantity: ${selectedBatch.qty}</div>
                <div class="text-gray-600">Rate: ${selectedBatch.rate}</div>
                <div class="text-gray-600">Expiry: ${selectedBatch.expiry || 'N/A'}</div>
                <div class="text-gray-600">MRP: ${selectedBatch.mrp || 'N/A'}</div>
            `;
            detailsContainer.classList.remove('hidden');
            
            // Store the selected batch index for later use
            document.getElementById('selectedBatchIndex').value = batchIndex;
        }
    });
}

// Add a hidden field to store stock data and selected batch index
(function() {
    if (!document.getElementById('stockData')) {
        const stockDataInput = document.createElement('input');
        stockDataInput.type = 'hidden';
        stockDataInput.id = 'stockData';
        stockDataInput.name = 'stockData';
        document.getElementById('stockForm').appendChild(stockDataInput);
    }
    
    if (!document.getElementById('selectedBatchIndex')) {
        const batchIndexInput = document.createElement('input');
        batchIndexInput.type = 'hidden';
        batchIndexInput.id = 'selectedBatchIndex';
        batchIndexInput.name = 'selectedBatchIndex';
        document.getElementById('stockForm').appendChild(batchIndexInput);
    }
})();

// CRUD Operations using window.api
async function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    let data = Object.fromEntries(formData.entries());
    const id = document.getElementById('stockId').value;
    
    data.user = 'Admin'; // Hardcoded user
    
    // Check if we're editing a specific batch
    const stockData = document.getElementById('stockData').value;
    const selectedBatchIndex = document.getElementById('selectedBatchIndex').value;
    
    // Also check if batch-select element exists (meaning multiple batches were available for selection)
    const batchSelectElement = document.getElementById('batch-select');
    
    if (stockData && selectedBatchIndex !== '' && batchSelectElement) {
        // Editing an existing stock with specific batch
        const originalStock = JSON.parse(stockData);
        const batchIndex = parseInt(selectedBatchIndex);
        
        // Update the specific batch in the batches array
        if (originalStock.batches && originalStock.batches.length > 0 && batchIndex >= 0) {
            // Update the specific batch
            originalStock.batches[batchIndex] = {
                batch: data.batch || null,
                qty: parseFloat(data.qty) || 0,
                rate: parseFloat(data.rate) || 0,
                expiry: data.expiryDate || null,
                mrp: data.mrp ? parseFloat(data.mrp) : null
            };
            
            data.batches = JSON.stringify(originalStock.batches);
        }
        
        // Remove individual batch-related fields as they're now stored in batches array
        delete data.batch;
        delete data.expiryDate;
        delete data.mrp;
    } else if (data.batch || data.expiryDate || data.mrp) {
        // Creating a new stock or updating without specific batch selection
        const batchObj = {
            batch: data.batch || null,
            qty: parseFloat(data.qty) || 0,
            rate: parseFloat(data.rate) || 0,
            expiry: data.expiryDate || null,
            mrp: data.mrp ? parseFloat(data.mrp) : null
        };
        
        data.batches = JSON.stringify([batchObj]);
        
        // Remove individual batch-related fields as they're now stored in batches array
        delete data.batch;
        delete data.expiryDate;
        delete data.mrp;
    }

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
    // Prepare data for export with batch information properly formatted
    const exportData = filteredStocks.map(stock => {
        const exportStock = { ...stock };
        
        // Format batch information for export
        if (stock.batches && Array.isArray(stock.batches) && stock.batches.length > 0) {
            if (stock.batches.length === 1) {
                exportStock.batch = stock.batches[0].batch || 'No Batch';
                exportStock.expiryDate = stock.batches[0].expiry || null;
                exportStock.mrp = stock.batches[0].mrp || stock.mrp || null;
            } else {
                exportStock.batch = `${stock.batches.length} batches`;
                // For multiple batches, use the earliest expiry date
                const expiries = stock.batches
                    .filter(batch => batch.expiry)
                    .map(batch => new Date(batch.expiry));
                if (expiries.length > 0) {
                    const earliest = new Date(Math.min.apply(null, expiries));
                    exportStock.expiryDate = earliest.toISOString().split('T')[0];
                }
            }
            
            // Add batch count for reference
            exportStock.batchCount = stock.batches.length;
        }
        
        return exportStock;
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stocks");
    XLSX.writeFile(wb, "stocks_" + new Date().toISOString().split('T')[0] + ".xlsx");
}
})();