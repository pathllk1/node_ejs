(function renderPurchase() {
    console.log('Rendering Purchase Tab...');
    const container = document.getElementById('purchase');

    if (!container) return;

    // 1. Mock Data
    const purchaseData = [
        { id: 'PO-991', vendor: 'Office Depot', items: 5, total: '$450' },
        { id: 'PO-992', vendor: 'Tech Supplies Inc', items: 12, total: '$1,200' },
    ];

    // 2. Build HTML
    const html = `
        <div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
            <h2 class="text-xl font-bold text-gray-800 mb-4">Purchase Orders</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${purchaseData.map(po => `
                    <div class="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100">
                        <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900">${po.vendor}</h5>
                        <p class="font-normal text-gray-700">Order ID: ${po.id}</p>
                        <p class="font-normal text-gray-700">Items: ${po.items}</p>
                        <div class="mt-4 flex justify-between items-center">
                            <span class="text-lg font-bold text-gray-900">${po.total}</span>
                            <button class="text-white bg-green-600 hover:bg-green-700 font-medium rounded-lg text-sm px-5 py-2.5">
                                View Details
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // 3. Inject HTML
    container.innerHTML = html;
})();