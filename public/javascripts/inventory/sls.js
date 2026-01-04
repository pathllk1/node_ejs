(function initSalesSystem() {
    console.log('SLS: Initializing Professional Sales System...');
    const container = document.getElementById('sales');
    if (!container) return;

    const GST_API_CONFIG = {
        rapidApiKey: '520f2a3f21msh31f572b09541cffp199102jsn33e8d1e9997d', // <--- PASTE YOUR KEY HERE
        enableLogging: true
    };

    // --- STATE MANAGEMENT ---
    let state = {
        stocks: [],     // Real Data
        parties: [],    // Mock Data
        cart: [],       // Current Bill Items
        selectedParty: null,
        meta: {
            billNo: 'INV-' + new Date().getFullYear() + '-001',
            billDate: new Date().toISOString().split('T')[0],
            billType: 'intra-state', // 'intra-state' or 'inter-state'
            reverseCharge: false
        }
    };

    // --- UTILS ---
    const formatCurrency = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num || 0);

    // --- DATA FETCHING ---
    async function fetchData() {
        try {
            // 1. Fetch Stocks
            const res = await window.api.get('/inventory/api/stocks');
            const data = await res.json();

            if (data.error) throw new Error(data.error);
            state.stocks = Array.isArray(data) ? data : [];

            // 2. Fetch Parties
            try {
                const partyRes = await window.api.get('/inventory/api/parties');
                const partyData = await partyRes.json();
                state.parties = Array.isArray(partyData) ? partyData : [];
            } catch (e) {
                console.warn("Could not fetch parties, starting with empty list", e);
                state.parties = [];
            }

            renderLayout();
        } catch (err) {
            console.error("Failed to load data:", err);
            container.innerHTML = `<div class="p-8 text-center text-red-600 border border-red-200 bg-red-50 rounded">
                <h3 class="font-bold text-lg">System Error</h3>
                <p>${err.message}</p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded shadow">Reload System</button>
            </div>`;
        }
    }

    // --- MAIN RENDERER ---
    function renderLayout() {
        container.innerHTML = `
        <div class="h-[calc(100vh-140px)] flex flex-col bg-gray-50 text-slate-800 font-sans text-sm border border-gray-300 rounded-lg shadow-sm overflow-hidden">
            
            <div class="bg-white border-b border-gray-200 p-2 flex justify-between items-center shadow-sm z-20">
                <div class="flex items-center gap-4">
                    <div class="flex flex-col">
                        <label class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Bill No</label>
                        <input type="text" value="${state.meta.billNo}" class="border border-gray-300 rounded px-2 py-1 text-xs font-bold w-32 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700">
                    </div>
                    <div class="flex flex-col">
                        <label class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Date</label>
                        <input type="date" value="${state.meta.billDate}" class="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-slate-700">
                    </div>
                    <div class="flex flex-col">
                        <label class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Transaction Type</label>
                        <select id="billTypeSelector" class="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 font-medium">
                            <option value="intra-state" ${state.meta.billType === 'intra-state' ? 'selected' : ''}>Intra-State (CGST + SGST)</option>
                            <option value="inter-state" ${state.meta.billType === 'inter-state' ? 'selected' : ''}>Inter-State (IGST)</option>
                        </select>
                    </div>
                </div>

                <div class="flex gap-2">
                    <button id="btn-reset" class="px-3 py-1.5 text-xs text-red-600 border border-red-200 bg-red-50 rounded hover:bg-red-100 transition-colors">Reset</button>
                    <button id="btn-save" class="px-4 py-1.5 bg-slate-800 text-white text-xs rounded hover:bg-slate-900 shadow font-medium flex items-center gap-2 transition-colors">
                        <span>💾</span> Save Invoice
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
                
                <div class="w-full md:w-64 bg-slate-50 border-r border-gray-200 flex flex-col overflow-y-auto z-10">
                    
                    <div class="p-3 border-b border-gray-200 bg-white">
                        <div class="flex justify-between items-center mb-1">
                            <label class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Bill To</label>
                        </div>
                        <div id="party-display">
                            ${renderPartyCard()}
                        </div>
                    </div>

                    <div class="p-3 space-y-3">
                         <div>
                            <label class="text-[10px] text-gray-500 font-bold">Reference / PO No</label>
                            <input type="text" class="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none" placeholder="e.g. PO-2025-001">
                        </div>
                        <div>
                            <label class="text-[10px] text-gray-500 font-bold">Vehicle No</label>
                            <input type="text" class="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none" placeholder="XX-00-XX-0000">
                        </div>
                        <div>
                            <label class="text-[10px] text-gray-500 font-bold">Dispatched Through</label>
                            <input type="text" class="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none" placeholder="Courier / Transport">
                        </div>
                        <div>
                            <label class="text-[10px] text-gray-500 font-bold">Narration</label>
                            <textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none h-20 resize-none" placeholder="Additional notes..."></textarea>
                        </div>
                    </div>
                </div>

                <div class="flex-1 bg-white flex flex-col relative min-w-0">
                    
                    <div class="bg-gray-100 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider flex pr-2 shrink-0"> 
                        <div class="p-2 w-10 text-center">#</div>
                        <div class="p-2 flex-1">Item Description</div>
                        <div class="p-2 w-20">HSN</div>
                        <div class="p-2 w-16 text-right">Qty</div>
                        <div class="p-2 w-12 text-center">Unit</div>
                        <div class="p-2 w-24 text-right">Rate</div>
                        <div class="p-2 w-16 text-right">Disc %</div>
                        <div class="p-2 w-16 text-right">Tax %</div>
                        <div class="p-2 w-28 text-right">Total</div>
                        <div class="p-2 w-10 text-center"></div>
                    </div>

                    <div class="flex-1 overflow-y-auto custom-scrollbar relative" id="items-container">
                        ${renderItemsList()}
                    </div>

                    <div class="p-2 border-t border-dashed border-gray-200 bg-gray-50 shrink-0">
                        <button id="btn-add-item" class="w-full py-2 border border-dashed border-blue-300 text-blue-600 rounded hover:bg-blue-50 text-xs font-bold transition-colors uppercase tracking-wide">
                            + Add Line Item (Press F2)
                        </button>
                    </div>

                    <div class="bg-slate-50 border-t border-slate-300 p-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]" id="totals-section">
                        ${renderTotals()}
                    </div>
                </div>
            </div>
        </div>

        <div id="modal-backdrop" class="fixed inset-0 bg-black/50 hidden z-40 flex items-center justify-center backdrop-blur-sm transition-opacity">
            <div id="modal-content" class="bg-white rounded shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-down">
                </div>
        </div>

        <div id="sub-modal-backdrop" class="fixed inset-0 bg-black/60 hidden z-50 flex items-center justify-center backdrop-blur-sm transition-opacity">
            <div id="sub-modal-content" class="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-300 animate-scale-in">
                </div>
        </div>
        `;

        attachGlobalListeners();
        attachTableListeners();
    }

    // --- RENDER HELPERS ---

    function renderPartyCard() {
        if (state.selectedParty) {
            return `
                <div class="relative group bg-blue-50 p-3 rounded border border-blue-200 shadow-sm">
                    <h3 class="font-bold text-sm text-blue-900 truncate" title="${state.selectedParty.firm}">${state.selectedParty.firm}</h3>
                    <p class="text-[11px] text-gray-600 truncate mt-1">${state.selectedParty.addr}</p>
                    <div class="flex items-center gap-2 mt-2">
                        <span class="bg-blue-100 text-blue-800 text-[10px] font-mono px-2 py-0.5 rounded border border-blue-200">GST: ${state.selectedParty.gstin}</span>
                    </div>
                    <button id="btn-change-party" class="absolute top-2 right-2 text-[10px] text-blue-600 hover:text-blue-800 font-bold bg-white px-2 py-1 rounded shadow-sm border border-gray-200 hover:border-blue-300">Change</button>
                </div>
            `;
        }
        return `
            <button id="btn-select-party" class="w-full py-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 group">
                <span class="text-2xl group-hover:scale-110 transition-transform font-light">+</span>
                <span class="text-xs font-semibold uppercase tracking-wide">Select Party</span>
            </button>
        `;
    }

    function renderItemsList() {
        if (state.cart.length === 0) {
            return `
            <div class="absolute inset-0 flex flex-col items-center justify-center text-gray-300 select-none pointer-events-none">
                <svg class="w-16 h-16 mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                <p class="text-sm font-medium text-gray-400">Your cart is empty</p>
                <p class="text-xs text-gray-400 mt-1">Press <kbd class="font-mono bg-gray-100 px-1 rounded border border-gray-300">F2</kbd> to add items</p>
            </div>`;
        }

        return state.cart.map((item, index) => {
            const rowTotal = item.qty * item.rate * (1 - (item.disc || 0) / 100);
            return `
            <div class="flex items-center border-b border-gray-100 text-xs text-gray-700 hover:bg-blue-50 transition-colors h-10 group bg-white">
                <div class="p-2 w-10 text-center text-gray-400 font-mono">${index + 1}</div>
                <div class="p-2 flex-1 font-medium truncate flex flex-col justify-center">
                    <span class="text-gray-800">${item.item}</span>
                    <span class="text-[10px] text-gray-400 font-normal">Batch: ${item.batch || '-'} | OEM: ${item.oem || '-'}</span>
                </div>
                <div class="p-2 w-20 text-gray-500 border-l border-transparent group-hover:border-blue-100">${item.hsn}</div>
                
                <div class="p-1 w-16 border-l border-transparent group-hover:border-blue-100">
                    <input type="number" min="0" step="0.01" data-idx="${index}" data-field="qty" value="${item.qty}" class="tbl-input w-full text-right bg-transparent border-b border-transparent focus:bg-white focus:border-blue-500 outline-none px-1 font-semibold text-blue-700">
                </div>
                
                <div class="p-2 w-12 text-center text-gray-500 text-[10px] border-l border-transparent group-hover:border-blue-100">${item.uom}</div>
                
                <div class="p-1 w-24 border-l border-transparent group-hover:border-blue-100">
                    <input type="number" min="0" step="0.01" data-idx="${index}" data-field="rate" value="${item.rate}" class="tbl-input w-full text-right bg-transparent border-b border-transparent focus:bg-white focus:border-blue-500 outline-none px-1">
                </div>
                
                <div class="p-1 w-16 border-l border-transparent group-hover:border-blue-100">
                    <input type="number" min="0" max="100" step="0.01" data-idx="${index}" data-field="disc" value="${item.disc}" class="tbl-input w-full text-right bg-transparent border-b border-transparent focus:bg-white focus:border-blue-500 outline-none px-1 placeholder-gray-300" placeholder="0">
                </div>
                
                <div class="p-2 w-16 text-right text-gray-600 border-l border-transparent group-hover:border-blue-100">${item.grate}%</div>
                <div class="p-2 w-28 text-right font-bold text-gray-800 row-total border-l border-transparent group-hover:border-blue-100 bg-gray-50/50 group-hover:bg-transparent">${formatCurrency(rowTotal)}</div>
                
                <div class="p-2 w-10 text-center border-l border-transparent group-hover:border-blue-100">
                    <button data-idx="${index}" class="btn-remove text-gray-300 hover:text-red-500 transition-colors font-bold text-lg leading-none">&times;</button>
                </div>
            </div>
            `;
        }).join('');
    }

    // --- ROBUST TOTALS CALCULATION ---
    function renderTotals() {
        let totalTaxable = 0;
        let totalTaxAmount = 0;
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;

        // Calculate line by line
        state.cart.forEach(item => {
            const lineValue = item.qty * item.rate * (1 - (item.disc || 0) / 100);
            const lineTax = lineValue * (item.grate / 100);

            totalTaxable += lineValue;
            totalTaxAmount += lineTax;
        });

        // Split tax based on type
        if (state.meta.billType === 'intra-state') {
            cgstAmount = totalTaxAmount / 2;
            sgstAmount = totalTaxAmount / 2;
        } else {
            igstAmount = totalTaxAmount;
        }

        const grandTotal = totalTaxable + totalTaxAmount;

        return `
        <div class="flex justify-between items-start">
            <div class="text-[11px] text-gray-400 space-y-1">
                <div class="flex gap-4">
                    <span>Total Items: <b class="text-gray-600">${state.cart.length}</b></span>
                    <span>Total Quantity: <b class="text-gray-600">${state.cart.reduce((a, b) => a + Number(b.qty), 0).toFixed(2)}</b></span>
                </div>
                <div class="text-gray-400 italic mt-2">* Rates are inclusive of discounts before tax</div>
            </div>

            <div class="flex gap-10 text-xs">
                <div class="text-right space-y-1.5 text-gray-500 font-medium">
                    <div>Taxable Value</div>
                    ${state.meta.billType === 'intra-state'
                ? `<div>CGST Output</div><div>SGST Output</div>`
                : `<div>IGST Output</div>`
            }
                    <div class="pt-2 mt-2 border-t border-gray-200 font-bold text-gray-700">Grand Total</div>
                </div>

                <div class="text-right space-y-1.5 font-mono font-bold text-gray-800">
                    <div>${formatCurrency(totalTaxable)}</div>
                    ${state.meta.billType === 'intra-state'
                ? `<div class="text-gray-600">${formatCurrency(cgstAmount)}</div><div class="text-gray-600">${formatCurrency(sgstAmount)}</div>`
                : `<div class="text-gray-600">${formatCurrency(igstAmount)}</div>`
            }
                    <div class="pt-2 mt-2 border-t border-gray-200 font-bold text-lg text-blue-700 leading-none">
                        ${formatCurrency(grandTotal)}
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    // --- MODAL: STOCK SELECTION ---
    function openStockModal() {
        const modal = document.getElementById('modal-backdrop');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;

        modal.classList.remove('hidden');

        content.innerHTML = `
            <div class="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 class="font-bold text-lg text-gray-800">Item Selection</h3>
                
                <div class="flex items-center gap-3 w-2/3 justify-end">
                    <div class="relative w-full max-w-md">
                        <input type="text" id="stock-search" placeholder="Search Item, Batch, OEM, or HSN..." class="w-full border border-gray-300 rounded pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm">
                        <svg class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    
                    <button id="btn-create-stock" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs font-bold shadow flex items-center gap-2 transition-colors whitespace-nowrap">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        NEW ITEM
                    </button>
                    
                    <button id="close-modal" class="text-gray-400 hover:text-gray-800 text-2xl leading-none ml-4">&times;</button>
                </div>
            </div>
            
            <div class="flex-1 overflow-y-auto p-0 bg-gray-50">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-white text-[11px] font-bold text-gray-500 uppercase sticky top-0 border-b border-gray-200 shadow-sm z-10">
                        <tr>
                            <th class="p-3">Item Name</th>
                            <th class="p-3">Batch</th>
                            <th class="p-3">OEM</th>
                            <th class="p-3 text-right">Available</th>
                            <th class="p-3 text-right">Rate</th>
                            <th class="p-3 text-right">GST%</th>
                            <th class="p-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody class="text-xs text-gray-700 divide-y divide-gray-100 bg-white" id="stock-list-body">
                        </tbody>
                </table>
            </div>
        `;

        renderStockRows(state.stocks);

        // Events
        const searchInput = document.getElementById('stock-search');
        if (searchInput) {
            searchInput.focus(); // Auto focus search
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = state.stocks.filter(s =>
                    (s.item && s.item.toLowerCase().includes(term)) ||
                    (s.batch && s.batch.toLowerCase().includes(term)) ||
                    (s.oem && s.oem.toLowerCase().includes(term)) ||
                    (s.hsn && s.hsn.toLowerCase().includes(term))
                );
                renderStockRows(filtered);
            });
        }

        document.getElementById('close-modal').onclick = () => modal.classList.add('hidden');
        document.getElementById('btn-create-stock').onclick = openCreateStockModal;
    }

    function renderStockRows(data) {
        const tbody = document.getElementById('stock-list-body');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-10 text-center text-gray-400 italic">No stocks found matching your query.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(stock => `
            <tr class="hover:bg-blue-50 transition-colors group border-b border-gray-50">
                <td class="p-3 font-semibold text-blue-900">${stock.item}</td>
                <td class="p-3 font-mono text-gray-500">${stock.batch || '-'}</td>
                <td class="p-3 text-gray-500">${stock.oem || '-'}</td>
                <td class="p-3 text-right font-bold ${stock.qty > 0 ? 'text-green-600' : 'text-red-500'}">${stock.qty} ${stock.uom}</td>
                <td class="p-3 text-right font-mono">${stock.rate}</td>
                <td class="p-3 text-right text-gray-500">${stock.grate}%</td>
                <td class="p-3 text-center">
                    <button class="btn-select-stock bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded text-[10px] font-bold hover:bg-blue-600 hover:text-white transition-colors shadow-sm" 
                        data-stock='${JSON.stringify(stock).replace(/'/g, "&apos;")}'>
                        ADD +
                    </button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-select-stock').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stock = JSON.parse(e.target.getAttribute('data-stock'));
                addItemToCart(stock);
                document.getElementById('modal-backdrop').classList.add('hidden');
            });
        });
    }

    // --- MODAL: CREATE NEW STOCK ---
    function openCreateStockModal() {
        const subModal = document.getElementById('sub-modal-backdrop');
        const subContent = document.getElementById('sub-modal-content');
        if (!subModal || !subContent) return;

        subModal.classList.remove('hidden');

        // Form aligned exactly with stocks.js fields
        subContent.innerHTML = `
            <div class="bg-slate-800 p-4 flex justify-between items-center text-white">
                <h3 class="font-bold text-sm tracking-wide">CREATE NEW STOCK ITEM</h3>
                <button id="close-sub-modal" class="hover:text-red-300 text-lg transition-colors">&times;</button>
            </div>
            
            <form id="create-stock-form" class="p-6 grid grid-cols-2 gap-x-6 gap-y-4">
                
                <div class="col-span-2">
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Item Description *</label>
                    <input type="text" name="item" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="e.g. Dell Monitor 24 inch">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Batch No</label>
                    <input type="text" name="batch" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Part No (P/No)</label>
                    <input type="text" name="pno" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">OEM / Brand</label>
                    <input type="text" name="oem" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">HSN Code *</label>
                    <input type="text" name="hsn" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Opening Qty *</label>
                        <input type="number" step="0.01" name="qty" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">UOM *</label>
                        <select name="uom" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none bg-white">
                            <option value="NOS">NOS</option>
                            <option value="PCS">PCS</option>
                            <option value="SET">SET</option>
                            <option value="BOX">BOX</option>
                            <option value="MTR">MTR</option>
                            <option value="KGS">KGS</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Selling Rate (₹) *</label>
                    <input type="number" step="0.01" name="rate" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">GST % *</label>
                        <select name="grate" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none bg-white">
                            <option value="18">18%</option>
                            <option value="12">12%</option>
                            <option value="5">5%</option>
                            <option value="28">28%</option>
                            <option value="0">0%</option>
                        </select>
                    </div>
                    <div>
                         <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">MRP</label>
                         <input type="number" step="0.01" name="mrp" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                    </div>
                </div>

                <div>
                     <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Expiry Date</label>
                     <input type="date" name="expiryDate" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                </div>

                <div class="col-span-2 pt-6 border-t border-gray-100 flex justify-end gap-3 mt-2">
                    <button type="button" id="cancel-create-stock" class="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 rounded">Cancel</button>
                    <button type="submit" class="px-6 py-2 bg-slate-800 text-white text-sm font-bold rounded shadow hover:bg-slate-900 transition-colors">SAVE & SELECT</button>
                </div>
            </form>
        `;

        // Listeners
        document.getElementById('close-sub-modal').onclick = closeCreateStockModal;
        document.getElementById('cancel-create-stock').onclick = closeCreateStockModal;

        document.getElementById('create-stock-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            // Logic aligned with stocks.js submit handler
            data.user = 'Admin';
            data.total = (parseFloat(data.qty) * parseFloat(data.rate)).toFixed(2);
            data.created_at = new Date().toISOString();
            data.updated_at = new Date().toISOString();

            try {
                const res = await window.api.post('/inventory/api/stocks', data);
                const result = await res.json();

                if (!res.ok) throw new Error(result.error || 'Failed to create stock');

                closeCreateStockModal();

                // Refresh main list safely
                const refreshRes = await window.api.get('/inventory/api/stocks');
                const newData = await refreshRes.json();
                state.stocks = Array.isArray(newData) ? newData : [];

                renderStockRows(state.stocks);

                // Optionally show a small toast or alert
                // alert("Stock created successfully!"); 

            } catch (err) {
                console.error(err);
                alert("Error creating stock: " + err.message);
            }
        });
    }

    function closeCreateStockModal() {
        const el = document.getElementById('sub-modal-backdrop');
        if (el) el.classList.add('hidden');
    }

    function openPartyModal() {
        const modal = document.getElementById('modal-backdrop');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;

        modal.classList.remove('hidden');

        // 1. Updated Header with "New Party" Button
        content.innerHTML = `
            <div class="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 class="font-bold text-gray-700">Select Party</h3>
                
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <input type="text" id="party-search" placeholder="Search Firm or GSTIN..." class="pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs w-48 focus:ring-1 focus:ring-blue-500 outline-none">
                        <svg class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>

                    <button id="btn-create-party" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium shadow flex items-center gap-1 transition-colors">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        New Party
                    </button>
                    
                    <button id="close-party-modal" class="text-gray-400 hover:text-gray-800 text-2xl leading-none ml-2">&times;</button>
                </div>
            </div>
            
            <div class="p-4 grid gap-3 max-h-[60vh] overflow-y-auto bg-gray-50" id="party-list-container">
                </div>
        `;

        // 2. Helper to render the list rows
        const renderPartyList = (data) => {
            const container = document.getElementById('party-list-container');
            if (!container) return;

            if (data.length === 0) {
                container.innerHTML = `<div class="text-center text-gray-400 py-8 italic">No parties found. Create a new one.</div>`;
                return;
            }

            container.innerHTML = data.map(party => `
                <div class="party-item border border-gray-200 p-3 rounded-lg hover:border-blue-400 hover:shadow-md cursor-pointer flex justify-between items-center transition-all bg-white group" data-id="${party.id}">
                    <div>
                        <div class="font-bold text-blue-900 text-sm mb-1 group-hover:text-blue-700">${party.firm}</div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">${party.gstin}</span>
                            <span class="text-[10px] text-gray-500">${party.state}</span>
                        </div>
                        <div class="text-[10px] text-gray-400 mt-1 truncate max-w-xs">${party.addr || ''}</div>
                    </div>
                    <span class="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">SELECT</span>
                </div>
            `).join('');

            // Re-attach click events for selection
            container.querySelectorAll('.party-item').forEach(div => {
                div.addEventListener('click', () => {
                    const id = parseInt(div.getAttribute('data-id'));
                    state.selectedParty = state.parties.find(p => p.id === id);
                    document.getElementById('modal-backdrop').classList.add('hidden');

                    const partyContainer = document.getElementById('party-display');
                    if (partyContainer) partyContainer.innerHTML = renderPartyCard();

                    const changeBtn = document.getElementById('btn-change-party');
                    if (changeBtn) changeBtn.addEventListener('click', openPartyModal);
                });
            });
        };

        // Initial Render
        renderPartyList(state.parties);

        // 3. Attach Event Listeners
        document.getElementById('close-party-modal').addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        document.getElementById('btn-create-party').addEventListener('click', openCreatePartyModal); // <--- OPEN SUB MODAL

        // Search Logic
        const searchInput = document.getElementById('party-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = state.parties.filter(p =>
                    p.firm.toLowerCase().includes(term) ||
                    p.gstin.toLowerCase().includes(term)
                );
                renderPartyList(filtered);
            });
        }
    }

    function openCreatePartyModal() {
        const subModal = document.getElementById('sub-modal-backdrop');
        const subContent = document.getElementById('sub-modal-content');
        if (!subModal || !subContent) return;

        subModal.classList.remove('hidden');

        // [MODIFIED HTML]
        subContent.innerHTML = `
            <div class="bg-slate-800 p-4 flex justify-between items-center text-white">
                <h3 class="font-bold text-sm tracking-wide">ADD NEW PARTY</h3>
                <button id="close-sub-modal-party" class="hover:text-red-300 text-lg transition-colors">&times;</button>
            </div>
            
            <form id="create-party-form" class="p-6 grid grid-cols-2 gap-x-6 gap-y-4">
                
                <div class="col-span-2">
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Firm Name *</label>
                    <input type="text" name="firm" id="new-party-firm" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none placeholder-gray-300" placeholder="e.g. M/S Global Enterprises">
                </div>

                <div class="col-span-2 md:col-span-1">
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">GSTIN</label>
                    <div class="flex gap-2">
                        <input type="text" name="gstin" id="new-party-gstin" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none font-mono uppercase" placeholder="27ABCDE1234F1Z5" maxlength="15">
                        <button type="button" id="btn-fetch-gst" class="bg-orange-500 hover:bg-orange-600 text-white px-3 rounded text-xs font-bold shadow transition-colors flex items-center justify-center min-w-[60px]">
                            FETCH
                        </button>
                    </div>
                    <p class="text-[10px] text-gray-400 mt-1">Click Fetch to auto-fill details</p>
                </div>

                <div>
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Contact No</label>
                    <input type="text" name="contact" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                </div>

                <div>
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">State *</label>
                    <input type="text" name="state" id="new-party-state" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                </div>

                <div>
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">State Code</label>
                    <input type="number" name="state_code" id="new-party-state-code" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50 outline-none" readonly>
                </div>

                <div class="col-span-2">
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Address</label>
                    <textarea name="addr" id="new-party-addr" rows="2" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none resize-none"></textarea>
                </div>
                
                <div class="grid grid-cols-2 gap-4 col-span-2">
                    <div>
                         <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Pincode</label>
                         <input type="number" name="pin" id="new-party-pin" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                    </div>
                    <div>
                         <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">PAN</label>
                         <input type="text" name="pan" id="new-party-pan" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none uppercase font-mono" maxlength="10">
                    </div>
                </div>

                <div class="col-span-2 pt-4 border-t border-gray-100 flex justify-end gap-3 mt-2">
                    <button type="button" id="cancel-create-party" class="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 rounded">Cancel</button>
                    <button type="submit" class="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded shadow hover:bg-blue-700 transition-colors">SAVE PARTY</button>
                </div>
            </form>
        `;

        // --- LISTENERS ---
        const closeFunc = () => document.getElementById('sub-modal-backdrop').classList.add('hidden');
        document.getElementById('close-sub-modal-party').addEventListener('click', closeFunc);
        document.getElementById('cancel-create-party').addEventListener('click', closeFunc);

        // Auto-detect State Code from GSTIN (Input Event)
        const gstinInput = document.getElementById('new-party-gstin');
        gstinInput.addEventListener('input', (e) => {
            const val = e.target.value.toUpperCase();
            e.target.value = val;
            if (val.length >= 2 && !isNaN(val.substring(0, 2))) {
                document.getElementById('new-party-state-code').value = val.substring(0, 2);
            }
            // Auto extract PAN
            if (val.length >= 12) {
                document.getElementById('new-party-pan').value = val.substring(2, 12);
            }
        });

        // [NEW] API Fetch Listener
        document.getElementById('btn-fetch-gst').addEventListener('click', function () {
            fetchPartyByGST(this); // Call the helper function
        });

        // Form Submit
        document.getElementById('create-party-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            data.supply = data.state;
            data.gstin = data.gstin || 'UNREGISTERED';
            data.usern = 'Admin';
            data.created_at = new Date().toISOString();
            data.updated_at = new Date().toISOString();

            try {
                const res = await window.api.post('/inventory/api/parties', data);
                const result = await res.json();

                if (!res.ok) throw new Error(result.error || 'Failed to create party');

                closeFunc();

                // Refresh Parties
                const refreshRes = await window.api.get('/inventory/api/parties');
                state.parties = await refreshRes.json();

                // Select and Update
                state.selectedParty = state.parties.find(p => p.firm === data.firm);
                const partyContainer = document.getElementById('party-display');
                if (partyContainer) partyContainer.innerHTML = renderPartyCard();
                document.getElementById('modal-backdrop').classList.add('hidden');

            } catch (err) {
                alert("Error creating party: " + err.message);
            }
        });
    }

    // --- CART LOGIC ---
    function addItemToCart(stockItem) {
        // Check batch/item uniqueness
        const existing = state.cart.find(i => i.stockId === stockItem.id);

        if (existing) {
            existing.qty += 1;
        } else {
            state.cart.push({
                stockId: stockItem.id,
                item: stockItem.item,
                batch: stockItem.batch,
                oem: stockItem.oem,
                hsn: stockItem.hsn,
                qty: 1,
                uom: stockItem.uom,
                rate: parseFloat(stockItem.rate),
                grate: parseFloat(stockItem.grate),
                disc: 0
            });
        }
        refreshTable();
    }

    function refreshTable() {
        document.getElementById('items-container').innerHTML = renderItemsList();
        document.getElementById('totals-section').innerHTML = renderTotals();
        attachTableListeners();
    }

    // --- EVENT ATTACHMENTS (ROBUST) ---
    function attachGlobalListeners() {
        const addBtn = document.getElementById('btn-add-item');
        if (addBtn) addBtn.onclick = openStockModal;

        const partyBtn = document.getElementById('btn-select-party');
        if (partyBtn) partyBtn.onclick = openPartyModal;

        const changePartyBtn = document.getElementById('btn-change-party');
        if (changePartyBtn) changePartyBtn.onclick = openPartyModal;

        document.onkeydown = (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                openStockModal();
            }
        };

        const typeSelector = document.getElementById('billTypeSelector');
        if (typeSelector) {
            typeSelector.onchange = (e) => {
                state.meta.billType = e.target.value;
                document.getElementById('totals-section').innerHTML = renderTotals();
            };
        }

        const resetBtn = document.getElementById('btn-reset');
        if (resetBtn) {
            resetBtn.onclick = () => {
                if (confirm("Clear current invoice details?")) {
                    state.cart = [];
                    state.selectedParty = null;
                    renderLayout();
                }
            };
        }

        const saveBtn = document.getElementById('btn-save');
        if (saveBtn) {
            saveBtn.onclick = async () => {
                if (state.cart.length === 0) {
                    alert('Cannot save an empty invoice. Please add items to the cart.');
                    return;
                }

                if (!state.selectedParty) {
                    alert('Please select a party before saving the invoice.');
                    return;
                }

                // Prepare bill data for backend
                const billData = {
                    meta: state.meta,
                    party: state.selectedParty,
                    cart: state.cart,
                    user: 'Admin' // or use actual logged-in user
                };

                try {
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = '<span>💾</span> Saving...';

                    const response = await window.api.post('/inventory/api/bills', billData);
                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.error || 'Failed to save invoice');
                    }

                    alert('Invoice saved successfully! Bill ID: ' + result.billId);
                    
                    // Optionally reset or redirect
                    // state.cart = [];
                    // state.selectedParty = null;
                    // renderLayout();

                } catch (error) {
                    console.error('Save error:', error);
                    alert('Error saving invoice: ' + error.message);
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<span>💾</span> Save Invoice';
                }
            };
        }
    }

    function attachTableListeners() {
        // Inputs
        document.querySelectorAll('.tbl-input').forEach(input => {
            input.oninput = (e) => {
                const idx = parseInt(e.target.dataset.idx);
                const field = e.target.dataset.field;
                let val = parseFloat(e.target.value);

                if (isNaN(val) || val < 0) val = 0;

                if (state.cart[idx]) {
                    state.cart[idx][field] = val;
                }

                // Smart DOM Update (Performance)
                const row = e.target.closest('div.flex');
                const rowTotal = state.cart[idx].qty * state.cart[idx].rate * (1 - (state.cart[idx].disc / 100));

                const totalDiv = row.querySelector('.row-total');
                if (totalDiv) totalDiv.innerText = formatCurrency(rowTotal);

                // Recalculate Footer
                document.getElementById('totals-section').innerHTML = renderTotals();
            };
        });

        // Remove Buttons
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.onclick = (e) => {
                const idx = parseInt(e.target.dataset.idx);
                state.cart.splice(idx, 1);
                refreshTable();
            };
        });
    }

    async function fetchPartyByGST(buttonElement) {
        const gstinInput = document.getElementById('new-party-gstin');
        const gstin = gstinInput?.value?.trim();

        if (!gstin || gstin.length !== 15) {
            alert('Please enter a valid 15-character GSTIN');
            return;
        }

        const fetchButton = buttonElement;
        const originalText = fetchButton.innerHTML;
        fetchButton.innerHTML = '⏳';
        fetchButton.disabled = true;

        try {
            // Using your backend proxy (CSP compliant)
            const response = await window.api.get(`/inventory/api/gst-lookup?gstin=${gstin}`);
            const data = await response.json();

            if (data.error) throw new Error(data.error);

            // Handle Response: The API might return the data directly or wrapped
            const partyData = data.data || data;

            // Use the robust population logic
            populatePartyFromRapidAPI(partyData, gstin);

            // Success Feedback
            fetchButton.innerHTML = '✔';
            setTimeout(() => fetchButton.innerHTML = originalText, 1500);

        } catch (error) {
            console.error('GST Lookup Error:', error);
            alert('Failed to fetch details. ' + (error.message || 'Server error'));
            fetchButton.innerHTML = originalText;
        } finally {
            fetchButton.disabled = false;
        }
    }

    // --- GST PARSING HELPERS ---

    function populatePartyFromRapidAPI(partyData, gstin) {
        console.log('Processing GST Data:', partyData);

        // 1. Extract Name
        const tradeName = partyData.trade_name || '';
        const legalName = partyData.legal_name || '';
        const displayName = tradeName || legalName;

        if (!displayName) {
            alert('No valid company name found in API response.');
            return;
        }

        // 2. Extract Address & PIN using your specific helpers
        const address = formatPowerfulGSTINAddress(partyData) || '';
        const pinCode = extractPowerfulGSTINPinCode(partyData) || '';
        
        // 3. Extract State Name
        // The API returns 'state_jurisdiction' or we can derive it from the address object
        let stateName = partyData.state_jurisdiction || '';
        if(!stateName && partyData.place_of_business_principal?.address?.state) {
            stateName = partyData.place_of_business_principal.address.state;
        }

        // --- POPULATE UI ---
        
        // Firm Name
        if(document.getElementById('new-party-firm')) 
            document.getElementById('new-party-firm').value = displayName;

        // Address
        if(document.getElementById('new-party-addr')) 
            document.getElementById('new-party-addr').value = address;

        // State
        if(document.getElementById('new-party-state')) 
            document.getElementById('new-party-state').value = stateName;

        // Pincode
        if(document.getElementById('new-party-pin')) 
            document.getElementById('new-party-pin').value = pinCode;

        // State Code (Auto-fill from GSTIN first 2 chars)
        if(gstin && gstin.length >= 2) {
             const scInput = document.getElementById('new-party-state-code');
             if(scInput) scInput.value = gstin.substring(0, 2);
        }

        // PAN (Auto-fill from GSTIN chars 3-12)
        if(gstin && gstin.length >= 12) {
            const panInput = document.getElementById('new-party-pan');
            if(panInput) panInput.value = gstin.substring(2, 12);
        }
    }

    function formatPowerfulGSTINAddress(partyData) {
        if (!partyData || !partyData.place_of_business_principal) return '';

        const addr = partyData.place_of_business_principal.address;
        if (!addr) return '';

        const parts = [];

        // Building details
        if (addr.door_num) parts.push(addr.door_num);
        if (addr.building_name) parts.push(addr.building_name);
        if (addr.floor_num) parts.push(addr.floor_num);

        // Street and location
        if (addr.street) parts.push(addr.street);
        if (addr.location) parts.push(addr.location);

        // City and district
        if (addr.city) parts.push(addr.city);
        if (addr.district) parts.push(addr.district);
        
        // Note: We handled State separately, but you can add it here if you want it in the address text box too
        // if (addr.state) parts.push(addr.state);

        return parts.filter(p => p && p.toString().trim()).join(', ');
    }

    function extractPowerfulGSTINPinCode(partyData) {
        if (!partyData || !partyData.place_of_business_principal) return '';

        const addr = partyData.place_of_business_principal.address;
        if (!addr || !addr.pin_code) return '';

        const pinStr = addr.pin_code.toString().trim();
        // Validate PIN format (6 digits)
        if (/^\d{6}$/.test(pinStr)) {
            return pinStr;
        }

        return '';
    }

    // --- INIT ---
    fetchData();

})();