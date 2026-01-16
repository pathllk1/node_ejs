// Initialize tabs when the DOM is loaded
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Set up tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('data-target');
            
            // Remove active classes from all buttons and contents
            tabButtons.forEach(btn => {
                btn.classList.remove('active', 'text-blue-600', 'border-blue-600');
                btn.classList.add('text-gray-500');
                // Reset border to transparent
                btn.classList.remove('border-blue-600');
                btn.classList.add('border-transparent');
            });
            
            tabContents.forEach(content => {
                content.classList.remove('active');
                content.classList.add('hidden');
            });
            
            // Add active classes to clicked button and corresponding content
            this.classList.add('active', 'text-blue-600', 'border-blue-600');
            this.classList.remove('text-gray-500', 'border-transparent');
            
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.remove('hidden');
                targetContent.classList.add('active');
            }
        });
    });
}

// Database management functionality
function setupDatabaseFeatures() {
    const backupBtn = document.getElementById('backup-database');
    if (backupBtn) {
        backupBtn.addEventListener('click', function() {
            // Show a confirmation dialog before backing up
            if (confirm('Are you sure you want to create a database backup? This may take a moment.')) {
                // Call the backup API
                fetch('/admin/backup-db', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'same-origin'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Database backup created successfully!');
                    } else {
                        alert('Error creating backup: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Backup error:', error);
                    alert('Error creating backup: ' + error.message);
                });
            }
        });
    }
    
    const restoreBtn = document.getElementById('restore-database');
    if (restoreBtn) {
        restoreBtn.addEventListener('click', function() {
            const fileInput = document.getElementById('restore-file');
            if (fileInput.files.length === 0) {
                alert('Please select a backup file to restore.');
                return;
            }
            
            if (confirm('Are you sure you want to restore the database from the selected file? This will overwrite current data.')) {
                const formData = new FormData();
                
                // Append all selected files
                for (let i = 0; i < fileInput.files.length; i++) {
                    formData.append('files', fileInput.files[i]);
                }
                
                fetch('/admin/restore-db', {
                    method: 'POST',
                    body: formData,
                    credentials: 'same-origin'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Database restored successfully!');
                        location.reload();
                    } else {
                        alert('Error restoring database: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Restore error:', error);
                    alert('Error restoring database: ' + error.message);
                });
            }
        });
    }
    
    const dropMongoRecordsBtn = document.getElementById('drop-mongodb-records');
    if (dropMongoRecordsBtn) {
        dropMongoRecordsBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to drop all records from MongoDB collections? This will permanently remove ALL data but keep the collections and cannot be undone.')) {
                fetch('/admin/drop-mongodb-records', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'same-origin'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('All MongoDB records dropped successfully!');
                    } else {
                        alert('Error dropping MongoDB records: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('MongoDB drop records error:', error);
                    alert('Error dropping MongoDB records: ' + error.message);
                });
            }
        });
    }
    
    const dropMongoCollectionsBtn = document.getElementById('drop-mongodb-collections');
    if (dropMongoCollectionsBtn) {
        dropMongoCollectionsBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to drop all MongoDB collections? This will permanently remove ALL collections and data and cannot be undone.')) {
                fetch('/admin/drop-mongodb-collections', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'same-origin'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('All MongoDB collections dropped successfully!');
                    } else {
                        alert('Error dropping MongoDB collections: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('MongoDB drop collections error:', error);
                    alert('Error dropping MongoDB collections: ' + error.message);
                });
            }
        });
    }
    
    // Load database info
    loadDatabaseInfo();
}

