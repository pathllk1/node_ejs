// Wait for DOM to be ready using multiple methods to ensure compatibility

// Define functions in global scope to ensure they're available
function fetchGSTStatus() {
    const gstStatusText = document.getElementById('gstStatusText');
    
    window.api.get('/admin/gst-status')
        .then(response => response.json())
        .then(data => {
            // Get elements again to ensure they're available when function executes
            const gstStatusText = document.getElementById('gstStatusText');
            const gstToggleBtn = document.getElementById('gstToggleBtn');
            const toggleSpan = gstToggleBtn.querySelector('span');
            updateToggleUI(data.gst_enabled);
        })
        .catch(error => {
            console.error('Error fetching GST status:', error);
            if (gstStatusText) {
                gstStatusText.textContent = 'Error loading status';
                gstStatusText.className = 'text-red-600';
            }
        });
}

function updateGSTStatus(enabled) {
    // Get elements at execution time
    const gstStatusText = document.getElementById('gstStatusText');
    const gstToggleBtn = document.getElementById('gstToggleBtn');
    
    // Show loading state
    if (gstToggleBtn) gstToggleBtn.disabled = true;
    if (gstStatusText) gstStatusText.textContent = 'Updating...';
    
    window.api.put('/admin/gst-status', { enabled: enabled })
    .then(response => response.json())
    .then(data => {
        // Get elements again to ensure they're available when function executes
        const gstStatusText = document.getElementById('gstStatusText');
        const gstToggleBtn = document.getElementById('gstToggleBtn');
        const toggleSpan = gstToggleBtn.querySelector('span');
        updateToggleUI(enabled);
        showToast(data.message, 'success');
    })
    .catch(error => {
        console.error('Error updating GST status:', error);
        fetchGSTStatus(); // Reload current status
        showToast('Error updating GST status', 'error');
    });
}

function updateToggleUI(isEnabled) {
    const gstStatusText = document.getElementById('gstStatusText');
    const gstToggleBtn = document.getElementById('gstToggleBtn');
    const toggleSpan = gstToggleBtn.querySelector('span');
    
    if (!gstStatusText || !gstToggleBtn || !toggleSpan) {
        console.error('Elements not found for UI update');
        return;
    }
    
    if (isEnabled) {
        gstToggleBtn.classList.remove('bg-gray-300');
        gstToggleBtn.classList.add('bg-green-500');
        toggleSpan.classList.remove('translate-x-0');
        toggleSpan.classList.add('translate-x-6');
        gstStatusText.textContent = 'Enabled';
        gstStatusText.className = 'text-green-600 font-medium';
    } else {
        gstToggleBtn.classList.remove('bg-green-500');
        gstToggleBtn.classList.add('bg-gray-300');
        toggleSpan.classList.remove('translate-x-6');
        toggleSpan.classList.add('translate-x-0');
        gstStatusText.textContent = 'Disabled';
        gstStatusText.className = 'text-gray-600 font-medium';
    }
    gstToggleBtn.disabled = false;
}

function showToast(message, type) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium z-50 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function initGSTSettings() {
    // Small delay to ensure DOM is fully loaded in AJAX context
    setTimeout(() => {
        const gstStatusText = document.getElementById('gstStatusText');
        const gstToggleBtn = document.getElementById('gstToggleBtn');
        
        if (!gstStatusText || !gstToggleBtn) {
            console.error('GST settings elements not found, retrying...');
            // Retry after a short delay
            setTimeout(initGSTSettings, 100);
            return;
        }
        
        const toggleSpan = gstToggleBtn.querySelector('span');
        
        // Load current GST status
        fetchGSTStatus();
        
        // Remove existing event listeners to avoid duplicates
        gstToggleBtn.replaceWith(gstToggleBtn.cloneNode(true));
        const newGstToggleBtn = document.getElementById('gstToggleBtn');
        
        // Toggle GST status when button is clicked
        newGstToggleBtn.addEventListener('click', function() {
            if (this.disabled) return;
            
            const isEnabled = this.classList.contains('bg-green-500');
            const newStatus = !isEnabled;
            
            updateGSTStatus(newStatus);
        });
    }, 50);
}

