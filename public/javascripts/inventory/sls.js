(function renderSales() {
    console.log('Rendering Sales Tab...');
    const container = document.getElementById('sales');

    if (!container) return;

    // 1. Mock Data (Later you can fetch this from an API)
    const salesData = [
        { id: 'INV-001', date: '2025-01-01', customer: 'Acme Corp', amount: '$1,200', status: 'Paid' },
        { id: 'INV-002', date: '2025-01-02', customer: 'Globex', amount: '$850', status: 'Pending' },
        { id: 'INV-003', date: '2025-01-03', customer: 'Soylent Corp', amount: '$2,300', status: 'Paid' },
    ];

    // 2. Build HTML String
    // We create the table header and then loop through data for rows
    const html = `
        <div class="p-4 rounded-lg bg-white shadow-sm border border-gray-100">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-gray-800">Sales Records</h2>
                <button class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">
                    + New Invoice
                </button>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left text-gray-500">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th class="px-6 py-3">Invoice #</th>
                            <th class="px-6 py-3">Date</th>
                            <th class="px-6 py-3">Customer</th>
                            <th class="px-6 py-3">Amount</th>
                            <th class="px-6 py-3">Status</th>
                            <th class="px-6 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${salesData.map(item => `
                            <tr class="bg-white border-b hover:bg-gray-50">
                                <td class="px-6 py-4 font-medium text-gray-900">${item.id}</td>
                                <td class="px-6 py-4">${item.date}</td>
                                <td class="px-6 py-4">${item.customer}</td>
                                <td class="px-6 py-4">${item.amount}</td>
                                <td class="px-6 py-4">
                                    <span class="${item.status === 'Paid' ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'} px-2 py-1 rounded text-xs">
                                        ${item.status}
                                    </span>
                                </td>
                                <td class="px-6 py-4">
                                    <a href="#" class="font-medium text-blue-600 hover:underline">Edit</a>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // 3. Inject HTML
    container.innerHTML = html;
})();