// Function to load database information
function loadDatabaseInfo() {
    // Simulate loading database info
    setTimeout(() => {
        const dbSizeEl = document.getElementById('db-size');
        const lastBackupEl = document.getElementById('last-backup');
        const totalRecordsEl = document.getElementById('total-records');
        
        if (dbSizeEl) dbSizeEl.textContent = '2.4 MB';
        if (lastBackupEl) lastBackupEl.textContent = 'Today, 10:30 AM';
        if (totalRecordsEl) totalRecordsEl.textContent = '1,248';
    }, 1000);
    
    // Or fetch from API:
    /*
    fetch('/admin/db-info')
    .then(response => response.json())
    .then(data => {
        const dbSizeEl = document.getElementById('db-size');
        const lastBackupEl = document.getElementById('last-backup');
        const totalRecordsEl = document.getElementById('total-records');
        
        if (dbSizeEl) dbSizeEl.textContent = data.size || 'Unknown';
        if (lastBackupEl) lastBackupEl.textContent = data.lastBackup || 'Never';
        if (totalRecordsEl) totalRecordsEl.textContent = data.totalRecords || 'Unknown';
    })
    .catch(error => {
        console.error('Error loading DB info:', error);
    });
    */
}

// Admin features functionality
function setupAdminFeatures() {
    const manageSettingsBtn = document.getElementById('manage-settings');
    if (manageSettingsBtn) {
        manageSettingsBtn.addEventListener('click', function() {
            window.location.href = '/admin/settings';
        });
    }
    
    const viewActivityBtn = document.getElementById('view-activity');
    if (viewActivityBtn) {
        viewActivityBtn.addEventListener('click', function() {
            alert('User activity monitoring feature would open here.');
        });
    }
}

// Logs functionality
function setupLogsFeatures() {
    // Load logs data when logs tab is activated
    const logsTab = document.getElementById('logs-tab');
    if (logsTab) {
        logsTab.addEventListener('click', function() {
            loadLogsData();
        });
    }
    
    // Also load logs if logs tab is the initial active tab
    if (document.querySelector('.tab-content.active')?.id === 'logs-content') {
        loadLogsData();
    }
}

// Load logs data from API
async function loadLogsData() {
    try {
        const response = await window.api.get('/admin/api/logs');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.logs) {
            // Initialize the logs table with the data
            window.allLogs = data.logs;
            window.filteredLogs = [...data.logs];
            window.currentPage = 1;
            window.rowsPerPage = 15;
            
            // Call the render function
            renderLogsTable();
            setupLogsEventListeners();
        } else {
            console.error('No logs data received');
        }
    } catch (error) {
        console.error('Error loading logs:', error);
        
        // Show error in the table
        const tableBody = document.getElementById('logsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-red-500">Error loading logs: ${error.message}</td></tr>`;
        }
    }
}