// Try multiple ways to initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGSTSettings);
} else {
    // DOM is already loaded, initialize immediately
    initGSTSettings();
}

// Firm Management Functions

function loadFirms() {
    const firmsList = document.getElementById('firmsList');
    
    window.api.get('/admin/firms')
        .then(response => response.json())
        .then(data => {
            if (!firmsList) return;
            
            if (data.firms && data.firms.length > 0) {
                firmsList.innerHTML = '';
                
                data.firms.forEach(firm => {
                    const firmElement = document.createElement('div');
                    firmElement.className = 'p-3 bg-gray-50 rounded-lg flex justify-between items-center';
                    
                    const firmInfo = document.createElement('div');
                    firmInfo.innerHTML = `
                        <div class="font-medium text-gray-800">${firm.name}</div>
                        <div class="text-sm text-gray-600">ID: ${firm.id}</div>
                        ${firm.address ? `<div class="text-sm text-gray-600">${firm.address}</div>` : ''}
                        ${firm.contact_info ? `<div class="text-sm text-gray-600">Contact: ${firm.contact_info}</div>` : ''}
                        <div class="text-xs text-gray-500">Created: ${new Date(firm.created_at).toLocaleDateString()}</div>
                    `;
                    
                    const actions = document.createElement('div');
                    actions.innerHTML = `
                        <button onclick="editFirm(${firm.id}, '${firm.name.replace(/'/g, "\\'")}', '${(firm.address || '').replace(/'/g, "\\'")}', '${(firm.contact_info || '').replace(/'/g, "\\'")}')" 
                                class="mr-2 px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600">
                            Edit
                        </button>
                        <button onclick="deleteFirm(${firm.id})" 
                                class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">
                            Delete
                        </button>
                    `;
                    
                    firmElement.appendChild(firmInfo);
                    firmElement.appendChild(actions);
                    firmsList.appendChild(firmElement);
                });
            } else {
                firmsList.innerHTML = '<p class="text-gray-600">No firms found. Create your first firm above.</p>';
            }
        })
        .catch(error => {
            console.error('Error loading firms:', error);
            if (firmsList) {
                firmsList.innerHTML = '<p class="text-red-600">Error loading firms. Please try again.</p>';
            }
        });
}

function addFirm(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const firmData = Object.fromEntries(formData);
    
    window.api.post('/admin/firms', firmData)
        .then(response => response.json())
        .then(data => {
            showToast(data.message, 'success');
            form.reset();
            loadFirms();
            loadUsersWithFirms();
            loadFirmsForAssignment();
        })
        .catch(error => {
            console.error('Error adding firm:', error);
            showToast('Error adding firm', 'error');
        });
}

function editFirm(id, name, address, contactInfo) {
    // In a real implementation, you would show an edit form
    // For now, just showing an alert as an example
    const newName = prompt('Edit firm name:', name);
    if (newName !== null) {
        const updatedFirmData = {
            name: newName,
            address: address,
            contact_info: contactInfo
        };
        
        window.api.put(`/admin/firms/${id}`, updatedFirmData)
            .then(response => response.json())
            .then(data => {
                showToast(data.message, 'success');
                loadFirms();
            })
            .catch(error => {
                console.error('Error updating firm:', error);
                showToast('Error updating firm', 'error');
            });
    }
}

function deleteFirm(id) {
    if (confirm('Are you sure you want to delete this firm? This action cannot be undone.')) {
        window.api.delete(`/admin/firms/${id}`)
            .then(response => response.json())
            .then(data => {
                showToast(data.message, 'success');
                loadFirms();
                loadUsersWithFirms();
                loadFirmsForAssignment();
            })
            .catch(error => {
                console.error('Error deleting firm:', error);
                showToast(error.message || 'Error deleting firm', 'error');
            });
    }
}

