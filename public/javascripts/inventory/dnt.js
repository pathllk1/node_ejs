(function renderDebitNotes() {
    console.log('Rendering Debit Note Tab...');
    const container = document.getElementById('debit-note'); // Matches HTML ID

    if (!container) return;

    // 1. Mock Data
    const debitData = [
        { id: 'DN-202', ref_invoice: 'INV-001', date: '2025-01-05', vendor: 'Acme Corp', amount: '$200', reason: 'Damaged Goods' },
        { id: 'DN-203', ref_invoice: 'INV-004', date: '2025-01-06', vendor: 'Global Supplies', amount: '$50', reason: 'Overcharge' },
    ];

    // 2. Build HTML
    const html = `
        <div class="bg-white p-6 rounded-lg shadow-sm border border-red-100">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h2 class="text-xl font-bold text-gray-800">Debit Notes</h2>
                    <p class="text-sm text-gray-500">Issued to vendors for returns or adjustments</p>
                </div>
                <button class="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-medium rounded-lg text-sm px-4 py-2">
                    Create Debit Note
                </button>
            </div>

            <div class="overflow-hidden border border-gray-200 rounded-lg">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DN #</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref Invoice</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${debitData.map(item => `
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">${item.id}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.ref_invoice}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.vendor}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 italic">${item.reason}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">${item.amount}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
})();