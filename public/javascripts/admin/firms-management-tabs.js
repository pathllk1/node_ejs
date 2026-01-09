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
    const viewLogsBtn = document.getElementById('view-logs');
    if (viewLogsBtn) {
        viewLogsBtn.addEventListener('click', function() {
            window.location.href = '/admin/logs';
        });
    }
    
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

// Initialize everything when the DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initializeTabs();
        setupDatabaseFeatures();
        setupAdminFeatures();
    });
} else {
    // DOM is already loaded
    initializeTabs();
    setupDatabaseFeatures();
    setupAdminFeatures();
}