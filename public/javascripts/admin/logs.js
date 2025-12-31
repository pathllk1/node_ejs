document.addEventListener('DOMContentLoaded', () => {
    // 1. Get Data safely from the DOM
    const dataScript = document.getElementById('logs-data');
    if (!dataScript) return;

    let allLogs = [];
    try {
        allLogs = JSON.parse(dataScript.textContent);
    } catch (e) {
        console.error("Failed to parse logs data", e);
        return;
    }

    // Pagination Config
    const rowsPerPage = 15;
    let currentPage = 1;
    let filteredLogs = [...allLogs];

    // DOM Elements
    const tableBody = document.getElementById('logsTableBody');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const startRowEl = document.getElementById('startRow');
    const endRowEl = document.getElementById('endRow');
    const totalRowsEl = document.getElementById('totalRows');
    const pageIndicator = document.getElementById('pageIndicator');
    const searchInput = document.getElementById('searchInput');

    // --- Helper: Format Date ---
    function formatDate(isoString) {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleString();
    }

    // --- Helper: Method Badge Styles ---
    function getMethodBadge(method) {
        const m = method ? method.toUpperCase() : 'UNKNOWN';
        if (m === 'GET') return 'bg-blue-100 text-blue-700 border-blue-200';
        if (m === 'POST') return 'bg-green-100 text-green-700 border-green-200';
        if (m === 'DELETE') return 'bg-red-100 text-red-700 border-red-200';
        if (m === 'PUT' || m === 'PATCH') return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }

    // --- Render Function ---
    function renderTable() {
        tableBody.innerHTML = '';
        
        // Calculate pagination slices
        const totalItems = filteredLogs.length;
        const totalPages = Math.ceil(totalItems / rowsPerPage);
        
        // Ensure current page is valid
        if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
        
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageData = filteredLogs.slice(start, end);

        // Update Stats UI
        totalRowsEl.textContent = totalItems;
        startRowEl.textContent = totalItems === 0 ? 0 : start + 1;
        endRowEl.textContent = Math.min(end, totalItems);
        pageIndicator.textContent = `Page ${currentPage} of ${Math.max(1, totalPages)}`;

        // Handle Empty State
        if (pageData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="px-4 py-12 text-center text-slate-400 italic">No logs found matching your criteria.</td></tr>`;
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        // Generate Rows
        const fragment = document.createDocumentFragment();
        
        pageData.forEach(log => {
            const row = document.createElement('tr');
            
            // Apply requested LIME HOVER color here
            row.className = 'transition-colors hover:bg-lime-200 group cursor-default border-b border-slate-50 last:border-0';
            
            row.innerHTML = `
                <td class="px-4 py-3 font-mono text-slate-500 text-xs">#${log.id}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getMethodBadge(log.method)}">
                        ${log.method}
                    </span>
                </td>
                <td class="px-4 py-3 font-mono text-xs text-slate-700 truncate max-w-md" title="${log.url}">
                    ${log.url}
                </td>
                <td class="px-4 py-3 text-slate-500 text-xs">
                    ${(log.ip === '::1' || log.ip === '127.0.0.1') ? 'Localhost' : log.ip}
                </td>
                <td class="px-4 py-3 text-slate-500 text-xs text-right whitespace-nowrap">
                    ${formatDate(log.timestamp)}
                </td>
            `;
            fragment.appendChild(row);
        });

        tableBody.appendChild(fragment);

        // Update Buttons state
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage >= totalPages;
    }

    // --- Event Listeners ---

    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });

    // Search Logic
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        
        if (!term) {
            filteredLogs = [...allLogs];
        } else {
            filteredLogs = allLogs.filter(log => {
                const url = (log.url || '').toLowerCase();
                const ip = (log.ip || '').toLowerCase();
                const method = (log.method || '').toLowerCase();
                return url.includes(term) || ip.includes(term) || method.includes(term);
            });
        }
        
        currentPage = 1; // Reset to page 1 on search
        renderTable();
    });

    // Initial Render
    renderTable();
});