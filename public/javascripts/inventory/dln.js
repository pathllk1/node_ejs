(function renderDeliveryNotes() {
    console.log('Rendering Delivery Note Tab...');
    const container = document.getElementById('delivery-note'); // Matches HTML ID

    if (!container) return;

    // 1. Mock Data
    const deliveryData = [
        { id: 'DEL-8801', dest: 'Warehouse A', driver: 'Mike T.', vehicle: 'KA-01-AB-1234', status: 'In Transit' },
        { id: 'DEL-8802', dest: 'Retail Store 5', driver: 'Sarah L.', vehicle: 'MH-04-XY-9876', status: 'Delivered' },
        { id: 'DEL-8803', dest: 'Client Site B', driver: 'Pending', vehicle: '--', status: 'Preparing' },
    ];

    // 2. Build HTML
    const html = `
        <div class="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h2 class="text-xl font-bold text-gray-800 mb-6">Delivery Challans / Notes</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${deliveryData.map(item => `
                    <div class="bg-white p-5 rounded-lg shadow-sm border-l-4 ${item.status === 'Delivered' ? 'border-l-green-500' : item.status === 'In Transit' ? 'border-l-blue-500' : 'border-l-yellow-500'}">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="font-bold text-gray-800 text-lg">${item.id}</h3>
                            <span class="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-600">${item.status}</span>
                        </div>
                        
                        <div class="space-y-2 text-sm text-gray-600 mt-3">
                            <p class="flex items-center gap-2">
                                <span class="font-medium text-gray-400">To:</span> ${item.dest}
                            </p>
                            <p class="flex items-center gap-2">
                                <span class="font-medium text-gray-400">Driver:</span> ${item.driver}
                            </p>
                            <p class="flex items-center gap-2">
                                <span class="font-medium text-gray-400">Vehicle:</span> ${item.vehicle}
                            </p>
                        </div>
                        
                        <div class="mt-4 pt-3 border-t border-gray-100 text-center">
                            <button class="text-blue-600 hover:text-blue-800 text-sm font-medium">Track Shipment &rarr;</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;
})();