// Initialize logs table rendering
function renderLogsTable() {
    const tableBody = document.getElementById('logsTableBody');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const startRowEl = document.getElementById('startRow');
    const endRowEl = document.getElementById('endRow');
    const totalRowsEl = document.getElementById('totalRows');
    const pageIndicator = document.getElementById('pageIndicator');
    
    if (!tableBody) return;
    
    // Calculate pagination slices
    const totalItems = window.filteredLogs.length;
    const totalPages = Math.ceil(totalItems / window.rowsPerPage);
    
    // Ensure current page is valid
    if (window.currentPage > totalPages) window.currentPage = Math.max(1, totalPages);
    
    const start = (window.currentPage - 1) * window.rowsPerPage;
    const end = start + window.rowsPerPage;
    const pageData = window.filteredLogs.slice(start, end);

    // Update Stats UI
    if (totalRowsEl) totalRowsEl.textContent = totalItems;
    if (startRowEl) startRowEl.textContent = totalItems === 0 ? 0 : start + 1;
    if (endRowEl) endRowEl.textContent = Math.min(end, totalItems);
    if (pageIndicator) pageIndicator.textContent = `Page ${window.currentPage} of ${Math.max(1, totalPages)}`;

    // Handle Empty State
    if (pageData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="px-4 py-12 text-center text-gray-400 italic">No logs found matching your criteria.</td></tr>`;
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }

    // Generate Rows
    tableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
    pageData.forEach(log => {
        const row = document.createElement('tr');
        
        // LIME HOVER applied here
        row.className = 'transition-colors hover:bg-lime-200 group cursor-default border-b border-gray-50 last:border-0';
        
        // Get method badge classes
        const methodBadge = getMethodBadge(log.method);
        
        row.innerHTML = `
            <td class="px-4 py-3 font-mono text-gray-500 text-xs">#${log.id}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${methodBadge}">
                    ${log.method || 'N/A'}
                </span>
            </td>
            <td class="px-4 py-3 font-mono text-xs text-gray-700 truncate max-w-md" title="${log.url || ''}">
                ${log.url || 'N/A'}
            </td>
            <td class="px-4 py-3 text-gray-500 text-xs">
                ${(log.ip === '::1' || log.ip === '127.0.0.1') ? 'Localhost' : log.ip || 'N/A'}
            </td>
            <td class="px-4 py-3 text-xs">
                ${log.username ? `<span class="px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-semibold">${log.username}</span>` : '<span class="text-gray-400">Guest</span>'}
            </td>
            <td class="px-4 py-3 text-gray-500 text-xs text-right whitespace-nowrap">
                ${formatDate(log.timestamp)}
            </td>
        `;
        fragment.appendChild(row);
    });

    tableBody.appendChild(fragment);

    // Update Buttons state
    if (prevBtn) prevBtn.disabled = window.currentPage === 1;
    if (nextBtn) nextBtn.disabled = window.currentPage >= totalPages;
}

// Helper function to get method badge classes
function getMethodBadge(method) {
    const m = method ? method.toUpperCase() : 'UNKNOWN';
    if (m === 'GET') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (m === 'POST') return 'bg-green-100 text-green-700 border-green-200';
    if (m === 'DELETE') return 'bg-red-100 text-red-700 border-red-200';
    if (m === 'PUT' || m === 'PATCH') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
}

// Helper function to format date
function formatDate(isoString) {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString();
}

// Set up logs event listeners
function setupLogsEventListeners() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const searchInput = document.getElementById('searchInput');
    
    // Previous button event
    if (prevBtn) {
        prevBtn.removeEventListener('click', handlePrevPage); // Remove any existing listeners
        prevBtn.addEventListener('click', handlePrevPage);
    }
    
    // Next button event
    if (nextBtn) {
        nextBtn.removeEventListener('click', handleNextPage); // Remove any existing listeners
        nextBtn.addEventListener('click', handleNextPage);
    }
    
    // Search input event
    if (searchInput) {
        searchInput.removeEventListener('input', handleSearch); // Remove any existing listeners
        searchInput.addEventListener('input', handleSearch);
    }
}

// Handle previous page
function handlePrevPage() {
    if (window.currentPage > 1) {
        window.currentPage--;
        renderLogsTable();
    }
}

// Handle next page
function handleNextPage() {
    const totalPages = Math.ceil(window.filteredLogs.length / window.rowsPerPage);
    if (window.currentPage < totalPages) {
        window.currentPage++;
        renderLogsTable();
    }
}

// Handle search
function handleSearch(e) {
    const term = e.target.value.toLowerCase();
    
    if (!term) {
        window.filteredLogs = [...window.allLogs];
    } else {
        window.filteredLogs = window.allLogs.filter(log => {
            const url = (log.url || '').toLowerCase();
            const ip = (log.ip || '').toLowerCase();
            const username = (log.username || '').toLowerCase();
            const method = (log.method || '').toLowerCase();
            return url.includes(term) || ip.includes(term) || username.includes(term) || method.includes(term);
        });
    }
    
    window.currentPage = 1; // Reset to page 1 on search
    renderLogsTable();
}

// Initialize everything when the DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initializeTabs();
        setupDatabaseFeatures();
        setupAdminFeatures();
        setupLogsFeatures();
    });
} else {
    // DOM is already loaded
    initializeTabs();
    setupDatabaseFeatures();
    setupAdminFeatures();
    setupLogsFeatures();
}