(function dntInitSalesSystem() {
    console.log('SLS: Initializing Professional Sales System...');
    const container = document.getElementById('debit-note');
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
        historyCache: {},
        meta: {
            dntBillNo: '',
            billDate: new Date().toISOString().split('T')[0],
            billType: 'intra-state', // 'intra-state' or 'inter-state'
            reverseCharge: false,
            referenceNo: '',
            vehicleNo: '',
            dispatchThrough: '',
            narration: ''
        },
        otherCharges: [],  // Array to store other charges
        currentFirmName: 'Your Company Name'  // Initialize with default
    };

    // Fetch current user's firm name
    async function dntFetchCurrentUserFirmName() {
        try {
            const response = await window.api.get('/inventory/dnt/api/current-user-firm-name');
            const data = await response.json();

            if (data.firmName) {
                state.currentFirmName = data.firmName;
                // Update any existing references to the firm name
                if (window.currentUserFirmName !== data.firmName) {
                    window.currentUserFirmName = data.firmName;
                }
            }
        } catch (error) {
            console.warn('Could not fetch current user firm name:', error.message);
            // Keep the default value if API fails
        }
    }

    // Initialize firm name when the module loads
    dntFetchCurrentUserFirmName();

    // --- UTILS ---
    function dntFormatCurrency(amount) {
        return (new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })).format(amount);
    }
    
    const dntGetHistoryCacheKey = (partyId, stockId) => `${partyId}:${stockId}`;

    // --- OTHER CHARGES MANAGEMENT ---
    function dntAddOtherCharge(charge) {
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
        dntRefreshTable();
    }

    function dntRemoveOtherCharge(index) {
        state.otherCharges.splice(index, 1);
        dntRefreshTable();
    }

    function dntUpdateOtherCharge(index, charge) {
        // Calculate GST amount only if GST is enabled
        if (state.gstEnabled !== false) {  // Default to enabled if not set
            charge.gstAmount = (charge.amount * (charge.gstRate || 0)) / 100;
        } else {
            charge.gstAmount = 0; // No GST when disabled
        }

        state.otherCharges[index] = charge;
        dntRefreshTable();
    }

    function dntGetTotalOtherCharges() {
        // Calculate total amount of other charges (excluding their GST)
        return state.otherCharges.reduce((sum, charge) => {
            return sum + (parseFloat(charge.amount) || 0);
        }, 0);
    }

    // --- DATA FETCHING ---
    // Helper function to fetch next bill number
    async function dntFetchNextBillNumber() {
        try {
            const billNoRes = await window.api.get('/inventory/dnt/api/bills/next-number');
            const billNoData = await billNoRes.json();
            
            // Validate that billNoData.nextBillNo is a string, not an object
            if (typeof billNoData.nextBillNo === 'string') {
                state.meta.dntBillNo = billNoData.nextBillNo;
            } else {
                console.warn('Invalid bill number data received, using placeholder', billNoData);
                state.meta.dntBillNo = 'Will be generated on save';
            }
        } catch (e) {
            console.warn("Could not fetch next bill number info, using placeholder", e);
            state.meta.dntBillNo = 'Will be generated on save';
        }
    }

    async function dntFetchData() {
        try {
            // 1. Fetch Stocks
            const res = await window.api.get('/inventory/dnt/api/stocks');
            const data = await res.json();

            if (data.error) throw new Error(data.error);
            state.stocks = Array.isArray(data) ? data : [];

            // 2. Fetch Parties
            try {
                const partyRes = await window.api.get('/inventory/dnt/api/parties');
                const partyData = await partyRes.json();
                state.parties = Array.isArray(partyData) ? partyData : [];
            } catch (e) {
                console.warn("Could not fetch parties, starting with empty list", e);
                state.parties = [];
            }

            // 3. Fetch next bill number info (non-consuming)
            await dntFetchNextBillNumber();

            // 4. Fetch GST status
            try {
                const gstStatusRes = await window.api.get('/admin/gst-status');
                const gstStatusData = await gstStatusRes.json();
                state.gstEnabled = gstStatusData.gst_enabled;
            } catch (e) {
                console.warn("Could not fetch GST status, defaulting to enabled", e);
                state.gstEnabled = true; // Default to enabled if API fails
            }

            dntRenderLayout();
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

    // --- MAIN RENDERER ---
    function dntRenderLayout() {
        container.innerHTML = `
        <div class="h-[calc(100vh-140px)] flex flex-col bg-gray-50 text-slate-800 font-sans text-sm border border-gray-300 rounded-lg shadow-sm overflow-hidden">
            
            <div class="bg-white border-b border-gray-200 p-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-sm z-20">
                <div class="flex flex-col sm:flex-row flex-wrap gap-2">
                    <div class="flex flex-col">
                        <label class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Bill No</label>
                        <input type="text" value="${state.meta.dntBillNo}" readonly class="border border-gray-300 rounded px-2 py-1 text-xs font-bold w-32 bg-gray-100 text-slate-500 cursor-not-allowed" title="Auto-generated when saved">
                    </div>
                    <div class="flex flex-col">
                        <label class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Date</label>
                        <input type="date" value="${state.meta.billDate}" class="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-slate-700">
                    </div>
                    <div class="flex flex-col">
                        <label class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Transaction Type</label>
                        <select id="dnt-billTypeSelector" class="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 font-medium">
                            <option value="intra-state" ${state.meta.billType === 'intra-state' ? 'selected' : ''}>Intra-State (CGST + SGST)</option>
                            <option value="inter-state" ${state.meta.billType === 'inter-state' ? 'selected' : ''}>Inter-State (IGST)</option>
                        </select>
                    </div>
                    
                    <div class="flex items-center gap-2 pt-4">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="dnt-reverse-charge-toggle" ${state.meta.reverseCharge ? 'checked' : ''} class="form-checkbox h-4 w-4 text-blue-600 rounded">
                            <span class="ml-2 text-[10px] uppercase text-gray-500 font-bold tracking-wider whitespace-nowrap">Reverse Charge</span>
                        </label>
                        <div class="text-[10px] font-bold px-2 py-1 rounded ${state.gstEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            GST: ${state.gstEnabled ? 'ON' : 'OFF'}
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap gap-2">
                    <button id="dnt-btn-other-charges" class="px-3 py-1.5 text-xs text-blue-600 border border-blue-200 bg-blue-50 rounded hover:bg-blue-100 transition-colors whitespace-nowrap">Other Charges</button>
                    <button id="dnt-btn-reset" class="px-3 py-1.5 text-xs text-red-600 border border-red-200 bg-red-50 rounded hover:bg-red-100 transition-colors whitespace-nowrap">Reset</button>
                    <button id="dnt-btn-save" class="px-4 py-1.5 bg-slate-800 text-white text-xs rounded hover:bg-slate-900 shadow font-medium flex items-center gap-2 transition-colors whitespace-nowrap">
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
                        <div id="dnt-party-display">
                            <div class="group bg-blue-50 p-3 rounded border border-blue-200 shadow-sm">
                                <div>
                                    <h3 class="font-bold text-sm text-blue-900 truncate">Loading...</h3>
                                    <p class="text-[11px] text-gray-600 truncate mt-1">Please wait</p>
                                    <div class="flex items-center gap-2 mt-2">
                                        <span class="bg-blue-100 text-blue-800 text-[10px] font-mono px-2 py-0.5 rounded border border-blue-200">GST: -</span>
                                    </div>
                                    <div class="flex items-center gap-2 mt-2">
                                        <span class="bg-gray-100 text-gray-800 text-[10px] font-mono px-2 py-0.5 rounded border border-gray-200">
                                            BAL: Loading...
                                        </span>
                                    </div>
                                    <div class="mt-2 text-right">
                                        <button id="dnt-btn-change-party" class="text-[10px] text-blue-600 hover:text-blue-800 font-bold bg-white px-2 py-1 rounded shadow-sm border border-gray-200 hover:border-blue-300 whitespace-nowrap">
                                            Change
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="p-3 space-y-3">
                         <div>
                            <label class="text-[10px] text-gray-500 font-bold">Reference / PO No</label>
                            <input type="text" id="dnt-reference-no" value="${state.meta.referenceNo}" class="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none" placeholder="e.g. PO-2025-001">
                        </div>
                        <div>
                            <label class="text-[10px] text-gray-500 font-bold">Vehicle No</label>
                            <input type="text" id="dnt-vehicle-no" value="${state.meta.vehicleNo}" class="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none" placeholder="XX-00-XX-0000">
                        </div>
                        <div>
                            <label class="text-[10px] text-gray-500 font-bold">Dispatched Through</label>
                            <input type="text" id="dnt-dispatch-through" value="${state.meta.dispatchThrough}" class="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none" placeholder="Courier / Transport">
                        </div>
                        <div>
                            <label class="text-[10px] text-gray-500 font-bold">Narration</label>
                            <textarea id="dnt-narration" class="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none h-20 resize-none" placeholder="Additional notes...">${state.meta.narration}</textarea>
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

                    <div class="flex-1 overflow-y-auto custom-scrollbar relative" id="dnt-items-container">
                        ${dntRenderItemsList()}
                    </div>

                    <div class="p-2 border-t border-dashed border-gray-200 bg-gray-50 shrink-0">
                        <button id="dnt-btn-add-item" class="w-full py-2 border border-dashed border-blue-300 text-blue-600 rounded hover:bg-blue-50 text-xs font-bold transition-colors uppercase tracking-wide">
                            + Add Items (F2) | Select Party (F3) | Charges (F4)
                        </button>
                    </div>

                    <div class="bg-slate-50 border-t border-slate-300 p-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]" id="dnt-totals-section">
                        ${dntRenderTotals()}
                    </div>
                </div>
            </div>
        </div>

        <div id="dnt-modal-backdrop" class="fixed inset-0 bg-black/50 hidden z-40 flex items-center justify-center backdrop-blur-sm transition-opacity">
            <div id="dnt-modal-content" class="bg-white rounded shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-down">
                </div>
        </div>

        <div id="dnt-sub-modal-backdrop" class="fixed inset-0 bg-black/60 hidden z-50 flex items-center justify-center backdrop-blur-sm transition-opacity">
            <div id="dnt-sub-modal-content" class="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-300 animate-scale-in">
                </div>
        </div>
        
        <!-- Other Charges Modal -->
        <div id="dnt-other-charges-modal-backdrop" class="fixed inset-0 bg-black/60 hidden z-50 flex items-center justify-center backdrop-blur-sm transition-opacity">
            <div id="dnt-other-charges-modal-content" class="bg-white rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-300 animate-scale-in">
                <div class="bg-slate-800 p-4 flex justify-between items-center text-white">
                    <h3 class="font-bold text-sm tracking-wide">OTHER CHARGES</h3>
                    <button id="dnt-close-other-charges-modal" class="hover:text-red-300 text-lg transition-colors">&times;</button>
                </div>
                
                <div class="p-6">
                    <div class="flex gap-4 mb-4">
                        <div class="relative flex-1">
                            <input type="text" id="dnt-charge-name" placeholder="Charge Name" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                            <div id="dnt-charge-name-suggestions" class="absolute z-10 w-full min-w-[400px] bg-white border border-gray-300 rounded shadow-lg mt-1 max-h-40 overflow-y-auto hidden"></div>
                        </div>
                        <input type="text" id="dnt-charge-hsn" placeholder="HSN/SAC" class="w-24 border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" title="Enter HSN for goods or SAC for services">
                        <input type="number" id="dnt-charge-amount" placeholder="Amount" step="0.01" class="w-32 border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                        <input type="number" id="dnt-charge-gst" placeholder="GST %" step="0.01" class="w-24 border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                        <select id="dnt-charge-type" class="w-40 border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none bg-white">
                            <option value="freight">Freight</option>
                            <option value="packing">Packing</option>
                            <option value="handling">Handling</option>
                            <option value="insurance">Insurance</option>
                            <option value="others">Others</option>
                        </select>
                        <button id="dnt-add-charge-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap">
                            ADD
                        </button>
                    </div>
                    
                    <div class="mb-4 text-sm text-gray-600">
                        <span>Total Other Charges: </span>
                        <span id="dnt-total-other-charges" class="font-bold text-blue-700">0.00</span>
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
                            <tbody id="dnt-other-charges-list" class="text-xs text-gray-700 divide-y divide-gray-100">
                                ${dntRenderOtherChargesList()}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="p-4 border-t border-gray-200 flex justify-end gap-3">
                    <button id="dnt-cancel-other-charges" class="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 rounded">Cancel</button>
                    <button id="dnt-save-other-charges" class="px-6 py-2 bg-green-600 text-white text-sm font-bold rounded shadow hover:bg-green-700 transition-colors">DONE</button>
                </div>
            </div>
        </div>
        `;

        // After rendering the layout, update the party display with async data
        const partyContainer = document.getElementById('dnt-party-display');
        if (partyContainer) {
            dntRenderPartyCard().then(html => {
                partyContainer.innerHTML = html;

                // Attach event listeners for both change and select buttons
                const changeBtn = document.getElementById('dnt-btn-change-party');
                if (changeBtn) changeBtn.addEventListener('click', dntOpenPartyModal);

                const selectBtn = document.getElementById('dnt-btn-select-party');
                if (selectBtn) selectBtn.addEventListener('click', dntOpenPartyModal);
            });
        }

        dntAttachGlobalListeners();
        dntAttachTableListeners();
    }

    // --- RENDER HELPERS ---

    function dntRenderOtherChargesList() {
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
                <td class="p-3 text-right font-bold text-gray-800">${dntFormatCurrency(charge.amount)}</td>
                <td class="p-3 text-right font-bold text-gray-800">${(charge.gstRate || 0)}%</td>
                <td class="p-3 text-center">
                    <button class="btn-remove-charge text-red-600 hover:text-red-800 transition-colors font-bold text-lg leading-none" data-index="${index}">&times;</button>
                </td>
            </tr>
            <tr class="hover:bg-blue-50 transition-colors bg-gray-50">
                <td class="p-1 text-right text-gray-500 text-xs" colspan="3">GST (${(charge.gstRate || 0)}%):</td>
                <td class="p-1 text-right text-gray-500 text-xs">${dntFormatCurrency(gstAmount)}</td>
                <td class="p-1 text-right text-gray-500 text-xs font-bold">Total:</td>
                <td class="p-1 text-right text-gray-800 text-xs font-bold">${dntFormatCurrency(totalAmount)}</td>
            </tr>`;
        }).join('');
    }

    async function dntRenderPartyCard() {
        if (state.selectedParty) {
            // Fetch party balance
            let balanceInfo = null;
            try {
                const balanceResponse = await window.api.get(`/inventory/api/parties/${state.selectedParty.id}/balance`);
                balanceInfo = await balanceResponse.json();
            } catch (error) {
                console.error('Error fetching party balance:', error);
                balanceInfo = { balance: 0, balanceType: 'Credit', balanceFormatted: '₹0.00' };
            }

            return `
                <div class="group bg-blue-50 p-3 rounded border border-blue-200 shadow-sm">
                    <div>
                        <div class="flex justify-between items-start">
                            <h3 class="font-bold text-sm text-blue-900 truncate flex-1" title="${state.selectedParty.firm}">${state.selectedParty.firm}</h3>
                            <button id="dnt-btn-change-party" class="text-[10px] text-blue-600 hover:text-blue-800 font-bold bg-white p-1.5 rounded shadow-sm border border-gray-200 hover:border-blue-300 whitespace-nowrap ml-2" title="Change Party">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                        </div>
                        <p class="text-[11px] text-gray-600 truncate mt-1">${state.selectedParty.addr}</p>
                        <div class="flex items-center gap-2 mt-2">
                            <span class="bg-blue-100 text-blue-800 text-[10px] font-mono px-2 py-0.5 rounded border border-blue-200">GST: ${state.selectedParty.gstin}</span>
                        </div>
                        <div class="flex items-center gap-2 mt-2">
                            <span class="${balanceInfo.balance >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-[10px] font-mono px-2 py-0.5 rounded border ${balanceInfo.balance >= 0 ? 'border-green-200' : 'border-red-200'}">
                                BAL: ${balanceInfo.balanceType} ${balanceInfo.balanceFormatted}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }
        return `
            <button id="dnt-btn-select-party" class="w-full py-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 group">
                <span class="text-2xl group-hover:scale-110 transition-transform font-light">+</span>
                <span class="text-xs font-semibold uppercase tracking-wide">Select Party</span>
            </button>
        `;
    }

    function dntRenderItemsList() {
        if (state.cart.length === 0) {
            return `
            <div class="absolute inset-0 flex flex-col items-center justify-center text-gray-300 select-none pointer-events-none">
                <svg class="w-16 h-16 mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                <p class="text-sm font-medium text-gray-400">Your cart is empty</p>
                <p class="text-xs text-gray-400 mt-1">Quick Actions: <kbd class="font-mono bg-gray-100 px-1 rounded border border-gray-300">F2</kbd> Add Items | <kbd class="font-mono bg-gray-100 px-1 rounded border border-gray-300">F3</kbd> Select Party | <kbd class="font-mono bg-gray-100 px-1 rounded border border-gray-300">F4</kbd> Other Charges</p>
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
                <div class="p-2 w-28 text-right font-bold text-gray-800 row-total border-l border-transparent group-hover:border-blue-100 bg-gray-50/50 group-hover:bg-transparent">${dntFormatCurrency(rowTotal)}</div>
                
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
    function dntRenderTotals() {
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
                const dntChargeGstAmount = (chargeAmount * chargeGstRate) / 100;
                otherChargesGstTotal += dntChargeGstAmount;
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
                    <div>${dntFormatCurrency(totalTaxable)}</div>
                    ${state.meta.billType === 'intra-state'
                ? `<div class="text-gray-600">${dntFormatCurrency(finalCgstAmount)}</div><div class="text-gray-600">${dntFormatCurrency(finalSgstAmount)}</div>`
                : `<div class="text-gray-600">${dntFormatCurrency(finalIgstAmount)}</div>`
            }
                    ${state.otherCharges.length > 0 ? `<div class="text-gray-600">${dntFormatCurrency(otherChargesSubtotal)}</div>` : ''}
                    <div class="pt-2 mt-2 border-t border-gray-200 font-bold text-lg text-blue-700 leading-none">
                        ${dntFormatCurrency(grandTotal)}
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    // --- MODAL: STOCK SELECTION ---
    function dntOpenStockModal() {
        const modal = document.getElementById('dnt-modal-backdrop');
        const content = document.getElementById('dnt-modal-content');
        if (!modal || !content) return;

        modal.classList.remove('hidden');

        content.innerHTML = `
            <div class="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 class="font-bold text-lg text-gray-800">Item Selection</h3>
                
                <div class="flex items-center gap-3 w-2/3 justify-end">
                    <div class="relative w-full max-w-md">
                        <input type="text" id="dnt-stock-search" placeholder="Search Item, Batch, OEM, or HSN..." class="w-full border border-gray-300 rounded pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm">
                        <svg class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    
                    <button id="dnt-btn-create-stock" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs font-bold shadow flex items-center gap-2 transition-colors whitespace-nowrap">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        NEW ITEM
                    </button>
                    
                    <button id="dnt-close-modal" class="text-gray-400 hover:text-gray-800 text-2xl leading-none ml-4">&times;</button>
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
                    <tbody class="text-xs text-gray-700 divide-y divide-gray-100 bg-white" id="dnt-stock-list-body">
                        </tbody>
                </table>
            </div>
        `;

        dntRenderStockRows(state.stocks);

        // Events
        const searchInput = document.getElementById('dnt-stock-search');
        if (searchInput) {
            searchInput.focus(); // Auto focus search
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = state.stocks.filter(s =>
                    (s.item && s.item.toLowerCase().includes(term)) ||
                    (s.batch && s.batch.toLowerCase().includes(term)) ||
                    (s.oem && s.oem.toLowerCase().includes(term)) ||
                    (s.hsn && s.hsn.toLowerCase().includes(term)) ||
                    // Search within batches array
                    (s.batches && Array.isArray(s.batches) &&
                        s.batches.some(batch =>
                            (batch.batch && batch.batch.toLowerCase().includes(term)) ||
                            (batch.expiry && batch.expiry.toLowerCase().includes(term))
                        )
                    )
                );
                dntRenderStockRows(filtered);
            });
        }

        document.getElementById('dnt-close-modal').onclick = () => modal.classList.add('hidden');

        // Reverse charge toggle
        const reverseChargeToggle = document.getElementById('dnt-reverse-charge-toggle');
        if (reverseChargeToggle) {
            reverseChargeToggle.onchange = (e) => {
                state.meta.reverseCharge = e.target.checked;
                dntRefreshTable();
            };
        }
        document.getElementById('dnt-btn-create-stock').onclick = dntOpenCreateStockModal;
    }

    function dntRenderStockRows(data) {
        const tbody = document.getElementById('dnt-stock-list-body');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-10 text-center text-gray-400 italic">No stocks found matching your query.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(stock => `
            <tr class="hover:bg-blue-50 transition-colors group border-b border-gray-50">
                <td class="p-3 font-semibold text-blue-900">${stock.item}</td>
                <td class="p-3 font-mono text-gray-500">
                    ${stock.batches && Array.isArray(stock.batches) && stock.batches.length > 0
                ? (stock.batches.length === 1
                    ? (stock.batches[0].batch || 'No Batch')
                    : `${stock.batches.length} batches`)
                : (stock.batch || '-')}
                </td>
                <td class="p-3 text-gray-500">${stock.oem || '-'}</td>
                <td class="p-3 text-right font-bold ${stock.qty > 0 ? 'text-green-600' : 'text-red-500'}">${stock.qty} ${stock.uom}</td>
                <td class="p-3 text-right font-mono">${stock.rate}</td>
                <td class="p-3 text-right text-gray-500">${stock.grate}%</td>
                <td class="p-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button class="btn-edit-stock bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded text-[10px] font-bold hover:bg-gray-100 transition-colors shadow-sm"
                            data-stock='${JSON.stringify(stock).replace(/'/g, "&apos;")}'
                            type="button">
                            EDIT
                        </button>
                        <button class="btn-history-stock bg-white border border-amber-200 text-amber-700 px-3 py-1.5 rounded text-[10px] font-bold hover:bg-amber-50 transition-colors shadow-sm"
                            data-stock='${JSON.stringify(stock).replace(/'/g, "&apos;")}'
                            type="button">
                            HISTORY
                        </button>
                        <button class="btn-select-stock bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded text-[10px] font-bold hover:bg-blue-600 hover:text-white transition-colors shadow-sm" 
                            data-stock='${JSON.stringify(stock).replace(/'/g, "&apos;")}'
                            type="button">
                            ADD +
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-select-stock').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const stock = JSON.parse(e.target.getAttribute('data-stock'));

                // Check if the item has multiple batches
                if (stock.batches && stock.batches.length > 1) {
                    // Show batch selection modal
                    await dntShowBatchSelectionModal(stock);
                } else if (stock.batches && stock.batches.length === 1) {
                    // If only one batch, use it directly
                    const batch = stock.batches[0];
                    const stockWithBatch = {
                        ...stock,
                        batch: batch.batch,
                        qty: batch.qty,
                        rate: batch.rate
                    };
                    dntAddItemToCart(stockWithBatch);
                } else {
                    // No batches, use the stock as is
                    dntAddItemToCart(stock);
                }

                document.getElementById('dnt-modal-backdrop').classList.add('hidden');
            });
        });

        tbody.querySelectorAll('.btn-edit-stock').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stock = JSON.parse(e.target.getAttribute('data-stock'));
                dntOpenEditStockModal(stock);
            });
        });

        tbody.querySelectorAll('.btn-history-stock').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stock = JSON.parse(e.target.getAttribute('data-stock'));
                dntOpenPartyItemHistoryModal(stock);
            });
        });
    }

    async function dntFetchPartyItemHistory(partyId, stockId, limit = 'all') {
        const key = dntGetHistoryCacheKey(partyId, stockId);
        if (state.historyCache[key]) return state.historyCache[key];

        const res = await window.api.get(`/inventory/api/history/party-item?partyId=${partyId}&stockId=${stockId}&limit=${limit}`);
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Failed to fetch history');
        }
        state.historyCache[key] = data;
        return data;
    }

    function dntAddItemToCartWithOverrides(stockItem, overrides = {}) {
        const existing = state.cart.find(i => i.stockId === stockItem.id && i.batch === stockItem.batch);
        const resolvedRate = overrides.rate !== undefined ? parseFloat(overrides.rate) : parseFloat(stockItem.rate);
        const resolvedDisc = overrides.disc !== undefined ? parseFloat(overrides.disc) : 0;

        if (existing) {
            existing.qty += 1;
            if (!isNaN(resolvedRate)) existing.rate = resolvedRate;
            if (!isNaN(resolvedDisc)) existing.disc = resolvedDisc;
        } else {
            state.cart.push({
                stockId: stockItem.id,
                item: stockItem.item,
                narration: '',
                batch: stockItem.batch,
                oem: stockItem.oem,
                hsn: stockItem.hsn,
                qty: 1,
                uom: stockItem.uom,
                rate: isNaN(resolvedRate) ? parseFloat(stockItem.rate) : resolvedRate,
                grate: parseFloat(stockItem.grate),
                disc: isNaN(resolvedDisc) ? 0 : resolvedDisc
            });
        }
        dntRefreshTable();
    }

    // Show batch selection modal when an item has multiple batches
    async function dntShowBatchSelectionModal(stock) {
        const subModal = document.getElementById('dnt-sub-modal-backdrop');
        const subContent = document.getElementById('dnt-sub-modal-content');
        if (!subModal || !subContent) return;

        subModal.classList.remove('hidden');

        // Create the batch selection modal content
        let batchesHtml = '';
        if (stock.batches && stock.batches.length > 0) {
            batchesHtml = stock.batches.map((batch, index) => `
                <tr class="hover:bg-blue-50 transition-colors">
                    <td class="p-3">${batch.batch || 'No Batch'}</td>
                    <td class="p-3 text-right font-bold ${batch.qty > 0 ? 'text-green-600' : 'text-red-500'}">${batch.qty} ${stock.uom}</td>
                    <td class="p-3 text-right">${batch.rate}</td>
                    <td class="p-3 text-right">${batch.expiry || '-'}</td>
                    <td class="p-3 text-center">
                        <button class="btn-select-batch bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-[10px] font-bold transition-colors"
                            data-stock='${JSON.stringify({ ...stock, batch: batch.batch, qty: batch.qty, rate: batch.rate }).replace(/'/g, "&apos;")}'>
                            SELECT
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            batchesHtml = `<tr><td colspan="5" class="p-3 text-center text-gray-500">No batches available</td></tr>`;
        }

        subContent.innerHTML = `
            <div class="bg-blue-800 p-4 flex justify-between items-center text-white">
                <h3 class="font-bold text-sm tracking-wide">SELECT BATCH FOR: ${stock.item}</h3>
                <button id="dnt-close-batch-modal" class="hover:text-red-300 text-lg transition-colors">&times;</button>
            </div>
            
            <div class="p-4">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-100 text-[11px] font-bold text-gray-500 uppercase">
                        <tr>
                            <th class="p-3">Batch</th>
                            <th class="p-3 text-right">Quantity</th>
                            <th class="p-3 text-right">Rate</th>
                            <th class="p-3 text-right">Expiry</th>
                            <th class="p-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody class="text-xs text-gray-700 divide-y divide-gray-100" id="dnt-batch-list">
                        ${batchesHtml}
                    </tbody>
                </table>
            </div>
        `;

        // Add event listeners for batch selection
        document.querySelectorAll('.btn-select-batch').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stockWithBatch = JSON.parse(e.target.getAttribute('data-stock'));
                dntAddItemToCart(stockWithBatch);
                document.getElementById('dnt-sub-modal-backdrop').classList.add('hidden');
            });
        });

        // Add close button listener
        document.getElementById('dnt-close-batch-modal').addEventListener('click', () => {
            document.getElementById('dnt-sub-modal-backdrop').classList.add('hidden');
        });
    }

    function dntOpenPartyItemHistoryModal(stock) {
        if (!state.selectedParty || !state.selectedParty.id) {
            alert('Please select a party first to view history.');
            return;
        }

        const subModal = document.getElementById('dnt-sub-modal-backdrop');
        const subContent = document.getElementById('dnt-sub-modal-content');
        if (!subModal || !subContent) return;

        subModal.classList.remove('hidden');

        const partyName = state.selectedParty.firm || 'Selected Party';
        subContent.innerHTML = `
            <div class="bg-amber-700 p-4 flex justify-between items-center text-white">
                <div class="min-w-0">
                    <div class="text-[10px] uppercase tracking-wider opacity-80">Previous History</div>
                    <div class="font-bold text-sm truncate">${partyName} / ${stock.item}</div>
                </div>
                <button id="dnt-close-history-modal" class="hover:text-amber-200 text-lg transition-colors">&times;</button>
            </div>

            <div class="p-4" id="dnt-history-loading">
                <div class="text-sm text-amber-800 font-semibold">Loading history...</div>
            </div>

            <div class="p-4 hidden" id="dnt-history-body">
                <div class="flex items-center justify-between gap-3 mb-3">
                    <div class="text-xs text-gray-600">Showing <span id="dnt-history-count" class="font-bold"></span> of <span id="dnt-total-records" class="font-bold"></span> transactions</div>
                    <div class="flex items-center gap-2">
                        <button id="dnt-btn-use-last-history" class="bg-amber-700 hover:bg-amber-800 text-white px-3 py-1.5 rounded text-[11px] font-bold">USE LAST & ADD</button>
                        <button id="dnt-btn-close-history" class="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded text-[11px] font-bold hover:bg-gray-50">CLOSE</button>
                    </div>
                </div>

                <div class="overflow-auto border border-gray-200 rounded max-h-60">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 text-[11px] font-bold text-gray-600 uppercase sticky top-0">
                            <tr>
                                <th class="p-2">Date</th>
                                <th class="p-2">Bill No</th>
                                <th class="p-2 text-right">Qty</th>
                                <th class="p-2 text-right">Rate</th>
                                <th class="p-2 text-right">Disc%</th>
                                <th class="p-2 text-right">Line Total</th>
                                <th class="p-2 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody id="dnt-history-rows" class="text-xs text-gray-700 divide-y divide-gray-100 bg-white"></tbody>
                    </table>
                </div>

                <!-- Pagination Controls -->
                <div id="dnt-pagination-controls" class="mt-4 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <button id="dnt-prev-page" class="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-[11px] font-bold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">&lt; Prev</button>
                        <span id="dnt-page-info" class="text-xs text-gray-600">Page <span id="dnt-current-page">1</span> of <span id="dnt-total-pages">1</span></span>
                        <button id="dnt-next-page" class="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-[11px] font-bold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">Next &gt;</button>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-600">Items per page:</span>
                        <select id="dnt-items-per-page" class="border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 outline-none">
                            <option value="10">10</option>
                            <option value="20" selected>20</option>
                            <option value="50">50</option>
                        </select>
                    </div>
                </div>

                <div id="dnt-history-empty" class="hidden text-center text-gray-400 italic py-10">No previous sales found for this party and item.</div>
            </div>
        `;

        document.getElementById('dnt-close-history-modal').onclick = dntCloseCreateStockModal;
        const closeBtn = document.getElementById('dnt-btn-close-history');
        if (closeBtn) closeBtn.onclick = dntCloseCreateStockModal;

        // Pagination state
        const paginationState = {
            currentPage: 1,
            itemsPerPage: 20,
            allData: [],
            filteredData: []
        };

        (async () => {
            try {
                const history = await dntFetchPartyItemHistory(state.selectedParty.id, stock.id, 'all');
                const rows = Array.isArray(history.rows) ? history.rows : [];

                // Store all data for pagination
                paginationState.allData = rows;
                paginationState.filteredData = [...rows];

                const loadingEl = document.getElementById('dnt-history-loading');
                const bodyEl = document.getElementById('dnt-history-body');
                if (loadingEl) loadingEl.classList.add('hidden');
                if (bodyEl) bodyEl.classList.remove('hidden');

                // Initialize pagination
                dntUpdatePaginationInfo();
                dntRenderPage();

                function dntUpdatePaginationInfo() {
                    const totalRecords = paginationState.filteredData.length;
                    const totalPages = Math.ceil(totalRecords / paginationState.itemsPerPage);

                    document.getElementById('dnt-total-records').textContent = totalRecords;
                    document.getElementById('dnt-total-pages').textContent = totalPages;
                    document.getElementById('dnt-current-page').textContent = paginationState.currentPage;
                    document.getElementById('dnt-history-count').textContent = Math.min(
                        paginationState.itemsPerPage,
                        totalRecords - ((paginationState.currentPage - 1) * paginationState.itemsPerPage)
                    );

                    // Update button states
                    const prevBtn = document.getElementById('dnt-prev-page');
                    const nextBtn = document.getElementById('dnt-next-page');

                    if (prevBtn) prevBtn.disabled = paginationState.currentPage <= 1;
                    if (nextBtn) nextBtn.disabled = paginationState.currentPage >= totalPages || totalPages === 0;
                }

                function dntRenderPage() {
                    const dntStartIdx = (paginationState.currentPage - 1) * paginationState.itemsPerPage;
                    const endIdx = Math.min(dntStartIdx + paginationState.itemsPerPage, paginationState.filteredData.length);
                    const pageData = paginationState.filteredData.slice(dntStartIdx, endIdx);

                    const tbody = document.getElementById('dnt-history-rows');
                    const empty = document.getElementById('dnt-history-empty');
                    if (!tbody || !empty) return;

                    if (pageData.length === 0) {
                        empty.classList.remove('hidden');
                        tbody.innerHTML = '';
                        return;
                    }

                    empty.classList.add('hidden');
                    tbody.innerHTML = pageData.map((r, idx) => {
                        const d = r.bdate || (r.created_at ? r.created_at.split('T')[0] : '');
                        const rate = Number(r.rate || 0);
                        const disc = Number(r.disc || 0);
                        const qty = Number(r.qty || 0);
                        const total = Number(r.total || (qty * rate * (1 - (disc / 100))));
                        return `
                            <tr>
                                <td class="p-2 text-gray-600">${d}</td>
                                <td class="p-2 font-mono text-gray-700">${r.bno || ''}</td>
                                <td class="p-2 text-right font-mono">${qty.toFixed(2)}</td>
                                <td class="p-2 text-right font-mono">${rate.toFixed(2)}</td>
                                <td class="p-2 text-right font-mono">${disc.toFixed(2)}</td>
                                <td class="p-2 text-right font-mono font-bold">${total.toFixed(2)}</td>
                                <td class="p-2 text-center">
                                    <button class="btn-use-history bg-white border border-amber-200 text-amber-700 px-2 py-1 rounded text-[10px] font-bold hover:bg-amber-50" data-idx="${dntStartIdx + idx}">USE</button>
                                </td>
                            </tr>
                        `;
                    }).join('');

                    // Add event listeners to the use buttons
                    tbody.querySelectorAll('.btn-use-history').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const originalIdx = parseInt(e.target.getAttribute('data-idx'));
                            const row = paginationState.filteredData[originalIdx];
                            if (!row) return;
                            dntAddItemToCartWithOverrides(stock, { rate: row.rate, disc: row.disc });
                            document.getElementById('dnt-modal-backdrop').classList.add('hidden');
                            dntCloseCreateStockModal();
                        });
                    });

                    const useLastBtn = document.getElementById('dnt-btn-use-last-history');
                    if (useLastBtn && paginationState.filteredData.length > 0) {
                        useLastBtn.onclick = () => {
                            const row = paginationState.filteredData[0]; // Most recent
                            dntAddItemToCartWithOverrides(stock, { rate: row.rate, disc: row.disc });
                            document.getElementById('dnt-modal-backdrop').classList.add('hidden');
                            dntCloseCreateStockModal();
                        };
                    }
                }

                // Add pagination event listeners
                document.getElementById('dnt-prev-page').addEventListener('click', () => {
                    if (paginationState.currentPage > 1) {
                        paginationState.currentPage--;
                        dntUpdatePaginationInfo();
                        dntRenderPage();
                    }
                });

                document.getElementById('dnt-next-page').addEventListener('click', () => {
                    const totalPages = Math.ceil(paginationState.filteredData.length / paginationState.itemsPerPage);
                    if (paginationState.currentPage < totalPages) {
                        paginationState.currentPage++;
                        dntUpdatePaginationInfo();
                        dntRenderPage();
                    }
                });

                document.getElementById('dnt-items-per-page').addEventListener('change', (e) => {
                    paginationState.itemsPerPage = parseInt(e.target.value);
                    paginationState.currentPage = 1; // Reset to first page
                    dntUpdatePaginationInfo();
                    dntRenderPage();
                });
            } catch (err) {
                console.error(err);
                alert('Error loading history: ' + err.message);
                dntCloseCreateStockModal();
            }
        })();
    }

    // --- MODAL: OTHER CHARGES ---
    function dntOpenOtherChargesModal() {
        const modal = document.getElementById('dnt-other-charges-modal-backdrop');
        const content = document.getElementById('dnt-other-charges-modal-content');
        if (!modal || !content) return;

        modal.classList.remove('hidden');

        // Update the total charges display
        dntUpdateTotalOtherCharges();

        // Render the charges list
        const chargesList = document.getElementById('dnt-other-charges-list');
        if (chargesList) {
            chargesList.innerHTML = dntRenderOtherChargesList();
        }

        // Attach event listeners for remove buttons
        dntAttachOtherChargesListeners();

        // Auto-complete functionality for charge name
        const chargeNameInput = document.getElementById('dnt-charge-name');
        const suggestionsContainer = document.getElementById('dnt-charge-name-suggestions');

        // Load existing other charges types for auto-complete
        let existingCharges = [];

        async function dntLoadExistingCharges() {
            try {
                const response = await window.api.get('/inventory/dnt/api/other-charges/types');
                existingCharges = await response.json();
            } catch (error) {
                console.error('Error loading existing charges:', error);
            }
        }

        // Initialize existing charges
        dntLoadExistingCharges();

        chargeNameInput.addEventListener('input', function () {
            const query = this.value.toLowerCase();

            if (query.length === 0) {
                suggestionsContainer.classList.add('hidden');
                return;
            }

            // Filter existing charges based on query
            const filteredCharges = existingCharges.filter(charge =>
                charge.name.toLowerCase().includes(query) ||
                charge.type.toLowerCase().includes(query)
            );

            if (filteredCharges.length > 0) {
                suggestionsContainer.innerHTML = filteredCharges.map(charge => {
                    return `<div class="charge-suggestion-item p-2 hover:bg-blue-100 cursor-pointer border-b border-gray-100" 
                            data-name="${charge.name}" 
                            data-type="${charge.type}" 
                            data-hsnSac="${charge.hsnSac || ''}" 
                            data-gstRate="${charge.gstRate || 0}">
                            <div class="font-medium truncate">${charge.name || charge.type}</div>
                            <div class="text-xs text-gray-500 truncate">Type: ${charge.type} | HSN/SAC: ${charge.hsnSac || 'N/A'} | GST: ${charge.gstRate || 0}%</div>
                        </div>`;
                }).join('');

                // Add event listeners to suggestion items
                suggestionsContainer.querySelectorAll('.charge-suggestion-item').forEach(item => {
                    item.addEventListener('click', function () {
                        const name = this.getAttribute('data-name');
                        const type = this.getAttribute('data-type');
                        const hsnSac = this.getAttribute('data-hsnSac');
                        const gstRate = this.getAttribute('data-gstRate');

                        // Fill the form with selected values
                        if (name) document.getElementById('dnt-charge-name').value = name;
                        if (type) document.getElementById('dnt-charge-type').value = type;
                        if (hsnSac) document.getElementById('dnt-charge-hsn').value = hsnSac;
                        if (gstRate) document.getElementById('dnt-charge-gst').value = gstRate;

                        // Hide suggestions
                        suggestionsContainer.classList.add('hidden');
                    });
                });

                suggestionsContainer.classList.remove('hidden');
            } else {
                suggestionsContainer.classList.add('hidden');
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', function (e) {
            if (!suggestionsContainer.contains(e.target) && e.target !== chargeNameInput) {
                suggestionsContainer.classList.add('hidden');
            }
        });

        // Add charge button
        document.getElementById('dnt-add-charge-btn').onclick = () => {
            const name = document.getElementById('dnt-charge-name').value.trim();
            const hsnSac = document.getElementById('dnt-charge-hsn').value.trim();
            const amount = parseFloat(document.getElementById('dnt-charge-amount').value);
            const gstRate = parseFloat(document.getElementById('dnt-charge-gst').value) || 0;
            const type = document.getElementById('dnt-charge-type').value;

            if (!name) {
                alert('Please enter a charge name');
                return;
            }

            if (isNaN(amount) || amount <= 0) {
                alert('Please enter a valid amount');
                return;
            }

            dntAddOtherCharge({
                name: name,
                hsnSac: hsnSac,
                amount: amount,
                gstRate: gstRate,
                type: type
            });

            // Clear inputs
            document.getElementById('dnt-charge-name').value = '';
            document.getElementById('dnt-charge-hsn').value = '';
            document.getElementById('dnt-charge-amount').value = '';
            document.getElementById('dnt-charge-gst').value = '';

            // Hide suggestions if visible
            suggestionsContainer.classList.add('hidden');

            // Update the display
            if (chargesList) {
                chargesList.innerHTML = dntRenderOtherChargesList();
            }
            dntUpdateTotalOtherCharges();
            dntAttachOtherChargesListeners();
        };

        // Close button
        document.getElementById('dnt-close-other-charges-modal').onclick = () => modal.classList.add('hidden');
        document.getElementById('dnt-cancel-other-charges').onclick = () => modal.classList.add('hidden');

        // Save button
        document.getElementById('dnt-save-other-charges').onclick = () => {
            modal.classList.add('hidden');
        };
    }

    function dntUpdateTotalOtherCharges() {
        const totalElement = document.getElementById('dnt-total-other-charges');
        if (totalElement) {
            totalElement.textContent = dntFormatCurrency(dntGetTotalOtherCharges());
        }
    }

    function dntAttachOtherChargesListeners() {
        // Attach listeners to remove buttons
        document.querySelectorAll('.btn-remove-charge').forEach(btn => {
            btn.onclick = (e) => {
                const index = parseInt(e.target.dataset.index);
                dntRemoveOtherCharge(index);

                // Update the display
                const chargesList = document.getElementById('dnt-other-charges-list');
                if (chargesList) {
                    chargesList.innerHTML = dntRenderOtherChargesList();
                }
                dntUpdateTotalOtherCharges();

                // Re-attach listeners
                dntAttachOtherChargesListeners();
            };
        });
    }

    // --- MODAL: CREATE NEW STOCK ---
    function dntOpenCreateStockModal() {
        const subModal = document.getElementById('dnt-sub-modal-backdrop');
        const subContent = document.getElementById('dnt-sub-modal-content');
        if (!subModal || !subContent) return;

        subModal.classList.remove('hidden');

        // Form aligned exactly with stocks.js fields
        subContent.innerHTML = `
            <div class="bg-slate-800 p-4 flex justify-between items-center text-white">
                <h3 class="font-bold text-sm tracking-wide">CREATE NEW STOCK ITEM</h3>
                <button id="dnt-close-sub-modal" class="hover:text-red-300 text-lg transition-colors">&times;</button>
            </div>
            
            <form id="dnt-create-stock-form" class="p-6 grid grid-cols-2 gap-x-6 gap-y-4">
                <div class="col-span-2">
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Item Description *</label>
                    <input type="text" name="item" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="e.g. Dell Monitor 24 inch">
                </div>
                
                <div id="dnt-batch-field-container">
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Batch No</label>
                    <input type="text" name="batch" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="Enter batch number (optional)">
                </div>
                
                <!-- Hidden fields for batch management -->
                <input type="hidden" id="dnt-stockData" name="stockData" value="">
                <input type="hidden" id="dnt-selectedBatchIndex" name="selectedBatchIndex" value="">
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Part No (P/No)</label>
                    <input type="text" name="pno" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">OEM / Brand</label>
                    <input type="text" name="oem" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">HSN/SAC Code *</label>
                    <input type="text" name="hsn" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="Enter HSN for goods or SAC for services">
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
                    <button type="button" id="dnt-cancel-create-stock" class="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 rounded">Cancel</button>
                    <button type="submit" class="px-6 py-2 bg-slate-800 text-white text-sm font-bold rounded shadow hover:bg-slate-900 transition-colors">SAVE</button>
                </div>
            </form>
        `;

        document.getElementById('dnt-close-sub-modal').onclick = dntCloseCreateStockModal;
        document.getElementById('dnt-cancel-create-stock').onclick = dntCloseCreateStockModal;

        document.getElementById('dnt-create-stock-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            data.total = (parseFloat(data.qty) * parseFloat(data.rate)).toFixed(2);
            data.created_at = new Date().toISOString();
            data.updated_at = new Date().toISOString();

            // For the new batch system, we need to construct the batches array
            // If batch field is filled, we create a batch entry
            if (data.batch || data.expiryDate || data.mrp) {
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

            try {
                const res = await window.api.post('/inventory/dnt/api/stocks', data);
                const result = await res.json();

                if (!res.ok) throw new Error(result.error || 'Failed to create stock');

                dntCloseCreateStockModal();

                const refreshRes = await window.api.get('/inventory/dnt/api/stocks');
                const newData = await refreshRes.json();
                state.stocks = Array.isArray(newData) ? newData : [];

                // If stock selection modal is open, refresh its list
                const searchInput = document.getElementById('dnt-stock-search');
                const term = searchInput ? (searchInput.value || '').toLowerCase() : '';
                const filtered = term
                    ? state.stocks.filter(s =>
                        (s.item && s.item.toLowerCase().includes(term)) ||
                        (s.batch && s.batch.toLowerCase().includes(term)) ||
                        (s.oem && s.oem.toLowerCase().includes(term)) ||
                        (s.hsn && s.hsn.toLowerCase().includes(term))
                    )
                    : state.stocks;
                dntRenderStockRows(filtered);
            } catch (err) {
                console.error(err);
                alert("Error creating stock: " + err.message);
            }
        });
    }

    function dntOpenEditStockModal(stock) {
        const subModal = document.getElementById('dnt-sub-modal-backdrop');
        const subContent = document.getElementById('dnt-sub-modal-content');
        if (!subModal || !subContent) return;

        if (!stock || !stock.id) {
            alert('Invalid stock item.');
            return;
        }

        subModal.classList.remove('hidden');

        subContent.innerHTML = `
            <div class="bg-slate-800 p-4 flex justify-between items-center text-white">
                <h3 class="font-bold text-sm tracking-wide">EDIT STOCK ITEM</h3>
                <button id="dnt-close-sub-modal" class="hover:text-red-300 text-lg transition-colors">&times;</button>
            </div>
            
            <form id="dnt-edit-stock-form" class="p-6 grid grid-cols-2 gap-x-6 gap-y-4">
                <div class="col-span-2">
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Item Description *</label>
                    <input type="text" name="item" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" value="${(stock.item || '').replace(/"/g, '&quot;')}">
                </div>
                
                <div id="dnt-batch-field-container">
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Batch No</label>
                    <input type="text" name="batch" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" value="${(stock.batches && Array.isArray(stock.batches) && stock.batches.length > 0 ? (stock.batches[0]?.batch || '') : (stock.batch || '')).replace(/"/g, '&quot;')}">
                </div>
                
                <!-- Hidden fields for batch management -->
                <input type="hidden" id="dnt-stockData" name="stockData" value="${JSON.stringify(stock).replace(/"/g, '&quot;')}">
                <input type="hidden" id="dnt-selectedBatchIndex" name="selectedBatchIndex" value="">
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Part No (P/No)</label>
                    <input type="text" name="pno" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" value="${(stock.pno || '').replace(/"/g, '&quot;')}">
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">OEM / Brand</label>
                    <input type="text" name="oem" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" value="${(stock.oem || '').replace(/"/g, '&quot;')}">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">HSN/SAC Code *</label>
                    <input type="text" name="hsn" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" value="${(stock.hsn || '').replace(/"/g, '&quot;')}">
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Qty *</label>
                        <input type="number" step="0.01" name="qty" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" value="${Number(stock.qty || 0)}">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">UOM *</label>
                        <select name="uom" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none bg-white">
                            <option value="NOS" ${stock.uom === 'NOS' ? 'selected' : ''}>NOS</option>
                            <option value="PCS" ${stock.uom === 'PCS' ? 'selected' : ''}>PCS</option>
                            <option value="SET" ${stock.uom === 'SET' ? 'selected' : ''}>SET</option>
                            <option value="BOX" ${stock.uom === 'BOX' ? 'selected' : ''}>BOX</option>
                            <option value="MTR" ${stock.uom === 'MTR' ? 'selected' : ''}>MTR</option>
                            <option value="KGS" ${stock.uom === 'KGS' ? 'selected' : ''}>KGS</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Selling Rate (₹) *</label>
                    <input type="number" step="0.01" name="rate" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" value="${Number(stock.rate || 0)}">
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">GST % *</label>
                        <select name="grate" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none bg-white">
                            <option value="18" ${Number(stock.grate) === 18 ? 'selected' : ''}>18%</option>
                            <option value="12" ${Number(stock.grate) === 12 ? 'selected' : ''}>12%</option>
                            <option value="5" ${Number(stock.grate) === 5 ? 'selected' : ''}>5%</option>
                            <option value="28" ${Number(stock.grate) === 28 ? 'selected' : ''}>28%</option>
                            <option value="0" ${Number(stock.grate) === 0 ? 'selected' : ''}>0%</option>
                        </select>
                    </div>
                    <div>
                         <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">MRP</label>
                         <input type="number" step="0.01" name="mrp" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" value="${stock.mrp ? Number(stock.mrp) : ''}">
                    </div>
                </div>

                <div>
                     <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Expiry Date</label>
                     <input type="date" name="expiryDate" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" value="${stock.expiryDate || ''}">
                </div>

                <div class="col-span-2 pt-6 border-t border-gray-100 flex justify-end gap-3 mt-2">
                    <button type="button" id="dnt-cancel-edit-stock" class="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 rounded">Cancel</button>
                    <button type="submit" class="px-6 py-2 bg-slate-800 text-white text-sm font-bold rounded shadow hover:bg-slate-900 transition-colors">UPDATE</button>
                </div>
            </form>
        `;

        document.getElementById('dnt-close-sub-modal').onclick = dntCloseCreateStockModal;
        document.getElementById('dnt-cancel-edit-stock').onclick = dntCloseCreateStockModal;

        // Initialize MRP and expiry date from main stock object first
        // This ensures they show initially even if batch logic modifies them later
        setTimeout(() => {
            const form = document.getElementById('dnt-edit-stock-form');
            if (form) {
                // Set initial values based on main stock object if available
                if (stock.mrp !== undefined && stock.mrp !== null) {
                    const mrpInput = form.querySelector('input[name="mrp"]');
                    if (mrpInput) {
                        mrpInput.value = stock.mrp;
                    }
                }
                if (stock.expiryDate) {
                    const expiryInput = form.querySelector('input[name="expiryDate"]');
                    if (expiryInput) {
                        expiryInput.value = stock.expiryDate.split('T')[0];
                    }
                }

                // Handle batch information - show batch selection if multiple batches exist
                if (stock.batches && Array.isArray(stock.batches) && stock.batches.length > 0) {
                    if (stock.batches.length > 1) {
                        // Show batch selection dropdown
                        dntShowBatchSelectionForEdit(stock);
                    } else {
                        // Only one batch, load it directly
                        const firstBatch = stock.batches[0];

                        // Override with batch values if they exist
                        if (firstBatch.mrp !== undefined && firstBatch.mrp !== null) {
                            const mrpInput = form.querySelector('input[name="mrp"]');
                            if (mrpInput) {
                                mrpInput.value = firstBatch.mrp;
                            }
                        }
                        if (firstBatch.expiry) {
                            const expiryInput = form.querySelector('input[name="expiryDate"]');
                            if (expiryInput) {
                                expiryInput.value = firstBatch.expiry.split('T')[0];
                            }
                        }

                        // Also update qty and rate if they came from the batch
                        if (firstBatch.qty !== undefined) {
                            const qtyInput = form.querySelector('input[name="qty"]');
                            if (qtyInput) {
                                qtyInput.value = firstBatch.qty;
                            }
                        }
                        if (firstBatch.rate !== undefined) {
                            const rateInput = form.querySelector('input[name="rate"]');
                            if (rateInput) {
                                rateInput.value = firstBatch.rate;
                            }
                        }
                    }
                }
            }
        }, 100); // Small delay to ensure DOM is ready

        document.getElementById('dnt-edit-stock-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            let data = Object.fromEntries(formData.entries());

            data.total = (parseFloat(data.qty) * parseFloat(data.rate)).toFixed(2);
            data.updated_at = new Date().toISOString();

            // Check if we're editing a specific batch
            const stockData = document.getElementById('dnt-stockData') ? document.getElementById('dnt-stockData').value : null;
            const selectedBatchIndex = document.getElementById('dnt-selectedBatchIndex') ? document.getElementById('dnt-selectedBatchIndex').value : null;

            if (stockData && selectedBatchIndex !== '') {
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

            try {
                const res = await fetch(`/inventory/api/stocks/${stock.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(data)
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.error || 'Failed to update stock');

                dntCloseCreateStockModal();

                // Refresh main list safely
                const refreshRes = await window.api.get('/inventory/dnt/api/stocks');
                const newData = await refreshRes.json();
                state.stocks = Array.isArray(newData) ? newData : [];

                // Keep current filtered view if user is searching
                const searchInput = document.getElementById('dnt-stock-search');
                const term = searchInput ? (searchInput.value || '').toLowerCase() : '';
                const filtered = term
                    ? state.stocks.filter(s =>
                        (s.item && s.item.toLowerCase().includes(term)) ||
                        (s.batch && s.batch.toLowerCase().includes(term)) ||
                        (s.oem && s.oem.toLowerCase().includes(term)) ||
                        (s.hsn && s.hsn.toLowerCase().includes(term))
                    )
                    : state.stocks;

                dntRenderStockRows(filtered);

            } catch (err) {
                console.error(err);
                alert("Error updating stock: " + err.message);
            }
        });
    }

    function dntCloseCreateStockModal() {
        const el = document.getElementById('dnt-sub-modal-backdrop');
        if (el) el.classList.add('hidden');

        // Reset the batch field to original state
        dntResetBatchFieldToOriginal();
    }

    // Function to reset batch field to original structure
    function dntResetBatchFieldToOriginal() {
        // Get the original HTML for the batch field container
        const originalBatchHtml = `
            <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Batch No</label>
            <input type="text" name="batch" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="Enter batch number (optional)">
        `;

        // Find the batch field container and reset it to original state
        const batchContainer = document.getElementById('dnt-batch-field-container');
        if (batchContainer) {
            // Check if this container has our batch selection dropdown
            const hasDropdown = batchContainer.querySelector('select[name="batch-select"]');
            if (hasDropdown) {
                batchContainer.innerHTML = originalBatchHtml;
            }
        }
    }

    // Show batch selection dropdown when multiple batches exist for editing
    function dntShowBatchSelectionForEdit(stock) {
        // Create batch selection UI
        const batchContainer = document.getElementById('dnt-batch-field-container');
        if (!batchContainer) return;

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

        // Create the label
        const label = document.createElement('label');
        label.className = 'block text-xs font-bold text-gray-600 mb-1 uppercase';
        label.textContent = 'Select Batch to Edit';

        batchContainer.innerHTML = '';
        batchContainer.appendChild(label);
        batchContainer.appendChild(select);
        batchContainer.appendChild(detailsContainer);

        // Add event listener to handle batch selection
        select.addEventListener('change', function () {
            const batchIndex = parseInt(this.value);
            if (!isNaN(batchIndex) && batchIndex >= 0) {
                const selectedBatch = stock.batches[batchIndex];

                // Update form fields with selected batch data
                const form = select.closest('form');
                if (form) {
                    const batchInput = form.querySelector('input[name="batch"]');
                    if (batchInput) {
                        batchInput.value = selectedBatch.batch || '';
                    }

                    // Update other fields if they exist
                    const mrpInput = form.querySelector('input[name="mrp"]');
                    if (mrpInput) {
                        mrpInput.value = selectedBatch.mrp || '';
                    }

                    const expiryInput = form.querySelector('input[name="expiryDate"]');
                    if (expiryInput) {
                        expiryInput.value = selectedBatch.expiry ? selectedBatch.expiry.split('T')[0] : '';
                    }

                    const qtyInput = form.querySelector('input[name="qty"]');
                    if (qtyInput) {
                        qtyInput.value = selectedBatch.qty || '';
                    }

                    const rateInput = form.querySelector('input[name="rate"]');
                    if (rateInput) {
                        rateInput.value = selectedBatch.rate || '';
                    }
                }

                // Show batch details
                detailsContainer.innerHTML = `
                    <div class="font-medium text-gray-800">Selected Batch: ${selectedBatch.batch || 'No Batch'}</div>
                    <div class="text-gray-600">Quantity: ${selectedBatch.qty}</div>
                    <div class="text-gray-600">Rate: ${selectedBatch.rate}</div>
                    <div class="text-gray-600">Expiry: ${selectedBatch.expiry || 'N/A'}</div>
                    <div class="text-gray-600">MRP: ${selectedBatch.mrp || 'N/A'}</div>
                `;
                detailsContainer.classList.remove('hidden');
            }
        });
    }

    function dntOpenPartyModal() {
        const modal = document.getElementById('dnt-modal-backdrop');
        const content = document.getElementById('dnt-modal-content');
        if (!modal || !content) return;

        modal.classList.remove('hidden');

        // 1. Updated Header with "New Party" Button
        content.innerHTML = `
            <div class="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 class="font-bold text-gray-700">Select Party</h3>
                
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <input type="text" id="dnt-party-search" placeholder="Search Firm or GSTIN..." class="pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs w-48 focus:ring-1 focus:ring-blue-500 outline-none">
                        <svg class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>

                    <button id="dnt-btn-create-party" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium shadow flex items-center gap-1 transition-colors">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        New Party
                    </button>
                    
                    <button id="dnt-close-party-modal" class="text-gray-400 hover:text-gray-800 text-2xl leading-none ml-2">&times;</button>
                </div>
            </div>
            
            <div class="p-4 grid gap-3 max-h-[60vh] overflow-y-auto bg-gray-50" id="dnt-party-list-container">
                </div>
        `;

        // 2. Helper to render the list rows
        const dntRenderPartyList = (data) => {
            const container = document.getElementById('dnt-party-list-container');
            if (!container) return;

            if (data.length === 0) {
                container.innerHTML = `<div class="text-center text-gray-400 py-8 italic">No parties found. Create a new one.</div>`;
                return;
            }

            container.innerHTML = data.map(party => `
                <div class="party-item border border-gray-200 p-3 rounded-lg hover:border-blue-400 hover:shadow-md cursor-pointer flex justify-between items-center transition-all bg-white group" data-id="dnt-${party.id}">
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
                    const id = parseInt(div.getAttribute('data-id').replace('dnt-', ''));
                    state.selectedParty = state.parties.find(p => p.id === id);
                    state.historyCache = {};
                    document.getElementById('dnt-modal-backdrop').classList.add('hidden');

                    const partyContainer = document.getElementById('dnt-party-display');
                    if (partyContainer) {
                        dntRenderPartyCard().then(html => {
                            partyContainer.innerHTML = html;

                            const changeBtn = document.getElementById('dnt-btn-change-party');
                            if (changeBtn) changeBtn.addEventListener('click', dntOpenPartyModal);

                            const selectBtn = document.getElementById('dnt-btn-select-party');
                            if (selectBtn) selectBtn.addEventListener('click', dntOpenPartyModal);
                        });
                    }
                });
            });
        };

        // Initial Render
        dntRenderPartyList(state.parties);

        // 3. Attach Event Listeners
        document.getElementById('dnt-close-party-modal').addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        document.getElementById('dnt-btn-create-party').addEventListener('click', dntOpenCreatePartyModal); // <--- OPEN SUB MODAL

        // Search Logic
        const searchInput = document.getElementById('dnt-party-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = state.parties.filter(p =>
                    p.firm.toLowerCase().includes(term) ||
                    p.gstin.toLowerCase().includes(term)
                );
                dntRenderPartyList(filtered);
            });
        }
    }

    function dntOpenCreatePartyModal() {
        const subModal = document.getElementById('dnt-sub-modal-backdrop');
        const subContent = document.getElementById('dnt-sub-modal-content');
        if (!subModal || !subContent) return;

        subModal.classList.remove('hidden');

        // [MODIFIED HTML]
        subContent.innerHTML = `
            <div class="bg-slate-800 p-4 flex justify-between items-center text-white">
                <h3 class="font-bold text-sm tracking-wide">ADD NEW PARTY</h3>
                <button id="dnt-close-sub-modal-party" class="hover:text-red-300 text-lg transition-colors">&times;</button>
            </div>
            
            <form id="dnt-create-party-form" class="p-6 grid grid-cols-2 gap-x-6 gap-y-4">
                
                <div class="col-span-2">
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Firm Name *</label>
                    <input type="text" name="firm" id="dnt-new-party-firm" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none placeholder-gray-300" placeholder="e.g. M/S Global Enterprises">
                </div>

                <div class="col-span-2 md:col-span-1">
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">GSTIN</label>
                    <div class="flex gap-2">
                        <input type="text" name="gstin" id="dnt-new-party-gstin" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none font-mono uppercase" placeholder="27ABCDE1234F1Z5" maxlength="15">
                        <button type="button" id="dnt-btn-fetch-gst" class="bg-orange-500 hover:bg-orange-600 text-white px-3 rounded text-xs font-bold shadow transition-colors flex items-center justify-center min-w-[60px]">
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
                    <input type="text" name="state" id="dnt-new-party-state" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                </div>

                <div>
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">State Code</label>
                    <input type="number" name="state_code" id="dnt-new-party-state-code" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50 outline-none" readonly>
                </div>

                <div class="col-span-2">
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Address</label>
                    <textarea name="addr" id="dnt-new-party-addr" rows="2" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none resize-none"></textarea>
                </div>
                
                <div class="grid grid-cols-2 gap-4 col-span-2">
                    <div>
                         <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Pincode</label>
                         <input type="number" name="pin" id="dnt-new-party-pin" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                    </div>
                    <div>
                         <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">PAN</label>
                         <input type="text" name="pan" id="dnt-new-party-pan" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none uppercase font-mono" maxlength="10">
                    </div>
                </div>

                <div class="col-span-2 pt-4 border-t border-gray-100 flex justify-end gap-3 mt-2">
                    <button type="button" id="dnt-cancel-create-party" class="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 rounded">Cancel</button>
                    <button type="submit" class="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded shadow hover:bg-blue-700 transition-colors">SAVE PARTY</button>
                </div>
            </form>
        `;

        // --- LISTENERS ---
        const dntCloseFunc = () => document.getElementById('dnt-sub-modal-backdrop').classList.add('hidden');
        document.getElementById('dnt-close-sub-modal-party').addEventListener('click', dntCloseFunc);
        document.getElementById('dnt-cancel-create-party').addEventListener('click', dntCloseFunc);

        // Auto-detect State Code from GSTIN (Input Event)
        const gstinInput = document.getElementById('dnt-new-party-gstin');
        gstinInput.addEventListener('input', (e) => {
            const val = e.target.value.toUpperCase();
            e.target.value = val;
            if (val.length >= 2 && !isNaN(val.substring(0, 2))) {
                document.getElementById('dnt-new-party-state-code').value = val.substring(0, 2);
            }
            // Auto extract PAN
            if (val.length >= 12) {
                document.getElementById('dnt-new-party-pan').value = val.substring(2, 12);
            }
        });

        // [NEW] API Fetch Listener
        document.getElementById('dnt-btn-fetch-gst').addEventListener('click', function () {
            dntFetchPartyByGST(this); // Call the helper function
        });

        // Form Submit
        document.getElementById('dnt-create-party-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            data.supply = data.state;
            data.gstin = data.gstin || 'UNREGISTERED';
            data.created_at = new Date().toISOString();
            data.updated_at = new Date().toISOString();

            try {
                const res = await window.api.post('/inventory/dnt/api/parties', data);
                const result = await res.json();

                if (!res.ok) throw new Error(result.error || 'Failed to create party');

                dntCloseFunc();

                // Refresh Parties
                const refreshRes = await window.api.get('/inventory/dnt/api/parties');
                state.parties = await refreshRes.json();

                // Select and Update
                state.selectedParty = state.parties.find(p => p.firm === data.firm);
                state.historyCache = {};
                const partyContainer = document.getElementById('dnt-party-display');
                if (partyContainer) {
                    dntRenderPartyCard().then(html => {
                        partyContainer.innerHTML = html;

                        const changeBtn = document.getElementById('dnt-btn-change-party');
                        if (changeBtn) changeBtn.addEventListener('click', dntOpenPartyModal);
                    });
                }
                document.getElementById('dnt-modal-backdrop').classList.add('hidden');

            } catch (err) {
                alert("Error creating party: " + err.message);
            }
        });
    }

    // --- CART LOGIC ---
    function dntAddItemToCart(stockItem) {
        // Check batch/item uniqueness
        const existing = state.cart.find(i => i.stockId === stockItem.id && i.batch === stockItem.batch);

        if (existing) {
            existing.qty += 1;
        } else {
            state.cart.push({
                stockId: stockItem.id,
                item: stockItem.item,
                narration: '',  // Initialize with empty narration
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
        dntRefreshTable();
    }

    function dntRefreshTable() {
        document.getElementById('dnt-items-container').innerHTML = dntRenderItemsList();
        document.getElementById('dnt-totals-section').innerHTML = dntRenderTotals();
        dntAttachTableListeners();
    }

    // --- EVENT ATTACHMENTS (ROBUST) ---
    function dntAttachGlobalListeners() {
        const addBtn = document.getElementById('dnt-btn-add-item');
        if (addBtn) addBtn.onclick = dntOpenStockModal;

        const partyBtn = document.getElementById('dnt-btn-select-party');
        if (partyBtn) partyBtn.onclick = dntOpenPartyModal;

        // Note: The change party button event listener is handled in dntRenderPartyCard() after async rendering

        // Other charges button
        const otherChargesBtn = document.getElementById('dnt-btn-other-charges');
        if (otherChargesBtn) otherChargesBtn.onclick = dntOpenOtherChargesModal;

        document.addEventListener('keydown', (e) => {
            const container = document.getElementById('debit-note');
            if (!container || container.classList.contains('hidden')) return;
            
            if (e.key === 'F2') {
                e.preventDefault();
                dntOpenStockModal();
            } else if (e.key === 'F3') {
                e.preventDefault();
                dntOpenPartyModal();
            } else if (e.key === 'F4') {
                e.preventDefault();
                dntOpenOtherChargesModal();
            }
        });

        const typeSelector = document.getElementById('dnt-billTypeSelector');
        if (typeSelector) {
            typeSelector.onchange = (e) => {
                state.meta.billType = e.target.value;
                document.getElementById('dnt-totals-section').innerHTML = dntRenderTotals();
            };
        }

        // Reference/PO No input
        const referenceNoInput = document.getElementById('dnt-reference-no');
        if (referenceNoInput) {
            referenceNoInput.oninput = (e) => {
                state.meta.referenceNo = e.target.value;
            };
        }

        // Vehicle No input
        const vehicleNoInput = document.getElementById('dnt-vehicle-no');
        if (vehicleNoInput) {
            vehicleNoInput.oninput = (e) => {
                state.meta.vehicleNo = e.target.value;
            };
        }

        // Dispatch Through input
        const dispatchThroughInput = document.getElementById('dnt-dispatch-through');
        if (dispatchThroughInput) {
            dispatchThroughInput.oninput = (e) => {
                state.meta.dispatchThrough = e.target.value;
            };
        }

        // Narration textarea
        const narrationInput = document.getElementById('dnt-narration');
        if (narrationInput) {
            narrationInput.oninput = (e) => {
                state.meta.narration = e.target.value;
            };
        }

        const resetBtn = document.getElementById('dnt-btn-reset');
        if (resetBtn) {
            resetBtn.onclick = () => {
                if (confirm("Clear current invoice details?")) {
                    state.cart = [];
                    state.selectedParty = null;
                    state.historyCache = {};
                    state.otherCharges = [];
                    dntRenderLayout();

                    // Update the total charges display to reflect reset
                    dntUpdateTotalOtherCharges();
                }
            };
        }

        const saveBtn = document.getElementById('dnt-btn-save');
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
                    otherCharges: state.otherCharges
                };

                try {
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = '<span>💾</span> Saving...';

                    const response = await window.api.post('/inventory/dnt/api/bills', billData);
                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.error || 'Failed to save invoice');
                    }

                    // Fetch GST status to determine if taxes should be calculated
                    let gstEnabled = true; // Default to true
                    try {
                        const gstResponse = await window.api.get('/admin/gst-status');
                        const gstData = await gstResponse.json();
                        gstEnabled = gstData.gst_enabled;
                    } catch (error) {
                        console.warn('Could not fetch GST status, defaulting to enabled:', error);
                    }

                    // Generate professional invoice data for Excel export
                    const invoiceData = dntGenerateInvoiceData(billData, result.billId);

                    // Add GST status to invoice data
                    invoiceData.gstEnabled = gstEnabled;

                    // Export to PDF
                    dntExportBillToPdf({ id: result.billId, bno: invoiceData.meta.dntBillNo });

                    // Reset the sales tab after successful save
                    state.cart = [];
                    state.selectedParty = null;
                    state.otherCharges = [];
                    
                    // Fetch the next bill number before re-rendering
                    await dntFetchNextBillNumber();
                    
                    dntRenderLayout();

                    alert('Invoice saved successfully! Bill ID: ' + result.billId + '\nInvoice has been exported to PDF.');

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

    function dntAttachTableListeners() {
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
                if (totalDiv) totalDiv.innerText = dntFormatCurrency(rowTotal);

                // Recalculate Footer
                document.getElementById('dnt-totals-section').innerHTML = dntRenderTotals();
            };
        });

        // Narration inputs
        document.querySelectorAll('input[data-field="narration"]').forEach(input => {
            input.oninput = (e) => {
                const idx = parseInt(e.target.dataset.idx);
                const field = e.target.dataset.field;
                const val = e.target.value;

                if (state.cart[idx]) {
                    state.cart[idx][field] = val;
                }
            };
        });

        // Remove Buttons
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.onclick = (e) => {
                const idx = parseInt(e.target.dataset.idx);
                state.cart.splice(idx, 1);
                dntRefreshTable();
            };
        });
    }

    async function dntFetchPartyByGST(buttonElement) {
        const gstinInput = document.getElementById('dnt-new-party-gstin');
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
            dntPopulatePartyFromRapidAPI(partyData, gstin);

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

    function dntPopulatePartyFromRapidAPI(partyData, gstin) {
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
        const address = dntFormatPowerfulGSTINAddress(partyData) || '';
        const pinCode = dntExtractPowerfulGSTINPinCode(partyData) || '';

        // 3. Extract State Name
        // The API returns 'state_jurisdiction' or we can derive it from the address object
        let stateName = '';
        if (partyData.place_of_business_principal?.address?.state) {
            stateName = partyData.place_of_business_principal.address.state;
        } else {
            stateName = partyData.state_jurisdiction || '';
        }
        stateName = String(stateName || '').trim();
        if (stateName.includes(' - ')) {
            stateName = stateName.split(' - ')[0].trim();
        }

        // --- POPULATE UI ---

        // Firm Name
        if (document.getElementById('dnt-new-party-firm'))
            document.getElementById('dnt-new-party-firm').value = displayName;

        // Address
        if (document.getElementById('dnt-new-party-addr'))
            document.getElementById('dnt-new-party-addr').value = address;

        // State
        if (document.getElementById('dnt-new-party-state'))
            document.getElementById('dnt-new-party-state').value = stateName;

        // Pincode
        if (document.getElementById('dnt-new-party-pin'))
            document.getElementById('dnt-new-party-pin').value = pinCode;

        // State Code (Auto-fill from GSTIN first 2 chars)
        if (gstin && gstin.length >= 2) {
            const scInput = document.getElementById('dnt-new-party-state-code');
            if (scInput) scInput.value = gstin.substring(0, 2);
        }

        // PAN (Auto-fill from GSTIN chars 3-12)
        if (gstin && gstin.length >= 12) {
            const panInput = document.getElementById('dnt-new-party-pan');
            if (panInput) panInput.value = gstin.substring(2, 12);
        }
    }

    function dntFormatPowerfulGSTINAddress(partyData) {
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

    function dntExtractPowerfulGSTINPinCode(partyData) {
        if (!partyData || !partyData.place_of_business_principal) return '';

        const addr = partyData.place_of_business_principal.address;
        if (!addr || !addr.pin_code) return '';

        const pinStr = addr.pin_code.toString().trim();
        // Validate PIN dntFormat (6 digits)
        if (/^\d{6}$/.test(pinStr)) {
            return pinStr;
        }

        return '';
    }

    // --- EXCEL EXPORT HELPERS ---
    function dntGenerateInvoiceData(billData, billId) {
        const { meta, party, cart } = billData;

        // Calculate totals for Excel
        let totalTaxable = 0;
        let totalTaxAmount = 0;
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;

        cart.forEach(item => {
            const lineValue = item.qty * item.rate * (1 - (item.disc || 0) / 100);
            const lineTax = lineValue * (item.grate / 100);
            totalTaxable += lineValue;
            totalTaxAmount += lineTax;
        });

        if (meta.billType === 'intra-state') {
            cgstAmount = totalTaxAmount / 2;
            sgstAmount = totalTaxAmount / 2;
        } else {
            igstAmount = totalTaxAmount;
        }

        // Include other charges
        let tempOtherChargesTotal = 0;
        let tempOtherChargesGstTotal = 0;

        if (state.otherCharges) {
            state.otherCharges.forEach(charge => {
                const chargeAmount = parseFloat(charge.amount) || 0;
                const chargeGstRate = parseFloat(charge.gstRate) || 0;
                // Calculate GST amount only if GST is enabled
                const dntChargeGstAmount = state.gstEnabled !== false ? (chargeAmount * chargeGstRate) / 100 : 0;
                tempOtherChargesTotal += chargeAmount;
                tempOtherChargesGstTotal += dntChargeGstAmount;
            });
        }

        // For reverse charge, tax is calculated but not added to grand total
        const grandTotal = totalTaxable + (meta.reverseCharge ? 0 : totalTaxAmount) + tempOtherChargesTotal + (meta.reverseCharge ? 0 : tempOtherChargesGstTotal);

        // Calculate final amounts and round off
        const finalAmount = Math.round(grandTotal);
        const roundOff = finalAmount - grandTotal;

        // Calculate GST on other charges
        let otherChargesGstTotal = 0;
        let otherChargesSubtotal = 0;
        const processedOtherCharges = state.otherCharges.map(charge => {
            const chargeAmount = parseFloat(charge.amount) || 0;
            const chargeGstRate = parseFloat(charge.gstRate) || 0;
            // Calculate GST amount only if GST is enabled
            const dntChargeGstAmount = state.gstEnabled !== false ? (chargeAmount * chargeGstRate) / 100 : 0;
            otherChargesSubtotal += chargeAmount;
            otherChargesGstTotal += dntChargeGstAmount;

            return {
                ...charge,
                gstAmount: dntChargeGstAmount,
                totalAmount: chargeAmount + dntChargeGstAmount
            };
        });

        // Calculate final tax amounts including other charges GST
        let finalCgstAmount = cgstAmount;
        let finalSgstAmount = sgstAmount;
        let finalIgstAmount = igstAmount;

        if (state.meta.billType === 'intra-state') {
            finalCgstAmount = cgstAmount + (otherChargesGstTotal / 2);
            finalSgstAmount = sgstAmount + (otherChargesGstTotal / 2);
        } else {
            finalIgstAmount = igstAmount + otherChargesGstTotal;
        }

        // For reverse charge, tax amounts are calculated but set to 0 for display
        if (meta.reverseCharge) {
            finalCgstAmount = 0;
            finalSgstAmount = 0;
            finalIgstAmount = 0;
        }

        // Process cart items to ensure narration is preserved
        const processedCart = cart.map(item => ({
            ...item,
            narration: item.narration || ''  // Ensure narration is included in the export
        }));

        return {
            meta,
            party,
            cart: processedCart,  // Use the processed cart with narration
            otherCharges: processedOtherCharges,
            billId,
            totalTaxable,
            totalTaxAmount,
            cgstAmount: finalCgstAmount, // Updated with other charges GST
            sgstAmount: finalSgstAmount, // Updated with other charges GST
            igstAmount: finalIgstAmount, // Updated with other charges GST
            otherChargesSubtotal,
            otherChargesGstTotal,
            grandTotal,
            finalAmount,
            roundOff,
            // Get seller information from the current user
            sellerName: window.currentUserFirmName || state.currentFirmName || 'Your Company Name'
        };
    }

    function dntExportInvoiceToExcel(invoiceData) {
        // 1. Define Professional Styles
        const borderStyle = { style: "thin", color: { rgb: "000000" } };
        const styles = {
            title: {
                font: { bold: true, sz: 16, color: { rgb: "000000" } },
                alignment: { horizontal: "center", vertical: "center" }
            },
            header: {
                font: { bold: true, color: { rgb: "000000" } },
                fill: { fgColor: { rgb: "E0E0E0" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
            },
            cellCenter: {
                alignment: { horizontal: "center" },
                border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
            },
            cellLeft: {
                alignment: { horizontal: "left" },
                border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
            },
            cellRight: {
                alignment: { horizontal: "right" },
                border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
            },
            totalLabel: {
                font: { bold: true },
                alignment: { horizontal: "right" },
                border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
            },
            totalValue: {
                font: { bold: true },
                alignment: { horizontal: "right" },
                border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
            },
            words: {
                font: { italic: true, bold: true },
                alignment: { horizontal: "left", vertical: "top", wrapText: true },
                border: { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }
            }
        };

        const dntCreateCell = (v, s) => ({ v: v || "", s: s || {} });
        const ws_data = [];

        // --- TITLE ROW ---
        // Use dynamic invoice title based on transaction type
        const excelInvoiceTitle = bill.transactionType ?
            (bill.transactionType === 'SALE' ? 'SALES INVOICE' :
                bill.transactionType === 'PURCHASE' ? 'PURCHASE INVOICE' :
                    bill.transactionType === 'CREDIT NOTE' ? 'CREDIT NOTE' :
                        bill.transactionType === 'DEBIT NOTE' ? 'DEBIT NOTE' :
                            bill.transactionType === 'DELIVERY NOTE' ? 'DELIVERY NOTE' :
                                'TAX INVOICE') : 'TAX INVOICE';
        ws_data.push([dntCreateCell(excelInvoiceTitle, styles.title)]);
        ws_data.push([]); // Spacer

        // --- DETAILS SECTION ---
        ws_data.push([
            dntCreateCell("SELLER:", { font: { bold: true } }), "", "", "", "", "",
            dntCreateCell("Invoice No:", { font: { bold: true }, alignment: { horizontal: "right" } }),
            dntCreateCell(invoiceData.meta.dntBillNo, { alignment: { horizontal: "left" } })
        ]);

        // Use the actual firm name instead of hardcoded "Your Company Name"
        ws_data.push([
            dntCreateCell(invoiceData.sellerName || "Your Company Name", { font: { bold: true } }), "", "", "", "", "",
            dntCreateCell("Date:", { font: { bold: true }, alignment: { horizontal: "right" } }),
            dntCreateCell(invoiceData.meta.billDate, { alignment: { horizontal: "left" } })
        ]);

        // PO No and Vehicle No in sequence
        if (invoiceData.meta.referenceNo) {
            ws_data.push([
                dntCreateCell("", { font: { bold: true } }), "", "", "", "", "",
                dntCreateCell("PO No:", { font: { bold: true }, alignment: { horizontal: "right" } }),
                dntCreateCell(invoiceData.meta.referenceNo, { alignment: { horizontal: "left" } })
            ]);
        }

        if (invoiceData.meta.vehicleNo) {
            ws_data.push([
                dntCreateCell("", { font: { bold: true } }), "", "", "", "", "",
                dntCreateCell("Vehicle No:", { font: { bold: true }, alignment: { horizontal: "right" } }),
                dntCreateCell(invoiceData.meta.vehicleNo, { alignment: { horizontal: "left" } })
            ]);
        }

        // Dispatched Through after vehicle info
        if (invoiceData.meta.dispatchThrough) {
            ws_data.push([
                dntCreateCell("", { font: { bold: true } }), "", "", "", "", "",
                dntCreateCell("Dispatched Through:", { font: { bold: true }, alignment: { horizontal: "right" } }),
                dntCreateCell(invoiceData.meta.dispatchThrough, { alignment: { horizontal: "left" } })
            ]);
        }

        ws_data.push([dntCreateCell("BUYER (BILL TO):", { font: { bold: true } })]);
        ws_data.push([dntCreateCell(invoiceData.party.firm, { font: { bold: true } })]);
        ws_data.push([dntCreateCell(invoiceData.party.addr || "")]);
        ws_data.push([dntCreateCell("GSTIN: " + (invoiceData.party.gstin || "Unregistered"))]);

        ws_data.push([]); // Spacer

        // --- TABLE HEADERS ---
        const headers = ["Sr", "Description", "HSN", "Qty", "Unit", "Rate", "Disc %", "GST %", "Amount"];
        ws_data.push(headers.map(h => dntCreateCell(h, styles.header)));

        // --- TABLE ITEMS ---
        invoiceData.cart.forEach((item, index) => {
            const lineTotal = item.qty * item.rate * (1 - (item.disc || 0) / 100);
            ws_data.push([
                dntCreateCell(index + 1, styles.cellCenter),
                dntCreateCell(item.item, styles.cellLeft),
                dntCreateCell(item.hsn, styles.cellCenter),
                dntCreateCell(item.qty, styles.cellCenter),
                dntCreateCell(item.uom, styles.cellCenter),
                dntCreateCell(item.rate, styles.cellRight),
                dntCreateCell(item.disc || 0, styles.cellRight),
                dntCreateCell(item.grate, styles.cellRight),
                dntCreateCell(lineTotal.toFixed(2), styles.cellRight)
            ]);

            // Add narration row if it exists
            if (item.narration) {
                ws_data.push([
                    dntCreateCell('', styles.cellCenter),
                    dntCreateCell('Narration: ' + item.narration, styles.cellLeft),
                    dntCreateCell('', styles.cellCenter),
                    dntCreateCell('', styles.cellCenter),
                    dntCreateCell('', styles.cellCenter),
                    dntCreateCell('', styles.cellRight),
                    dntCreateCell('', styles.cellRight),
                    dntCreateCell('', styles.cellRight),
                    dntCreateCell('', styles.cellRight)
                ]);
            }
        });

        // Add other charges if they exist
        if (invoiceData.otherCharges && invoiceData.otherCharges.length > 0) {
            // Add other charges as additional line items
            invoiceData.otherCharges.forEach(charge => {
                // Add the main charge
                ws_data.push([
                    dntCreateCell("", styles.cellCenter),
                    dntCreateCell(`${charge.type} (${charge.name})`, styles.cellLeft),
                    dntCreateCell(charge.hsnSac || "", styles.cellCenter), // HSN/SAC
                    dntCreateCell("", styles.cellCenter),
                    dntCreateCell("", styles.cellCenter),
                    dntCreateCell("", styles.cellRight),
                    dntCreateCell("", styles.cellRight),
                    dntCreateCell(charge.gstRate || 0, styles.cellRight), // GST rate
                    dntCreateCell(dntFormatCurrency(charge.amount), styles.cellRight)
                ]);

                // Add the GST line
                if (charge.gstAmount > 0) {
                    ws_data.push([
                        dntCreateCell("", styles.cellCenter),
                        dntCreateCell(`GST on ${charge.type} (${charge.name})`, styles.cellLeft),
                        dntCreateCell(charge.hsnSac || "", styles.cellCenter), // HSN/SAC
                        dntCreateCell("", styles.cellCenter),
                        dntCreateCell("", styles.cellCenter),
                        dntCreateCell("", styles.cellRight),
                        dntCreateCell("", styles.cellRight),
                        dntCreateCell(0, styles.cellRight), // No GST on GST
                        dntCreateCell(dntFormatCurrency(charge.gstAmount), styles.cellRight)
                    ]);
                }
            });
        }

        // Min Rows Filler
        const minRows = 5;
        for (let i = 0; i < (minRows - invoiceData.cart.length - (invoiceData.otherCharges ? invoiceData.otherCharges.length : 0)); i++) {
            // Fix: Use Array.from to create unique cell objects, preventing reference bugs
            const emptyRow = Array.from({ length: 9 }, () => dntCreateCell('', styles.cellCenter));
            ws_data.push(emptyRow);
        }

        // --- FOOTER SECTION ---

        // Calculate the same totals as in dntRenderTotals for consistency
        let totalTaxable = 0;
        let totalTaxAmount = 0;

        // Calculate line by line for cart items
        invoiceData.cart.forEach(item => {
            const lineValue = item.qty * item.rate * (1 - (item.disc || 0) / 100);
            const lineTax = lineValue * (item.grate / 100);
            totalTaxable += lineValue;
            totalTaxAmount += lineTax;
        });

        // Check GST status to determine if tax calculations should be performed
        const gstEnabled = invoiceData.gstEnabled !== undefined ? invoiceData.gstEnabled : true; // Default to enabled if not set

        // Calculate GST on other charges
        let otherChargesGstTotal = 0;
        let otherChargesSubtotal = 0;
        if (invoiceData.otherCharges) {
            invoiceData.otherCharges.forEach(charge => {
                const chargeAmount = parseFloat(charge.amount) || 0;
                const chargeGstRate = parseFloat(charge.gstRate) || 0;
                const dntChargeGstAmount = gstEnabled ? (chargeAmount * chargeGstRate) / 100 : 0;
                otherChargesSubtotal += chargeAmount;
                otherChargesGstTotal += dntChargeGstAmount;
            });
        }

        // Calculate final tax amounts including other charges GST (only when GST is enabled)
        let finalCgstAmount = gstEnabled ? totalTaxAmount / 2 : 0;  // From cart items
        let finalSgstAmount = gstEnabled ? totalTaxAmount / 2 : 0;  // From cart items
        let finalIgstAmount = gstEnabled ? totalTaxAmount : 0;      // From cart items

        if (gstEnabled && invoiceData.meta.billType === 'intra-state') {
            finalCgstAmount = (totalTaxAmount / 2) + (otherChargesGstTotal / 2);
            finalSgstAmount = (totalTaxAmount / 2) + (otherChargesGstTotal / 2);
        } else if (gstEnabled) {
            finalIgstAmount = totalTaxAmount + otherChargesGstTotal;
        }

        // For reverse charge, tax amounts are calculated but set to 0 for display
        if (invoiceData.meta.reverseCharge) {
            finalCgstAmount = 0;
            finalSgstAmount = 0;
            finalIgstAmount = 0;
        }

        // When GST is disabled, tax amounts should be 0
        if (!gstEnabled) {
            finalCgstAmount = 0;
            finalSgstAmount = 0;
            finalIgstAmount = 0;
        }

        const dntAddFooterRow = (label, val, isWordsRow = false) => {
            // Fix: Create unique empty cells for this row
            const row = Array.from({ length: 9 }, () => dntCreateCell("", {}));

            if (isWordsRow) {
                const wordsTotal = totalTaxable + (gstEnabled && !invoiceData.meta.reverseCharge ? totalTaxAmount : 0) + otherChargesSubtotal + (gstEnabled && !invoiceData.meta.reverseCharge ? otherChargesGstTotal : 0);
                const roundedTotal = Math.round(wordsTotal);
                row[0] = dntCreateCell("Amount in Words:\n" + dntNumToIndianRupees(roundedTotal || 0), styles.words);
            }

            // Totals at columns 6, 7 and 8 - merge G and H columns
            row[6] = dntCreateCell(label, styles.totalLabel); // Column G will contain the label
            row[7] = dntCreateCell("", styles.totalLabel); // Column H will be merged with G
            row[8] = dntCreateCell((typeof val === 'number' ? val : 0).toFixed(2), styles.totalValue);

            return row;
        };

        // 1. Taxable (items + other charges per Indian GST standard)
        const totalTaxableValue = totalTaxable + otherChargesSubtotal;
        ws_data.push(dntAddFooterRow("Taxable Value", totalTaxableValue, true));

        // 2. Taxes
        if (invoiceData.meta.billType === 'intra-state') {
            ws_data.push(dntAddFooterRow("CGST", finalCgstAmount));
            ws_data.push(dntAddFooterRow("SGST", finalSgstAmount));
        } else {
            ws_data.push(dntAddFooterRow("IGST", finalIgstAmount));
        }

        // 3. Other Charges (if any)
        if (invoiceData.otherCharges && invoiceData.otherCharges.length > 0) {
            // Add each other charge
            invoiceData.otherCharges.forEach(charge => {
                ws_data.push(dntAddFooterRow(`${charge.type} (${charge.name})`, charge.amount));

                // Add GST on the charge if applicable
                if (charge.gstAmount > 0) {
                    ws_data.push(dntAddFooterRow(`GST on ${charge.type} (${charge.name})`, charge.gstAmount));
                }
            });
        }

        // 4. Grand Total (before HSN Summary for better UI flow)
        const excelGrandTotal = totalTaxable + (gstEnabled && !invoiceData.meta.reverseCharge ? totalTaxAmount : 0) + otherChargesSubtotal + (gstEnabled && !invoiceData.meta.reverseCharge ? otherChargesGstTotal : 0);
        const roundOff = Math.round(excelGrandTotal) - excelGrandTotal;

        // Add Round Off row
        ws_data.push(dntAddFooterRow("Round Off", roundOff));

        const rFinal = Array.from({ length: 9 }, () => dntCreateCell("", {}));
        rFinal[6] = dntCreateCell("GRAND TOTAL", styles.header);
        rFinal[7] = dntCreateCell("", styles.header);
        rFinal[8] = dntCreateCell(Math.round(excelGrandTotal).toFixed(2), styles.header);
        ws_data.push(rFinal);

        // 5. HSN Summary Table (Required for Indian GST Compliance)
        // Group items by HSN/SAC code and calculate totals
        const hsnSummary = {};

        // Process cart items
        invoiceData.cart.forEach(item => {
            const hsn = item.hsn;
            const taxableValue = item.qty * item.rate * (1 - (item.disc || 0) / 100);
            const taxAmount = gstEnabled ? taxableValue * (item.grate / 100) : 0;

            if (!hsnSummary[hsn]) {
                hsnSummary[hsn] = {
                    hsn: hsn,
                    taxableValue: 0,
                    igstAmount: 0,
                    cgstAmount: 0,
                    sgstAmount: 0,
                    taxRate: item.grate
                };
            }

            hsnSummary[hsn].taxableValue += taxableValue;

            if (gstEnabled && invoiceData.meta.billType === 'intra-state' && !invoiceData.meta.reverseCharge) {
                hsnSummary[hsn].cgstAmount += taxAmount / 2;
                hsnSummary[hsn].sgstAmount += taxAmount / 2;
            } else if (gstEnabled && !invoiceData.meta.reverseCharge) {
                hsnSummary[hsn].igstAmount += taxAmount;
            }
        });

        // Process other charges and add to HSN summary
        if (invoiceData.otherCharges) {
            invoiceData.otherCharges.forEach(charge => {
                const hsn = charge.hsnSac || "9999"; // Use 9999 as default for services without specific HSN
                const taxableValue = parseFloat(charge.amount) || 0;
                const taxRate = parseFloat(charge.gstRate) || 0;
                const taxAmount = gstEnabled ? (taxableValue * taxRate) / 100 : 0;

                if (!hsnSummary[hsn]) {
                    hsnSummary[hsn] = {
                        hsn: hsn,
                        taxableValue: 0,
                        igstAmount: 0,
                        cgstAmount: 0,
                        sgstAmount: 0,
                        taxRate: taxRate
                    };
                }

                hsnSummary[hsn].taxableValue += taxableValue;

                if (gstEnabled && invoiceData.meta.billType === 'intra-state' && !invoiceData.meta.reverseCharge) {
                    hsnSummary[hsn].cgstAmount += taxAmount / 2;
                    hsnSummary[hsn].sgstAmount += taxAmount / 2;
                } else if (gstEnabled && !invoiceData.meta.reverseCharge) {
                    hsnSummary[hsn].igstAmount += taxAmount;
                }
            });
        }

        // Add HSN Summary header (merged across columns A to I)
        ws_data.push([]); // Empty row for spacing
        const hsnHeaderRow = Array.from({ length: 9 }, () => dntCreateCell("", styles.cellCenter));
        hsnHeaderRow[0] = dntCreateCell("HSN Summary", styles.header);
        hsnHeaderRow[1] = dntCreateCell("", styles.cellCenter);
        hsnHeaderRow[2] = dntCreateCell("", styles.cellCenter);
        hsnHeaderRow[3] = dntCreateCell("", styles.cellCenter);
        hsnHeaderRow[4] = dntCreateCell("", styles.cellCenter);
        hsnHeaderRow[5] = dntCreateCell("", styles.cellCenter);
        hsnHeaderRow[6] = dntCreateCell("", styles.cellCenter);
        hsnHeaderRow[7] = dntCreateCell("", styles.cellCenter);
        hsnHeaderRow[8] = dntCreateCell("", styles.cellCenter);
        ws_data.push(hsnHeaderRow);

        // HSN Summary table headers
        const hsnHeadersRow = Array.from({ length: 9 }, () => dntCreateCell("", styles.cellCenter));
        hsnHeadersRow[0] = dntCreateCell("HSN", styles.header);
        hsnHeadersRow[1] = dntCreateCell("", styles.cellCenter);
        hsnHeadersRow[2] = dntCreateCell("Taxable Value", styles.header);
        hsnHeadersRow[3] = dntCreateCell("", styles.cellCenter);
        hsnHeadersRow[4] = dntCreateCell("IGST Amount", styles.header);
        hsnHeadersRow[5] = dntCreateCell("CGST Amount", styles.header);
        hsnHeadersRow[6] = dntCreateCell("SGST Amount", styles.header);
        hsnHeadersRow[7] = dntCreateCell("Total Tax", styles.header);
        hsnHeadersRow[8] = dntCreateCell("", styles.cellCenter);
        ws_data.push(hsnHeadersRow);

        // Add HSN Summary rows
        Object.values(hsnSummary).forEach(hsnData => {
            const hsnRow = Array.from({ length: 9 }, () => dntCreateCell("", styles.cellCenter));
            hsnRow[0] = dntCreateCell(hsnData.hsn, styles.cellLeft); // Left-aligned HSN code
            hsnRow[1] = dntCreateCell("", styles.cellCenter);
            hsnRow[2] = dntCreateCell(hsnData.taxableValue.toFixed(2), styles.cellRight);
            hsnRow[3] = dntCreateCell("", styles.cellCenter);
            hsnRow[4] = dntCreateCell(hsnData.igstAmount.toFixed(2), styles.cellRight);
            hsnRow[5] = dntCreateCell(hsnData.cgstAmount.toFixed(2), styles.cellRight);
            hsnRow[6] = dntCreateCell(hsnData.sgstAmount.toFixed(2), styles.cellRight);
            hsnRow[7] = dntCreateCell((hsnData.igstAmount + hsnData.cgstAmount + hsnData.sgstAmount).toFixed(2), styles.cellRight);
            hsnRow[8] = dntCreateCell("", styles.cellCenter);
            ws_data.push(hsnRow);
        });

        // Add Narration at the bottom if it exists
        if (invoiceData.meta.narration) {
            ws_data.push([]); // Empty row for spacing
            const narrationRow = Array.from({ length: 9 }, () => dntCreateCell("", styles.cellCenter));
            narrationRow[0] = dntCreateCell("Narration: " + (invoiceData.meta.narration || ""), { font: { bold: true }, alignment: { horizontal: "left", vertical: "top", wrapText: true } });
            // Span the narration across all 9 columns
            for (let i = 1; i < 9; i++) {
                narrationRow[i] = dntCreateCell("", styles.cellCenter);
            }
            ws_data.push(narrationRow);
        }

        // --- GENERATE ---
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(ws_data);

        // --- MERGING LOGIC (SAFE) ---
        const merges = [];

        // Title Merge
        merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } });

        // Find "Amount in Words" row index safely
        const wordsRowIndex = ws_data.findIndex(row =>
            // FIX: Check if row exists, row[0] exists, and row[0].v is a string before checking startsWith
            row && row[0] && row[0].v && typeof row[0].v === 'string' && row[0].v.startsWith("Amount in Words")
        );

        if (wordsRowIndex > -1) {
            // Merge Words box (4 rows down, 6 columns wide)
            merges.push({ s: { r: wordsRowIndex, c: 0 }, e: { r: wordsRowIndex + 3, c: 5 } });
        }

        // Find and merge HSN Summary header row (merge A to I columns)
        for (let i = 0; i < ws_data.length; i++) {
            const row = ws_data[i];
            if (row && row[0] && row[0].v && typeof row[0].v === 'string' && row[0].v === "HSN Summary") {
                // Merge columns A (index 0) to I (index 8)
                merges.push({ s: { r: i, c: 0 }, e: { r: i, c: 8 } });

                // Merge HSN Summary table columns to use full width:
                // A-B (HSN), C-D (Taxable Value), H-I (Total Tax)
                const headerRowIndex = i + 1;
                merges.push({ s: { r: headerRowIndex, c: 0 }, e: { r: headerRowIndex, c: 1 } });
                merges.push({ s: { r: headerRowIndex, c: 2 }, e: { r: headerRowIndex, c: 3 } });
                merges.push({ s: { r: headerRowIndex, c: 7 }, e: { r: headerRowIndex, c: 8 } });

                // Apply same merges for each data row until a non-data row is reached
                for (let r = i + 2; r < ws_data.length; r++) {
                    const dataRow = ws_data[r];
                    if (!dataRow || !dataRow[0] || !dataRow[0].v) break;
                    if (typeof dataRow[0].v === 'string' && dataRow[0].v.startsWith('Narration: ')) break;

                    merges.push({ s: { r: r, c: 0 }, e: { r: r, c: 1 } });
                    merges.push({ s: { r: r, c: 2 }, e: { r: r, c: 3 } });
                    merges.push({ s: { r: r, c: 7 }, e: { r: r, c: 8 } });
                }
            }
        }

        // Find and merge Narration row (merge A to I columns)
        for (let i = 0; i < ws_data.length; i++) {
            const row = ws_data[i];
            if (row && row[0] && row[0].v && typeof row[0].v === 'string' && row[0].v.startsWith("Narration: ")) {
                // Merge columns A (index 0) to I (index 8)
                merges.push({ s: { r: i, c: 0 }, e: { r: i, c: 8 } });
            }
        }

        // Find and merge G and H columns for footer rows (totals section)
        // Footer rows are typically the last few rows with totals
        for (let i = 0; i < ws_data.length; i++) {
            const row = ws_data[i];
            if (row && row[6] && row[6].v && typeof row[6].v === 'string') {
                // Check if this is a total row (contains labels like "Taxable Value", "CGST", "SGST", "IGST", "Round Off", "GRAND TOTAL")
                const label = row[6].v.trim();
                const lower = label.toLowerCase();
                const isExactFooterLabel = label === "Taxable Value" || label === "CGST" || label === "SGST" ||
                    label === "IGST" || label === "Round Off" || label === "GRAND TOTAL";
                const isOtherChargeLabel = lower.includes("freight") || lower.includes("packing") || lower.includes("handling") ||
                    lower.includes("insurance") || lower.includes("others");

                if (isExactFooterLabel || isOtherChargeLabel) {
                    // Merge columns G (index 6) and H (index 7)
                    merges.push({ s: { r: i, c: 6 }, e: { r: i, c: 7 } });
                }
            }
        }

        ws['!merges'] = merges;

        // --- PRINT / PAGE SETUP ---
        // Aim: minimal margins + fit to A4 width (1 page wide)
        ws['!pageSetup'] = {
            paperSize: 9, // A4
            orientation: 'portrait',
            fitToWidth: 1,
            fitToHeight: 0
        };
        ws['!margins'] = {
            left: 0.2,
            right: 0.2,
            top: 0.2,
            bottom: 0.2,
            header: 0.1,
            footer: 0.1
        };

        // --- WIDTHS ---
        ws['!cols'] = [
            { wch: 6 }, { wch: 35 }, { wch: 10 }, { wch: 8 },
            { wch: 6 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 15 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Tax Invoice");
        XLSX.writeFile(wb, `Invoice_${invoiceData.meta.dntBillNo}.xlsx`);
    }

    // Export to PDF
    async function dntExportBillToPdf(bill) {
        try {
            if (!bill || !bill.id) {
                alert('Bill ID not available');
                return;
            }

            const response = await window.api.get(`/inventory/api/bills/${bill.id}/pdf`);
            if (!response) {
                throw new Error('Request failed (no response). You may have been logged out.');
            }
            if (!response.ok) {
                const data = await response.json().catch(() => null);
                throw new Error((data && data.error) ? data.error : `Failed to generate PDF (HTTP ${response.status})`);
            }

            const dntContentType = (response.headers.get('content-type') || '').toLowerCase();
            if (!dntContentType.includes('application/pdf')) {
                const text = await response.text().catch(() => '');
                throw new Error(`Expected a PDF but received: ${dntContentType || 'unknown content-type'}.
        Server response: ${text ? text.slice(0, 200) : ''}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dntBillNo = (bill.bno || `BILL-${bill.id}`).toString().replace(/[^a-zA-Z0-9._-]/g, '_');
            a.download = `Invoice_${dntBillNo}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('PDF export failed:', err);
            alert('PDF export failed: ' + err.message);
        }
    }

    // --- UTIL: NUMBER TO WORDS (INDIAN CURRENCY) ---
    function dntNumToIndianRupees(num) {
        if (!num) return "";

        const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
        const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        const dntFormat = (n) => {
            if (n < 20) return a[n];
            const digit = n % 10;
            return b[Math.floor(n / 10)] + (digit ? " " + a[digit] : "");
        };

        const dntConvert = (n) => {
            if (n < 100) return dntFormat(n);
            if (n < 1000) return a[Math.floor(n / 100)] + "Hundred " + (n % 100 ? "and " + dntConvert(n % 100) : "");
            if (n < 100000) return dntConvert(Math.floor(n / 1000)) + "Thousand " + (n % 1000 ? dntConvert(n % 1000) : "");
            if (n < 10000000) return dntConvert(Math.floor(n / 100000)) + "Lakh " + (n % 100000 ? dntConvert(n % 100000) : "");
            return dntConvert(Math.floor(n / 10000000)) + "Crore " + (n % 10000000 ? dntConvert(n % 10000000) : "");
        };

        const parts = num.toString().split(".");
        const rupees = dntConvert(parseInt(parts[0]));
        const paise = parts[1] ? dntConvert(parseInt(parts[1].substring(0, 2).padEnd(2, '0'))) : "";

        let res = "Rupees " + rupees;
        if (paise) res += "and " + paise + "Paise ";
        return res + "Only";
    }

    // --- INIT ---
    dntFetchData();

})();