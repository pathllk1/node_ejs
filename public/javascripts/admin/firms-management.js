// Execute when DOM is ready, whether loaded directly or via AJAX
function initFirmsManagement() {
    // Elements
    const firmsList = document.getElementById('firms-list');
    const usersList = document.getElementById('users-list');
    const addFirmBtn = document.getElementById('add-firm-btn');
    const firmModal = document.getElementById('firm-modal');
    const firmForm = document.getElementById('firm-form');
    const cancelFirmBtn = document.getElementById('cancel-firm-btn');
    const modalTitle = document.getElementById('modal-title');
    
    // Load data on page load
    loadFirms();
    loadUsersWithFirms();
    
    // Event listeners
    addFirmBtn.addEventListener('click', () => {
        openFirmModal();
    });
    
    cancelFirmBtn.addEventListener('click', () => {
        firmModal.classList.add('hidden');
    });
    
    firmForm.addEventListener('submit', handleFirmSubmit);
    
    // Close modal when clicking outside
    firmModal.addEventListener('click', (e) => {
        if (e.target === firmModal) {
            firmModal.classList.add('hidden');
        }
    });
    
    // Functions
    async function loadFirms() {
        try {
            const response = await window.api.get('/admin/firms');
            if (!response.ok) {
                if (response.status === 403) {
                    const errorData = await response.json();
                    showError(errorData.error || 'Access denied');
                    return;
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            const { firms } = await response.json();
            
            firmsList.innerHTML = firms.map(firm => `
                <tr class="hover:bg-blue-50 transition-colors duration-150">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${firm.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${firm.name}</td>
                    <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">${firm.address || '-'}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${firm.contact_info || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(firm.created_at).toLocaleDateString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div class="flex space-x-2"><button class="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors duration-150 edit-firm-btn" data-id="${firm.id}">Edit</button><button class="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors duration-150 delete-firm-btn" data-id="${firm.id}">Delete</button></div>
                    </td>
                </tr>
            `).join('');
            
            // Add event listeners to edit/delete buttons
            document.querySelectorAll('.edit-firm-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const firmId = btn.getAttribute('data-id');
                    editFirm(firmId);
                });
            });
            
            document.querySelectorAll('.delete-firm-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const firmId = btn.getAttribute('data-id');
                    deleteFirm(firmId);
                });
            });
        } catch (error) {
            console.error('Error loading firms:', error);
            showError('Failed to load firms');
        }
    }
    
    async function loadUsersWithFirms() {
        try {
            const response = await window.api.get('/admin/users-with-firms');
            if (!response.ok) {
                if (response.status === 403) {
                    const errorData = await response.json();
                    showError(errorData.error || 'Access denied');
                    return;
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            const { users } = await response.json();
            
            const firmsResponse = await window.api.get('/admin/firms');
            if (!firmsResponse.ok) {
                if (firmsResponse.status === 403) {
                    const errorData = await firmsResponse.json();
                    showError(errorData.error || 'Access denied');
                    return;
                } else {
                    throw new Error(`HTTP error! status: ${firmsResponse.status}`);
                }
            }
            const { firms } = await firmsResponse.json();
            
            usersList.innerHTML = users.map(user => `
                <tr class="hover:bg-blue-50 transition-colors duration-150">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${user.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.fullname}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.username}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.firm_name || 'No Firm Assigned'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <select class="assign-firm-select w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm" data-user-id="${user.id}">
                            <option value="">Select Firm</option>
                            ${firms.map(firm => `
                                <option value="${firm.id}" ${user.firm_id == firm.id ? 'selected' : ''}>
                                    ${firm.name}
                                </option>
                            `).join('')}
                        </select>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors duration-150 assign-firm-btn" data-user-id="${user.id}">Assign</button>
                    </td>
                </tr>
            `).join('');
            
            // Add event listeners to assign firm buttons
            document.querySelectorAll('.assign-firm-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const userId = btn.getAttribute('data-user-id');
                    // Find the select element by data-user-id attribute
                    const selectElement = document.querySelector(`select[data-user-id="${userId}"]`);
                    const firmId = selectElement ? selectElement.value : null;
                    assignUserToFirm(userId, firmId);
                });
            });
        } catch (error) {
            console.error('Error loading users with firms:', error);
            showError('Failed to load users with firms');
        }
    }
    
    function openFirmModal(firm = null) {
        const firmIdInput = document.getElementById('firm-id');
        const firmNameInput = document.getElementById('firm-name');
        const firmAddressInput = document.getElementById('firm-address');
        const firmContactInfoInput = document.getElementById('firm-contact-info');
        
        if (firm) {
            // Editing existing firm
            modalTitle.textContent = 'Edit Firm';
            firmIdInput.value = firm.id;
            firmNameInput.value = firm.name;
            firmAddressInput.value = firm.address || '';
            firmContactInfoInput.value = firm.contact_info || '';
        } else {
            // Adding new firm
            modalTitle.textContent = 'Add New Firm';
            firmForm.reset();
            firmIdInput.value = '';
        }
        
        firmModal.classList.remove('hidden');
        firmNameInput.focus();
    }
    
    async function handleFirmSubmit(e) {
        e.preventDefault();
        
        const firmId = document.getElementById('firm-id').value;
        const name = document.getElementById('firm-name').value.trim();
        const address = document.getElementById('firm-address').value.trim();
        const contactInfo = document.getElementById('firm-contact-info').value.trim();
        
        if (!name) {
            showError('Firm name is required');
            return;
        }
        
        try {
            let response;
            if (firmId) {
                // Update existing firm
                response = await window.api.put(`/admin/firms/${firmId}`, {
                    name,
                    address: address || null,
                    contact_info: contactInfo || null
                });
            } else {
                // Create new firm
                response = await window.api.post('/admin/firms', {
                    name,
                    address: address || null,
                    contact_info: contactInfo || null
                });
            }
            
            if (!response.ok) {
                if (response.status === 403) {
                    const errorData = await response.json();
                    showError(errorData.error || 'Access denied');
                    return;
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            
            const result = await response.json();
            if (response.ok) {
                showSuccess(result.message || 'Firm saved successfully');
                firmModal.classList.add('hidden');
                loadFirms();
            } else {
                showError(result.error || 'Failed to save firm');
            }
        } catch (error) {
            console.error('Error saving firm:', error);
            showError('Failed to save firm');
        }
    }
    
    function editFirm(firmId) {
        // Find the firm data from the current list
        const firmRows = firmsList.querySelectorAll('tr');
        for (let row of firmRows) {
            const idCell = row.cells[0];
            if (idCell.textContent === firmId) {
                const firm = {
                    id: firmId,
                    name: row.cells[1].textContent,
                    address: row.cells[2].textContent !== '-' ? row.cells[2].textContent : '',
                    contact_info: row.cells[3].textContent !== '-' ? row.cells[3].textContent : ''
                };
                
                openFirmModal(firm);
                break;
            }
        }
    }
    
    async function deleteFirm(firmId) {
        if (!confirm('Are you sure you want to delete this firm? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await window.api.delete(`/admin/firms/${firmId}`);
            if (!response.ok) {
                if (response.status === 403) {
                    const errorData = await response.json();
                    showError(errorData.error || 'Access denied');
                    return;
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            
            const result = await response.json();
            
            if (response.ok) {
                showSuccess(result.message || 'Firm deleted successfully');
                loadFirms();
                loadUsersWithFirms(); // Reload users as well since firm assignments might change
            } else {
                showError(result.error || 'Failed to delete firm');
            }
        } catch (error) {
            console.error('Error deleting firm:', error);
            showError('Failed to delete firm');
        }
    }
    
    async function assignUserToFirm(userId, firmId) {
        if (!firmId) {
            showError('Please select a firm');
            return;
        }
        
        try {
            const response = await window.api.post('/admin/firms/assign-user', {
                userId: parseInt(userId),
                firmId: parseInt(firmId)
            });
            
            if (!response.ok) {
                if (response.status === 403) {
                    const errorData = await response.json();
                    showError(errorData.error || 'Access denied');
                    return;
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            
            const result = await response.json();
            if (response.ok) {
                showSuccess(result.message || 'User assigned to firm successfully');
                loadUsersWithFirms();
            } else {
                showError(result.error || 'Failed to assign user to firm');
            }
        } catch (error) {
            console.error('Error assigning user to firm:', error);
            showError('Failed to assign user to firm');
        }
    }
    
    function showSuccess(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = 'fixed top-5 right-5 bg-green-500 text-white p-3 rounded-md z-50 shadow-lg toast toast-success';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    function showError(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = 'fixed top-5 right-5 bg-red-500 text-white p-3 rounded-md z-50 shadow-lg toast toast-error';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize the page - for both direct load and AJAX navigation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirmsManagement);
} else {
    // DOM is already loaded, initialize immediately
    initFirmsManagement();
}