function loadUsersWithFirms() {
    const usersList = document.getElementById('usersWithFirmsList');
    
    window.api.get('/admin/users-with-firms')
        .then(response => response.json())
        .then(data => {
            if (!usersList) return;
            
            if (data.users && data.users.length > 0) {
                usersList.innerHTML = '';
                
                data.users.forEach(user => {
                    const userElement = document.createElement('div');
                    userElement.className = 'p-3 bg-gray-50 rounded-lg';
                    
                    userElement.innerHTML = `
                        <div class="font-medium text-gray-800">${user.fullname} (${user.username})</div>
                        <div class="text-sm text-gray-600">Email: ${user.email}</div>
                        <div class="text-sm text-gray-600">
                            Firm: ${user.firm_name || 'Not assigned'} ${user.firm_name ? `(ID: ${user.firm_id})` : '(No firm assigned)'}
                        </div>
                        <div class="text-xs text-gray-500">Joined: ${new Date(user.created_at).toLocaleDateString()}</div>
                    `;
                    
                    usersList.appendChild(userElement);
                });
            } else {
                usersList.innerHTML = '<p class="text-gray-600">No users found.</p>';
            }
        })
        .catch(error => {
            console.error('Error loading users with firms:', error);
            if (usersList) {
                usersList.innerHTML = '<p class="text-red-600">Error loading users. Please try again.</p>';
            }
        });
}

function loadUsersForAssignment() {
    const userSelect = document.getElementById('userIdSelect');
    
    if (!userSelect) return;
    
    window.api.get('/admin/users-with-firms')
        .then(response => response.json())
        .then(data => {
            // Clear existing options except the first one
            userSelect.innerHTML = '<option value="">Select a user</option>';
            
            if (data.users && data.users.length > 0) {
                data.users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.fullname} (${user.username}) - ${user.firm_name || 'No firm'}`;
                    userSelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error loading users for assignment:', error);
        });
}

function loadFirmsForAssignment() {
    const firmSelect = document.getElementById('firmIdSelect');
    
    if (!firmSelect) return;
    
    window.api.get('/admin/firms')
        .then(response => response.json())
        .then(data => {
            // Clear existing options except the first one
            firmSelect.innerHTML = '<option value="">Select a firm</option>';
            
            if (data.firms && data.firms.length > 0) {
                data.firms.forEach(firm => {
                    const option = document.createElement('option');
                    option.value = firm.id;
                    option.textContent = `${firm.name} (ID: ${firm.id})`;
                    firmSelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error loading firms for assignment:', error);
        });
}

function assignUserToFirm(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const { userId, firmId } = Object.fromEntries(formData);
    
    window.api.post('/admin/firms/assign-user', { userId: parseInt(userId), firmId: parseInt(firmId) })
        .then(response => response.json())
        .then(data => {
            showToast(data.message, 'success');
            form.reset();
            loadUsersWithFirms();
            loadUsersForAssignment();
        })
        .catch(error => {
            console.error('Error assigning user to firm:', error);
            showToast(error.message || 'Error assigning user to firm', 'error');
        });
}

// Initialize firm management when DOM is ready
function initFirmManagement() {
    setTimeout(() => {
        // Add event listeners to forms
        const addFirmForm = document.getElementById('addFirmForm');
        const assignUserForm = document.getElementById('assignUserForm');
        
        if (addFirmForm) {
            addFirmForm.removeEventListener('submit', addFirm); // Remove any existing listeners
            addFirmForm.addEventListener('submit', addFirm);
        }
        
        if (assignUserForm) {
            assignUserForm.removeEventListener('submit', assignUserToFirm); // Remove any existing listeners
            assignUserForm.addEventListener('submit', assignUserToFirm);
        }
        
        // Load initial data
        loadFirms();
        loadUsersWithFirms();
        loadUsersForAssignment();
        loadFirmsForAssignment();
    }, 50);
}

// Initialize firm management
setTimeout(initFirmManagement, 100);