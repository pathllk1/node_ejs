(function renderCreditNotes() {
    console.log('Rendering Credit Note Tab...');
    const container = document.getElementById('credit-note'); // Matches HTML ID

    if (!container) return;

    // 1. Mock Data
    const creditData = [
        { id: 'CN-501', customer: 'John Doe', date: '2025-01-10', amount: '$120.00', status: 'Approved' },
        { id: 'CN-502', customer: 'Jane Smith', date: '2025-01-11', amount: '$45.00', status: 'Draft' },
    ];

    // 2. Build HTML
    const html = `
        <div class="bg-white p-6 rounded-lg shadow-sm border border-blue-100">
             <div class="flex justify-between items-center mb-6">
                <div>
                    <h2 class="text-xl font-bold text-gray-800">Credit Notes</h2>
                    <p class="text-sm text-gray-500">Issued to customers</p>
                </div>
                <button class="bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 font-medium rounded-lg text-sm px-4 py-2">
                    Create Credit Note
                </button>
            </div>

            <div class="grid gap-4">
                ${creditData.map(item => `
                    <div class="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-4">
                            <div class="p-3 bg-blue-100 text-blue-600 rounded-full">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            </div>
                            <div>
                                <p class="text-sm font-medium text-gray-900">${item.id} - ${item.customer}</p>
                                <p class="text-xs text-gray-500">Date: ${item.date}</p>
                            </div>
                        </div>
                        <div class="text-right">
                             <p class="text-sm font-bold text-gray-900">${item.amount}</p>
                             <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                                ${item.status}
                             </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;
})();