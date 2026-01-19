(function initEditBillSystem() {
    console.log('EDIT-BILL: Initializing Bill Edit System...');

    // Check if we're in edit mode by looking for billId in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const billId = urlParams.get('edit');
    
    if (!billId) {
        console.log('No bill ID found in URL parameters, not in edit mode');
        return; // Not in edit mode, exit
    }

    const container = document.getElementById('sales');
    if (!container) return;

    // Import common utilities from sls.js if available
    const formatCurrency = window.formatCurrency || ((num) => {
        // Format currency according to Indian numbering system
        return new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num || 0);
    });
    
    // --- STATE MANAGEMENT ---
    let state = {
        stocks: [],     // Real Data
        parties: [],    // Mock Data
        cart: [],       // Current Bill Items
        selectedParty: null,
        selectedConsignee: null, // Consignee details
        consigneeSameAsBillTo: true, // Toggle for same as bill to (default to true)
        historyCache: {},
        meta: {
            billNo: '',
            billDate: new Date().toISOString().split('T')[0],
            billType: 'intra-state', // 'intra-state' or 'inter-state'
            reverseCharge: false,
            referenceNo: '',
            vehicleNo: '',
            dispatchThrough: '',
            narration: ''
        },
        otherCharges: [],  // Array to store other charges
        gstEnabled: true   // Default GST status
    };

    // --- UTILS ---
    const getHistoryCacheKey = (partyId, stockId) => `${partyId}:${stockId}`;

    // --- OTHER CHARGES MANAGEMENT ---
    function addOtherCharge(charge) {
        // Add default GST rate if not provided
        if (charge.gstRate === undefined) {
            charge.gstRate = 0; // Default to 0% GST
        }
        
        // Calculate GST amount only if GST is enabled
        if (state.gstEnabled !== false) {  // Default to enabled if not set
            charge.gstAmount = (charge.amount * charge.gstRate) / 100;
        } else {
            charge.gstAmount = 0; // No GST when disabled
        }
        
        state.otherCharges.push(charge);
        refreshTable();
    }
    
    function removeOtherCharge(index) {
        state.otherCharges.splice(index, 1);
        refreshTable();
    }
    
    function updateOtherCharge(index, charge) {
        // Calculate GST amount only if GST is enabled
        if (state.gstEnabled !== false) {  // Default to enabled if not set
            charge.gstAmount = (charge.amount * (charge.gstRate || 0)) / 100;
        } else {
            charge.gstAmount = 0; // No GST when disabled
        }
        
        state.otherCharges[index] = charge;
        refreshTable();
    }
    
    function getTotalOtherCharges() {
        // Calculate total amount of other charges (excluding their GST)
        return state.otherCharges.reduce((sum, charge) => {
            return sum + (parseFloat(charge.amount) || 0);
        }, 0);
    }

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

            // 3. Fetch GST status
            try {
                const gstStatusRes = await window.api.get('/admin/gst-status');
                const gstStatusData = await gstStatusRes.json();
                state.gstEnabled = gstStatusData.gst_enabled;
            } catch (e) {
                console.warn("Could not fetch GST status, defaulting to enabled", e);
                state.gstEnabled = true; // Default to enabled if API fails
            }

            // 4. Fetch existing bill data for editing
            await loadBillData(billId);

            renderLayout();
        } catch (err) {
            console.error("Failed to load data:", err);
            container.innerHTML = `<div class="p-8 text-center text-red-600 border border-red-200 bg-red-50 rounded">
                <h3 class="font-bold text-lg">System Error</h3>
                <p>${err.message}</p>
                <button class="reload-system-btn mt-4 px-4 py-2 bg-red-600 text-white rounded shadow">Reload System</button>
            </div>`;
            
            // Attach event listener to reload button
            const reloadBtn = container.querySelector('.reload-system-btn');
            if (reloadBtn) {
                reloadBtn.addEventListener('click', () => location.reload());
            }
        }
    }

    // Load existing bill data
    async function loadBillData(billId) {
        try {
            const response = await window.api.get(`/inventory/api/bills/${billId}`);
            const bill = await response.json();

            if (bill.error) {
                throw new Error(bill.error);
            }

            // Populate meta information
            state.meta = {
                billNo: bill.bno || '',
                billDate: bill.bdate || new Date().toISOString().split('T')[0],
                billType: (bill.btype || '').toLowerCase().includes('intra') ? 'intra-state' : 'inter-state',
                reverseCharge: bill.reverseCharge || false,
                referenceNo: bill.order_no || '',
                vehicleNo: bill.vehicle_no || '',
                dispatchThrough: bill.dispatch_through || '',
                narration: bill.narration || ''
            };

            // Find and set selected party
            const party = state.parties.find(p => p.id === bill.party_id) || 
                         state.parties.find(p => p.firm === bill.firm);
            if (party) {
                state.selectedParty = party;
            } else {
                // Create a temporary party object if not found in the list
                state.selectedParty = {
                    id: bill.party_id,
                    firm: bill.firm,
                    addr: bill.addr,
                    gstin: bill.gstin,
                    state: bill.state
                };
            }
            
            // Set consignee details if available
            if (bill.consignee) {
                state.selectedConsignee = bill.consignee;
                state.consigneeSameAsBillTo = false; // Uncheck if there's specific consignee data
            } else {
                // Default to same as bill to
                state.consigneeSameAsBillTo = true;
            }

            // Populate cart with bill items
            state.cart = (bill.items || []).map(item => ({
                id: item.id,
                stockId: item.stock_id,
                item: item.item,
                hsn: item.hsn,
                qty: item.qty,
                uom: item.uom,
                rate: item.rate,
                disc: item.disc || 0,
                grate: item.grate || 0,
                batch: item.batch || null,  // Keep as null if not available
                total: item.total,
                narration: item.item_narration || ''  // Map narration field
            }));

            // Populate other charges
            state.otherCharges = bill.otherCharges || [];

        } catch (err) {
            console.error("Failed to load bill data:", err);
            throw err;
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
                        <input type="text" id="bill-no-input" value="${state.meta.billNo}" class="border border-gray-300 rounded px-2 py-1 text-xs font-bold w-32 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700">
                    </div>
                    <div class="flex flex-col">
                        <label class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Date</label>
                        <input type="date" id="bill-date-input" value="${state.meta.billDate}" class="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-slate-700">
                    </div>
                    <div class="flex flex-col">
                        <label class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Transaction Type</label>
                        <select id="billTypeSelector" class="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 font-medium">
                            <option value="intra-state" ${state.meta.billType === 'intra-state' ? 'selected' : ''}>Intra-State (CGST + SGST)</option>
                            <option value="inter-state" ${state.meta.billType === 'inter-state' ? 'selected' : ''}>Inter-State (IGST)</option>
                        </select>
                    </div>
                    
                    <div class="flex items-center pt-4 gap-2">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="reverse-charge-toggle" ${state.meta.reverseCharge ? 'checked' : ''} class="form-checkbox h-4 w-4 text-blue-600 rounded">
                            <span class="ml-2 text-[10px] uppercase text-gray-500 font-bold tracking-wider">Reverse Charge</span>
                        </label>
                        <div class="text-[10px] font-bold px-2 py-1 rounded ${state.gstEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            GST: ${state.gstEnabled ? 'ON' : 'OFF'}
                        </div>
                    </div>
                </div>

                <div class="flex gap-2">
                    <button id="btn-other-charges" class="px-3 py-1.5 text-xs text-blue-600 border border-blue-200 bg-blue-50 rounded hover:bg-blue-100 transition-colors">Other Charges</button>
                    <button id="btn-reset" class="px-3 py-1.5 text-xs text-red-600 border border-red-200 bg-red-50 rounded hover:bg-red-100 transition-colors">Reset</button>
                    <button id="btn-update" class="px-4 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 shadow font-medium flex items-center gap-2 transition-colors">
                        <span>🔄</span> Update Invoice
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
                    
                    <div class="p-3 border-b border-gray-200 bg-white">
                        <div class="flex justify-between items-center mb-1">
                            <label class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Consignee Details</label>
                        </div>
                        <div class="flex items-center mb-2">
                            <input type="checkbox" id="edit-bill-consignee-same-as-bill-to" ${state.consigneeSameAsBillTo ? 'checked' : ''} class="form-checkbox h-3 w-3 text-blue-600 rounded mr-1">
                            <label for="edit-bill-consignee-same-as-bill-to" class="text-[10px] text-gray-600">Same as Bill To</label>
                        </div>
                        <div id="consignee-display">
                            ${renderConsigneeCard()}
                        </div>
                    </div>

                    <div class="p-3 space-y-3">
                         <div>
                            <label class="text-[10px] text-gray-500 font-bold">Reference / PO No</label>
                            <input type="text" id="reference-no" value="${state.meta.referenceNo}" class="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none" placeholder="e.g. PO-2025-001">
                        </div>
                        <div>
                            <label class="text-[10px] text-gray-500 font-bold">Vehicle No</label>
                            <input type="text" id="vehicle-no" value="${state.meta.vehicleNo}" class="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none" placeholder="XX-00-XX-0000">
                        </div>
                        <div>
                            <label class="text-[10px] text-gray-500 font-bold">Dispatched Through</label>
                            <input type="text" id="dispatch-through" value="${state.meta.dispatchThrough}" class="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none" placeholder="Courier / Transport">
                        </div>
                        <div>
                            <label class="text-[10px] text-gray-500 font-bold">Narration</label>
                            <textarea id="narration" class="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none h-20 resize-none" placeholder="Additional notes...">${state.meta.narration}</textarea>
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
        
        <!-- Other Charges Modal -->
        <div id="other-charges-modal-backdrop" class="fixed inset-0 bg-black/60 hidden z-50 flex items-center justify-center backdrop-blur-sm transition-opacity">
            <div id="other-charges-modal-content" class="bg-white rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-300 animate-scale-in">
                <div class="bg-slate-800 p-4 flex justify-between items-center text-white">
                    <h3 class="font-bold text-sm tracking-wide">OTHER CHARGES</h3>
                    <button id="close-other-charges-modal" class="hover:text-red-300 text-lg transition-colors">&times;</button>
                </div>
                
                <div class="p-6">
                    <div class="flex gap-4 mb-4">
                        <div class="relative flex-1">
                            <input type="text" id="charge-name" placeholder="Charge Name" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                            <div id="charge-name-suggestions" class="absolute z-10 w-full min-w-[400px] bg-white border border-gray-300 rounded shadow-lg mt-1 max-h-40 overflow-y-auto hidden"></div>
                        </div>
                        <input type="text" id="charge-hsn" placeholder="HSN/SAC" class="w-24 border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" title="Enter HSN for goods or SAC for services">
                        <input type="number" id="charge-amount" placeholder="Amount" step="0.01" class="w-32 border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                        <input type="number" id="charge-gst" placeholder="GST %" step="0.01" class="w-24 border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                        <select id="charge-type" class="w-40 border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none bg-white">
                            <option value="freight">Freight</option>
                            <option value="packing">Packing</option>
                            <option value="handling">Handling</option>
                            <option value="insurance">Insurance</option>
                            <option value="others">Others</option>
                        </select>
                        <button id="add-charge-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap">
                            ADD
                        </button>
                    </div>
                    
                    <div class="mb-4 text-sm text-gray-600">
                        <span>Total Other Charges: </span>
                        <span id="total-other-charges" class="font-bold text-blue-700">0.00</span>
                    </div>
                    
                    <div class="overflow-y-auto max-h-80">
                        <table class="w-full text-left border-collapse">
                            <thead class="bg-gray-100 text-[11px] font-bold text-gray-500 uppercase">
                                <tr>
                                    <th class="p-3">Name</th>
                                    <th class="p-3">HSN/SAC</th>
                                    <th class="p-3">Type</th>
                                    <th class="p-3 text-right">Amount</th>
                                    <th class="p-3 text-right">GST %</th>
                                    <th class="p-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody id="other-charges-list" class="text-xs text-gray-700 divide-y divide-gray-100">
                                ${renderOtherChargesList()}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="p-4 border-t border-gray-200 flex justify-end gap-3">
                    <button id="cancel-other-charges" class="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 rounded">Cancel</button>
                    <button id="save-other-charges" class="px-6 py-2 bg-green-600 text-white text-sm font-bold rounded shadow hover:bg-green-700 transition-colors">DONE</button>
                </div>
            </div>
        </div>
        `;

        attachGlobalListeners();
        attachTableListeners();
    }

    // --- RENDER HELPERS ---

    function renderOtherChargesList() {
        if (state.otherCharges.length === 0) {
            return `<tr><td colspan="6" class="p-3 text-center text-gray-400 italic">No other charges added</td></tr>`;
        }
        
        return state.otherCharges.map((charge, index) => {
            // Calculate GST amount only if GST is enabled
            const gstEnabled = state.gstEnabled !== undefined ? state.gstEnabled : true; // Default to enabled if not set
            const gstAmount = gstEnabled ? (charge.amount * (charge.gstRate || 0)) / 100 : 0;
            const totalAmount = charge.amount + gstAmount;
            return `
            <tr class="hover:bg-blue-50 transition-colors">
                <td class="p-3 font-medium">${charge.name}</td>
                <td class="p-3 text-gray-500">${charge.hsnSac || ''}</td>
                <td class="p-3 text-gray-500">${charge.type}</td>
                <td class="p-3 text-right font-bold text-gray-800">${formatCurrency(charge.amount)}</td>
                <td class="p-3 text-right font-bold text-gray-800">${(charge.gstRate || 0)}%</td>
                <td class="p-3 text-center">
                    <button class="btn-edit-charge text-blue-600 hover:text-blue-800 transition-colors font-bold text-lg leading-none mr-2" data-index="${index}">✎</button>
                    <button class="btn-remove-charge text-red-600 hover:text-red-800 transition-colors font-bold text-lg leading-none" data-index="${index}">&times;</button>
                </td>
            </tr>
            <tr class="hover:bg-blue-50 transition-colors bg-gray-50">
                <td class="p-1 text-right text-gray-500 text-xs" colspan="3">GST (${(charge.gstRate || 0)}%):</td>
                <td class="p-1 text-right text-gray-500 text-xs">${formatCurrency(gstAmount)}</td>
                <td class="p-1 text-right text-gray-500 text-xs font-bold">Total:</td>
                <td class="p-1 text-right text-gray-800 text-xs font-bold">${formatCurrency(totalAmount)}</td>
            </tr>`;
        }).join('');
    }
    
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
        
    function renderConsigneeCard() {
        if (state.selectedConsignee && !state.consigneeSameAsBillTo) {
            return `
                <div class="relative group bg-green-50 p-3 rounded border border-green-200 shadow-sm">
                    <h3 class="font-bold text-sm text-green-900 truncate" title="${state.selectedConsignee.name || ''}">${state.selectedConsignee.name || 'N/A'}</h3>
                    <p class="text-[11px] text-gray-600 truncate mt-1">${state.selectedConsignee.address || 'N/A'}</p>
                    <div class="flex items-center gap-2 mt-2">
                        <span class="bg-green-100 text-green-800 text-[10px] font-mono px-2 py-0.5 rounded border border-green-200">GST: ${state.selectedConsignee.gstin || 'N/A'}</span>
                        <span class="bg-green-100 text-green-800 text-[10px] font-mono px-2 py-0.5 rounded border border-green-200">State: ${state.selectedConsignee.state || 'N/A'}</span>
                    </div>
                    <button id="btn-change-consignee" class="absolute top-2 right-2 text-[10px] text-green-600 hover:text-green-800 font-bold bg-white px-2 py-1 rounded shadow-sm border border-gray-200 hover:border-green-300">Change</button>
                </div>
            `;
        } else {
            // Show bill-to party as consignee when same as bill-to is checked
            if (state.selectedParty) {
                return `
                    <div class="relative group bg-blue-50 p-3 rounded border border-blue-200 shadow-sm">
                        <h3 class="font-bold text-sm text-blue-900 truncate" title="${state.selectedParty.firm}">${state.selectedParty.firm}</h3>
                        <p class="text-[11px] text-gray-600 truncate mt-1">${state.selectedParty.addr}</p>
                        <div class="flex items-center gap-2 mt-2">
                            <span class="bg-blue-100 text-blue-800 text-[10px] font-mono px-2 py-0.5 rounded border border-blue-200">GST: ${state.selectedParty.gstin}</span>
                            <span class="bg-blue-100 text-blue-800 text-[10px] font-mono px-2 py-0.5 rounded border border-blue-200">State: ${state.selectedParty.state || 'N/A'}</span>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <button id="btn-select-consignee" class="w-full py-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all flex flex-col items-center justify-center gap-2 group">
                        <span class="text-2xl group-hover:scale-110 transition-transform font-light">+</span>
                        <span class="text-xs font-semibold uppercase tracking-wide">Select Consignee</span>
                    </button>
                `;
            }
        }
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
            <div class="flex items-center border-b border-gray-100 text-xs text-gray-700 h-8 group bg-white pl-20 pr-2">
                <div class="flex-1 text-[10px] text-gray-500 uppercase tracking-wide">Item Narration</div>
                <div class="flex-1 p-1 border-l border-transparent group-hover:border-blue-100">
                    <input type="text" data-idx="${index}" data-field="narration" value="${item.narration || ''}" class="w-full text-xs bg-transparent border-b border-transparent focus:bg-white focus:border-blue-500 outline-none px-1" placeholder="Add narration for this item">
                </div>
            </div>
            `;
        }).join('');
    }

    // --- ROBUST TOTALS CALCULATION ---
    function renderTotals() {
        // Check GST status to determine if tax calculations should be performed
        const gstEnabled = state.gstEnabled !== undefined ? state.gstEnabled : true; // Default to true if not set
        
        let totalTaxable = 0;
        let totalTaxAmount = 0;
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;

        // Calculate line by line
        state.cart.forEach(item => {
            const lineValue = item.qty * item.rate * (1 - (item.disc || 0) / 100);
            if (gstEnabled) {
                const lineTax = lineValue * (item.grate / 100);
                totalTaxAmount += lineTax;
            }
            totalTaxable += lineValue;
        });

        // Split tax based on type (only when GST is enabled)
        if (gstEnabled && state.meta.billType === 'intra-state') {
            cgstAmount = totalTaxAmount / 2;
            sgstAmount = totalTaxAmount / 2;
        } else if (gstEnabled) {
            igstAmount = totalTaxAmount;
        }
        
        // Calculate GST on other charges (only when GST is enabled)
        let otherChargesGstTotal = 0;
        let otherChargesSubtotal = 0;
        state.otherCharges.forEach(charge => {
            const chargeAmount = parseFloat(charge.amount) || 0;
            otherChargesSubtotal += chargeAmount;
            
            if (gstEnabled) {
                const chargeGstRate = parseFloat(charge.gstRate) || 0;
                const chargeGstAmount = (chargeAmount * chargeGstRate) / 100;
                otherChargesGstTotal += chargeGstAmount;
            }
        });
        
        // Calculate final tax amounts including other charges GST (only when GST is enabled)
        let finalCgstAmount = gstEnabled && state.meta.billType === 'intra-state' ? cgstAmount + (otherChargesGstTotal / 2) : 0;
        let finalSgstAmount = gstEnabled && state.meta.billType === 'intra-state' ? sgstAmount + (otherChargesGstTotal / 2) : 0;
        let finalIgstAmount = gstEnabled && state.meta.billType !== 'intra-state' ? igstAmount + otherChargesGstTotal : 0;
        
        // For reverse charge, tax is still calculated but liability shifts to recipient
        // The invoice still shows the tax amounts but indicates reverse charge
        if (state.meta.reverseCharge && gstEnabled) {
            finalCgstAmount = 0;
            finalSgstAmount = 0;
            finalIgstAmount = 0;
        }
        
        // When GST is disabled, tax values are 0, so grand total is just taxable amount + other charges
        const grandTotal = totalTaxable + (gstEnabled && state.meta.reverseCharge ? 0 : totalTaxAmount) + otherChargesSubtotal + (gstEnabled && state.meta.reverseCharge ? 0 : otherChargesGstTotal);

        return `
        <div class="flex justify-between items-start">
            <div class="text-[11px] text-gray-400 space-y-1">
                <div class="flex gap-4">
                    <span>Total Items: <b class="text-gray-600">${state.cart.length}</b></span>
                    <span>Total Quantity: <b class="text-gray-600">${state.cart.reduce((a, b) => a + Number(b.qty), 0).toFixed(2)}</b></span>
                </div>
                ${state.meta.reverseCharge ? '<div class="text-red-600 font-bold mt-1">REVERSE CHARGE APPLIES</div>' : ''}
                <div class="text-gray-400 italic mt-2">* Rates are inclusive of discounts before tax</div>
            </div>

            <div class="flex gap-10 text-xs">
                <div class="text-right space-y-1.5 text-gray-500 font-medium">
                    <div>Taxable Value</div>
                    ${state.meta.billType === 'intra-state'
                ? `<div>CGST Output</div><div>SGST Output</div>`
                : `<div>IGST Output</div>`
            }
                    ${state.otherCharges.length > 0 ? `<div>Other Charges</div>` : ''}
                    <div class="pt-2 mt-2 border-t border-gray-200 font-bold text-gray-700">Grand Total</div>
                </div>

                <div class="text-right space-y-1.5 font-mono font-bold text-gray-800">
                    <div>${formatCurrency(totalTaxable)}</div>
                    ${state.meta.billType === 'intra-state'
                ? `<div class="text-gray-600">${formatCurrency(finalCgstAmount)}</div><div class="text-gray-600">${formatCurrency(finalSgstAmount)}</div>`
                : `<div class="text-gray-600">${formatCurrency(finalIgstAmount)}</div>`
            }
                    ${state.otherCharges.length > 0 ? `<div class="text-gray-600">${formatCurrency(otherChargesSubtotal)}</div>` : ''}
                    <div class="pt-2 mt-2 border-t border-gray-200 font-bold text-lg text-blue-700 leading-none">
                        ${formatCurrency(grandTotal)}
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    // --- EVENT HANDLERS ---

    function refreshTable() {
        if (container.querySelector('#items-container')) {
            container.querySelector('#items-container').innerHTML = renderItemsList();
        }
        if (container.querySelector('#totals-section')) {
            container.querySelector('#totals-section').innerHTML = renderTotals();
        }
        if (container.querySelector('#other-charges-list')) {
            container.querySelector('#other-charges-list').innerHTML = renderOtherChargesList();
        }
        if (document.getElementById('total-other-charges')) {
            document.getElementById('total-other-charges').textContent = formatCurrency(getTotalOtherCharges());
        }
    }

    function attachGlobalListeners() {
        // Add keyboard event listener for F2 key
        document.onkeydown = (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                openStockModal();
            }
        };
        
        // Bill number change
        const billNoInput = document.getElementById('bill-no-input');
        if (billNoInput) {
            billNoInput.addEventListener('input', (e) => {
                state.meta.billNo = e.target.value;
            });
        }

        // Bill date change
        const billDateInput = document.getElementById('bill-date-input');
        if (billDateInput) {
            billDateInput.addEventListener('change', (e) => {
                state.meta.billDate = e.target.value;
            });
        }

        // Bill type selector
        const billTypeSelector = document.getElementById('billTypeSelector');
        if (billTypeSelector) {
            billTypeSelector.addEventListener('change', (e) => {
                state.meta.billType = e.target.value;
                refreshTable();
            });
        }

        // Reverse charge toggle
        const reverseChargeToggle = document.getElementById('reverse-charge-toggle');
        if (reverseChargeToggle) {
            reverseChargeToggle.addEventListener('change', (e) => {
                state.meta.reverseCharge = e.target.checked;
                refreshTable();
            });
        }

        // Reference number
        const referenceNoInput = document.getElementById('reference-no');
        if (referenceNoInput) {
            referenceNoInput.addEventListener('input', (e) => {
                state.meta.referenceNo = e.target.value;
            });
        }

        // Vehicle number
        const vehicleNoInput = document.getElementById('vehicle-no');
        if (vehicleNoInput) {
            vehicleNoInput.addEventListener('input', (e) => {
                state.meta.vehicleNo = e.target.value;
            });
        }

        // Dispatch through
        const dispatchInput = document.getElementById('dispatch-through');
        if (dispatchInput) {
            dispatchInput.addEventListener('input', (e) => {
                state.meta.dispatchThrough = e.target.value;
            });
        }

        // Narration
        const narrationInput = document.getElementById('narration');
        if (narrationInput) {
            narrationInput.addEventListener('input', (e) => {
                state.meta.narration = e.target.value;
            });
        }

        // Update button
        const updateBtn = document.getElementById('btn-update');
        if (updateBtn) {
            updateBtn.addEventListener('click', updateBill);
        }

        // Reset button
        const resetBtn = document.getElementById('btn-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset the form? All changes will be lost.')) {
                    location.reload();
                }
            });
        }

        // Other charges button
        const otherChargesBtn = document.getElementById('btn-other-charges');
        if (otherChargesBtn) {
            otherChargesBtn.addEventListener('click', openOtherChargesModal);
        }

        // Party selection buttons
        const selectPartyBtn = document.getElementById('btn-select-party');
        if (selectPartyBtn) {
            selectPartyBtn.addEventListener('click', openPartyModal);
        }

        const changePartyBtn = document.getElementById('btn-change-party');
        if (changePartyBtn) {
            changePartyBtn.addEventListener('click', openPartyModal);
        }

        // Add item button
        const addItemBtn = document.getElementById('btn-add-item');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', openStockModal);
        }
        
        // Consignee same as bill-to toggle
        const consigneeSameAsBillToCheckbox = document.getElementById('edit-bill-consignee-same-as-bill-to');
        if (consigneeSameAsBillToCheckbox) {
            consigneeSameAsBillToCheckbox.addEventListener('change', (e) => {
                state.consigneeSameAsBillTo = e.target.checked;
                if (e.target.checked && state.selectedParty) {
                    // When checked, use bill-to party as consignee
                    state.selectedConsignee = {
                        name: state.selectedParty.firm,
                        address: state.selectedParty.addr,
                        gstin: state.selectedParty.gstin,
                        state: state.selectedParty.state,
                        pin: state.selectedParty.pin || null,
                        stateCode: state.selectedParty.state_code || null
                    };
                } else if (!e.target.checked) {
                    // If unchecked, keep existing consignee data or set to null
                    // Don't modify state.selectedConsignee if unchecking
                } else {
                    // If no party is selected and checkbox is checked, clear consignee
                    state.selectedConsignee = null;
                }
                // Update the UI to reflect the change
                if (container.querySelector('#consignee-display')) {
                    container.querySelector('#consignee-display').innerHTML = renderConsigneeCard();
                    // Reattach event listeners for the new elements
                    attachConsigneeEventListeners();
                }
            });
        }
        
        // Attach consignee-specific event listeners
        attachConsigneeEventListeners();
    }

    function attachTableListeners() {
        // Quantity, rate, and discount input changes
        container.addEventListener('input', (e) => {
            if (e.target.classList.contains('tbl-input')) {
                const idx = parseInt(e.target.dataset.idx);
                const field = e.target.dataset.field;
                const value = e.target.value;

                if (!isNaN(idx) && state.cart[idx]) {
                    if (field === 'qty' || field === 'rate' || field === 'disc') {
                        state.cart[idx][field] = parseFloat(value) || 0;
                    } else if (field === 'narration') {
                        state.cart[idx][field] = value;
                    }
                    refreshTable();
                }
            }
        });

        // Remove item buttons
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove')) {
                const idx = parseInt(e.target.dataset.idx);
                if (!isNaN(idx) && state.cart[idx]) {
                    if (confirm('Are you sure you want to remove this item?')) {
                        state.cart.splice(idx, 1);
                        refreshTable();
                    }
                }
            }
        });
    }
    
    function attachConsigneeEventListeners() {
        // Change consignee button
        const changeConsigneeBtn = document.getElementById('btn-change-consignee');
        if (changeConsigneeBtn) {
            changeConsigneeBtn.addEventListener('click', () => {
                // In edit mode, we can't really change the consignee from a list
                // So we'll just show an alert explaining that it would be implemented differently
                alert('Consignee modification functionality would be implemented here in a full implementation.');
            });
        }
        
        // Select consignee button (for when no consignee is set)
        const selectConsigneeBtn = document.getElementById('btn-select-consignee');
        if (selectConsigneeBtn) {
            selectConsigneeBtn.addEventListener('click', () => {
                // In edit mode, we can't really select a consignee from a list
                // So we'll just show an alert explaining that it would be implemented differently
                alert('Consignee selection functionality would be implemented here in a full implementation.');
            });
        }
    }
    
    // Update bill function
    async function updateBill() {
        try {
            // Validate required fields
            if (!state.meta.billNo.trim()) {
                alert('Bill number is required');
                return;
            }

            if (state.cart.length === 0) {
                alert('At least one item is required');
                return;
            }

            // Prepare the bill data
            const billData = {
                meta: state.meta,
                party: state.selectedParty,
                cart: state.cart,
                otherCharges: state.otherCharges,
                consignee: state.selectedConsignee
            };

            // Show loading state
            const updateBtn = document.getElementById('btn-update');
            const originalText = updateBtn.innerHTML;
            updateBtn.innerHTML = '<span class="animate-spin">⏳</span> Updating...';
            updateBtn.disabled = true;

            // Call the update API
            const response = await window.api.put(`/inventory/api/bills/${billId}`, billData);
            
            // Also update the consignee data if it exists
            if (state.selectedConsignee) {
                // The consignee data is already included in the main billData object
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update bill');
            }

            const result = await response.json();
            
            // Show success message
            alert('Bill updated successfully!');
            
            // Redirect back to sales report or stay on page based on user choice
            if (confirm('Bill updated successfully! Would you like to go back to the sales report?')) {
                window.location.href = '/inventory/sales-report';
            } else {
                // Reload to refresh any potential changes
                location.reload();
            }

        } catch (err) {
            console.error('Update bill error:', err);
            alert('Error updating bill: ' + err.message);
        } finally {
            // Restore button
            const updateBtn = document.getElementById('btn-update');
            if (updateBtn) {
                updateBtn.innerHTML = '<span>🔄</span> Update Invoice';
                updateBtn.disabled = false;
            }
        }
    }

    // --- MODAL FUNCTIONS ---

    function openOtherChargesModal() {
        const modal = document.getElementById('other-charges-modal-backdrop');
        if (!modal) return;

        modal.classList.remove('hidden');

        // Add event listeners for the modal
        document.getElementById('close-other-charges-modal').onclick = () => modal.classList.add('hidden');
        document.getElementById('cancel-other-charges').onclick = () => modal.classList.add('hidden');
        
        // Save charges button
        document.getElementById('save-other-charges').onclick = () => {
            modal.classList.add('hidden');
        };

        // Add charge button
        document.getElementById('add-charge-btn').onclick = () => {
            const name = document.getElementById('charge-name').value;
            const hsnSac = document.getElementById('charge-hsn').value;
            const amount = parseFloat(document.getElementById('charge-amount').value) || 0;
            const gstRate = parseFloat(document.getElementById('charge-gst').value) || 0;
            const type = document.getElementById('charge-type').value;

            if (!name) {
                alert('Charge name is required');
                return;
            }

            if (amount <= 0) {
                alert('Charge amount must be greater than 0');
                return;
            }

            const charge = {
                name,
                hsnSac,
                amount,
                gstRate,
                type
            };

            addOtherCharge(charge);

            // Clear form
            document.getElementById('charge-name').value = '';
            document.getElementById('charge-hsn').value = '';
            document.getElementById('charge-amount').value = '';
            document.getElementById('charge-gst').value = '';
            document.getElementById('charge-type').value = 'freight';

            // Update total in modal
            document.getElementById('total-other-charges').textContent = formatCurrency(getTotalOtherCharges());
        };

        // Remove charge buttons (delegated event)
        document.getElementById('other-charges-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-charge')) {
                const idx = parseInt(e.target.dataset.index);
                if (!isNaN(idx)) {
                    if (confirm('Are you sure you want to remove this charge?')) {
                        removeOtherCharge(idx);
                        document.getElementById('total-other-charges').textContent = formatCurrency(getTotalOtherCharges());
                    }
                }
            }
            else if (e.target.classList.contains('btn-edit-charge')) {
                const idx = parseInt(e.target.dataset.index);
                if (!isNaN(idx)) {
                    const charge = state.otherCharges[idx];
                    document.getElementById('charge-name').value = charge.name || '';
                    document.getElementById('charge-hsn').value = charge.hsnSac || '';
                    document.getElementById('charge-amount').value = charge.amount || '';
                    document.getElementById('charge-gst').value = charge.gstRate || '';
                    document.getElementById('charge-type').value = charge.type || 'freight';
                    
                    // Remove the charge from the list since we're editing it
                    removeOtherCharge(idx);
                }
            }
        });
    }

    function openPartyModal() {
        // Implementation would be similar to the original sls.js but simplified
        // For now, we'll just show an alert since full implementation would require more complex party selection
        alert('Party selection functionality would be implemented here');
    }

    function openStockModal() {
        // Create stock selection modal
        const modalBackdrop = document.getElementById('modal-backdrop');
        const modalContent = document.getElementById('modal-content');
        
        if (!modalBackdrop || !modalContent) return;
        
        modalContent.innerHTML = `
        <div class="bg-slate-800 p-4 flex justify-between items-center">
            <h3 class="font-bold text-white text-sm tracking-wide">ADD STOCK ITEM</h3>
            <button id="close-stock-modal" class="hover:text-red-300 text-lg transition-colors">&times;</button>
        </div>
        
        <div class="p-6 flex-1 overflow-y-auto">
            <div class="mb-4">
                <input type="text" id="search-stock-input" placeholder="Search stocks by name, hsn, or oem..." 
                       class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                <div id="stock-suggestions" class="absolute z-20 w-full bg-white border border-gray-300 rounded shadow-lg mt-1 max-h-60 overflow-y-auto hidden"></div>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-100 text-[11px] font-bold text-gray-500 uppercase">
                        <tr>
                            <th class="p-3">Item</th>
                            <th class="p-3">HSN</th>
                            <th class="p-3">OEM</th>
                            <th class="p-3 text-center">Available Qty</th>
                            <th class="p-3 text-center">UOM</th>
                            <th class="p-3 text-right">Rate</th>
                            <th class="p-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody id="stock-results" class="text-xs text-gray-700 divide-y divide-gray-100">
                        ${renderStockResults(state.stocks)}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="p-4 border-t border-gray-200 flex justify-end gap-3">
            <button id="cancel-stock-selection" class="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 rounded">Cancel</button>
        </div>`;
        
        modalBackdrop.classList.remove('hidden');
        
        // Attach event listeners
        document.getElementById('close-stock-modal').onclick = () => modalBackdrop.classList.add('hidden');
        document.getElementById('cancel-stock-selection').onclick = () => modalBackdrop.classList.add('hidden');
        
        // Search functionality
        const searchInput = document.getElementById('search-stock-input');
        searchInput.oninput = debounce((e) => {
            const query = e.target.value.toLowerCase();
            const filteredStocks = state.stocks.filter(stock => 
                stock.item.toLowerCase().includes(query) || 
                (stock.hsn && stock.hsn.toLowerCase().includes(query)) ||
                (stock.oem && stock.oem.toLowerCase().includes(query))
            );
            document.getElementById('stock-results').innerHTML = renderStockResults(filteredStocks);
            
            // Reattach event listeners for the new rows
            attachAddStockEventListeners(filteredStocks);
        }, 300);
        
        // Attach event listeners for add buttons
        attachAddStockEventListeners(state.stocks);
    }
    
    function renderStockResults(stocks) {
        if (stocks.length === 0) {
            return `<tr><td colspan="7" class="p-3 text-center text-gray-400 italic">No stocks found</td></tr>`;
        }
        
        return stocks.map(stock => {
            // Calculate available quantity from batches
            let availableQty = 0;
            if (stock.batches) {
                try {
                    // Check if batches is already an object/array or a JSON string
                    const batches = Array.isArray(stock.batches) ? stock.batches : JSON.parse(stock.batches);
                    availableQty = batches.reduce((sum, batch) => sum + (batch.qty || 0), 0);
                } catch (e) {
                    console.warn('Error parsing batches for stock:', stock.item, e);
                    availableQty = stock.qty || 0; // fallback to overall quantity
                }
            } else {
                availableQty = stock.qty || 0;
            }
            
            return `
            <tr class="hover:bg-blue-50 transition-colors">
                <td class="p-3 font-medium">
                    <div>${stock.item}</div>
                    <div class="text-[10px] text-gray-500">${stock.pno || ''}</div>
                </td>
                <td class="p-3 text-gray-500">${stock.hsn || ''}</td>
                <td class="p-3 text-gray-500">${stock.oem || ''}</td>
                <td class="p-3 text-center font-bold text-blue-700">${availableQty}</td>
                <td class="p-3 text-center text-gray-500">${stock.uom || ''}</td>
                <td class="p-3 text-right font-bold">${formatCurrency(stock.rate || 0)}</td>
                <td class="p-3 text-center">
                    <button class="btn-add-stock text-green-600 hover:text-green-800 transition-colors font-bold text-lg leading-none" 
                            data-stock-id="${stock.id}" data-available-qty="${availableQty}">+
                    </button>
                </td>
            </tr>`;
        }).join('');
    }
    
    function attachAddStockEventListeners(stocks) {
        // Use event delegation for add buttons
        document.getElementById('stock-results').addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-add-stock')) {
                const stockId = e.target.dataset.stockId;
                const availableQty = parseFloat(e.target.dataset.availableQty) || 0;
                
                const stock = stocks.find(s => s.id == stockId);
                if (!stock) return;
                
                // For now, just check if stockId exists without specifying batch
                // When user selects a specific batch, we'll check the combination
                // First, let's see if there are multiple batches to select from
                let batches = [];
                if (stock.batches) {
                    try {
                        batches = Array.isArray(stock.batches) ? stock.batches : JSON.parse(stock.batches);
                    } catch (e) {
                        console.warn('Error parsing batches, using empty array:', e);
                        batches = [];
                    }
                }
                
                if (batches.length > 1) {
                    // Multiple batches, user needs to select one
                    // Check will happen after batch selection
                    showBatchSelectionModal(stock, availableQty);
                    return;
                } else if (batches.length === 1) {
                    // Single batch - check if this stock+batch combination exists
                    const existingCartItemIndex = state.cart.findIndex(item => 
                        item.stockId == stockId && item.batch === batches[0].batch
                    );
                    if (existingCartItemIndex !== -1) {
                        alert('This item with the same batch is already in the cart. You can modify the existing entry instead.');
                        return;
                    }
                    // Single batch, use it directly
                    addToCartFromStock(stock, batches[0]);
                } else {
                    // No batches - check if stock exists regardless of batch
                    const existingCartItemIndex = state.cart.findIndex(item => 
                        item.stockId == stockId && item.batch === null
                    );
                    if (existingCartItemIndex !== -1) {
                        alert('This item is already in the cart. You can modify the existing entry instead.');
                        return;
                    }
                    // No batches, use default
                    addToCartFromStock(stock, null);
                }
            }
        });
    }
    
    function showBatchSelectionModal(stock, availableQty) {
        try {
            // Handle both string and object formats for batches
            const batches = Array.isArray(stock.batches) ? stock.batches : JSON.parse(stock.batches);
            
            const modalBackdrop = document.getElementById('sub-modal-backdrop');
            const modalContent = document.getElementById('sub-modal-content');
            
            if (!modalBackdrop || !modalContent) return;
            
            modalContent.innerHTML = `
            <div class="bg-slate-800 p-4 flex justify-between items-center">
                <h3 class="font-bold text-white text-sm tracking-wide">SELECT BATCH FOR ${stock.item.toUpperCase()}</h3>
                <button id="close-batch-modal" class="hover:text-red-300 text-lg transition-colors">&times;</button>
            </div>
            
            <div class="p-6">
                <div class="mb-4 text-sm text-gray-600">
                    <span>Total Available: </span>
                    <span class="font-bold text-blue-700">${availableQty} ${stock.uom || ''}</span>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-100 text-[10px] font-bold text-gray-500 uppercase">
                            <tr>
                                <th class="p-3">Batch</th>
                                <th class="p-3 text-center">Expiry</th>
                                <th class="p-3 text-center">Available Qty</th>
                                <th class="p-3 text-center">Rate</th>
                                <th class="p-3 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody class="text-xs text-gray-700 divide-y divide-gray-100">
                            ${batches.map(batch => `
                            <tr class="hover:bg-blue-50 transition-colors">
                                <td class="p-3 font-medium">${batch.batch || 'N/A'}</td>
                                <td class="p-3 text-center text-gray-500">${batch.expiry || 'N/A'}</td>
                                <td class="p-3 text-center font-bold text-blue-700">${batch.qty}</td>
                                <td class="p-3 text-center font-bold">${formatCurrency(batch.rate || stock.rate || 0)}</td>
                                <td class="p-3 text-center">
                                    <button class="btn-select-batch text-green-600 hover:text-green-800 transition-colors font-bold text-lg leading-none" 
                                            data-batch='${JSON.stringify(batch).replace(/'/g, '&quot;')}'>+
                                    </button>
                                </td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
            
            modalBackdrop.classList.remove('hidden');
            
            // Close button
            document.getElementById('close-batch-modal').onclick = () => modalBackdrop.classList.add('hidden');
            
            // Batch selection buttons
            const batchButtons = modalContent.querySelectorAll('.btn-select-batch');
            batchButtons.forEach(button => {
                button.onclick = () => {
                    const batch = JSON.parse(button.dataset.batch.replace(/&quot;/g, '"'));
                    
                    // Check if this stock+batch combination is already in the cart
                    const existingCartItemIndex = state.cart.findIndex(item => 
                        item.stockId == stock.id && item.batch === batch.batch
                    );
                    if (existingCartItemIndex !== -1) {
                        alert('This item with the same batch is already in the cart. You can modify the existing entry instead.');
                        return;
                    }
                    
                    addToCartFromStock(stock, batch);
                    modalBackdrop.classList.add('hidden');
                };
            });
        } catch (e) {
            console.error('Error showing batch selection modal:', e);
            alert('Error showing batch selection: ' + e.message);
        }
    }
    
    function addToCartFromStock(stock, batch = null) {
        // Create a new cart item based on the selected stock and batch
        const newItem = {
            id: null, // Will be set by backend
            stockId: stock.id,
            item: stock.item,
            hsn: stock.hsn,
            qty: 1, // Default quantity
            uom: stock.uom,
            rate: batch ? (batch.rate || stock.rate || 0) : (stock.rate || 0),
            disc: 0, // Default discount
            grate: stock.grate || 0, // GST rate
            batch: batch ? batch.batch : null,
            total: batch ? (batch.rate || stock.rate || 0) : (stock.rate || 0),
            narration: '' // Default narration
        };
        
        // Add to cart
        state.cart.push(newItem);
        
        // Refresh the UI
        refreshTable();
        
        // Close the stock modal
        const modalBackdrop = document.getElementById('modal-backdrop');
        if (modalBackdrop) {
            modalBackdrop.classList.add('hidden');
        }
        
        // Show confirmation
        alert(`${stock.item} added to cart successfully!`);
    }
    
    // Debounce utility function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Initialize the edit bill system
    fetchData();

})();