(function initEmployees() {
    // Global State
    let allEmployees = [];
    let filteredEmployees = [];
    let currentPage = 1;
    let itemsPerPage = 10;
    let currentEmployee = null; // Store currently viewed/edited employee

    /**
     * ==========================================
     * 1. TOAST NOTIFICATION SYSTEM
     * ==========================================
     */
    function formatDate(dateString) {
        if (!dateString) return '-';
        try {
            // Handle both ISO strings and other formats
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-'; // Invalid date
            return date.toLocaleDateString();
        } catch (e) {
            console.warn('Invalid date format:', dateString);
            return '-';
        }
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const template = document.getElementById('toast-template');

        if (!container || !template) {
            console.warn('Toast container or template not found in DOM.');
            alert(message); // Fallback
            return;
        }

        // Clone the template
        const toast = template.cloneNode(true);
        
        // Remove the ID to avoid duplicates in DOM
        toast.removeAttribute('id');
        
        // Remove 'hidden' immediately so it exists in layout,
        // but keep translate-x-full/opacity-0 for the animation start state
        toast.classList.remove('hidden');

        // 1. Set Message
        const msgEl = toast.querySelector('#toast-message');
        if (msgEl) msgEl.textContent = message;

        // 2. Set Icon & Color based on type
        const iconContainer = toast.querySelector('#toast-icon');
        
        // Reset borders
        toast.classList.remove('border-l-4');
        toast.classList.add('border-l-4'); // Re-add base class

        if (type === 'success') {
            toast.classList.add('border-green-500');
            if (iconContainer) {
                iconContainer.innerHTML = `
                    <svg class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>`;
            }
        } else {
            toast.classList.add('border-red-500');
            if (iconContainer) {
                iconContainer.innerHTML = `
                    <svg class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>`;
            }
        }

        // 3. Attach Close Event (Manual listener to avoid inline CSP issues)
        const closeBtn = toast.querySelector('.toast-close-btn');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.preventDefault();
                removeToast(toast);
            };
        }

        // 4. Append to Container
        container.appendChild(toast);

        // 5. Trigger Animation (Small timeout ensures DOM reflow happens first)
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 50);

        // 6. Auto Dismiss
        setTimeout(() => {
            removeToast(toast);
        }, 3000);
    }

    function removeToast(element) {
        if (!element) return;
        
        // Slide out
        element.classList.add('translate-x-full', 'opacity-0');
        
        // Remove from DOM after transition matches CSS duration (300ms)
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 350);
    }

    // Initialize
    (function initEmployeesPage() {
        console.log("Employee management page loaded...");
        setupEventListeners();
        fetchEmployees();
    })();

    // Fetch Data using window.api
    async function fetchEmployees() {
        try {
            const res = await window.api.get('/masterrolls/api/masterrolls');
            const data = await res.json();
            
            // Handle API errors embedded in JSON
            if (data.error) throw new Error(data.error);

            allEmployees = data.data;
            filteredEmployees = data.data;
            renderTable();
        } catch (err) {
            console.error('Failed to fetch employees:', err);
            document.getElementById('employeeTableBody').innerHTML = `<tr><td colspan="8" class="text-center p-4 text-red-500">Error loading data</td></tr>`;
            showToast('Failed to fetch employees: ' + err.message, 'error');
        }
    }

    // Setup Event Listeners
    function setupEventListeners() {
        // 1. Search Input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                filteredEmployees = allEmployees.filter(employee => {
                    // Check standard fields
                    return Object.values(employee).some(val => 
                        String(val).toLowerCase().includes(term)
                    );
                });
                currentPage = 1;
                renderTable();
            });
        }

        // 2. Pagination Buttons
        document.getElementById('prevBtn').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredEmployees.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });

        // 3. Modal Controls
        document.getElementById('closeModalBtn').addEventListener('click', closeModal);
        document.getElementById('closeModalBtn2').addEventListener('click', closeModal);
        document.getElementById('exportBtn').addEventListener('click', exportToExcel);

        // 4. Form Modal Controls
        const addEmployeeBtn = document.getElementById('addEmployeeBtn');
        if (addEmployeeBtn) {
            addEmployeeBtn.addEventListener('click', () => openFormModal());
        }
        
        document.getElementById('closeFormModalBtn').addEventListener('click', closeFormModal);
        document.getElementById('cancelFormBtn').addEventListener('click', closeFormModal);
        document.getElementById('employeeForm').addEventListener('submit', handleFormSubmit);

        // 5. Action Buttons in Details Modal
        document.getElementById('editEmployeeBtn').addEventListener('click', () => {
            if (currentEmployee) {
                closeModal();
                openFormModal(currentEmployee);
            }
        });

        document.getElementById('deleteEmployeeBtn').addEventListener('click', () => {
            if (currentEmployee) {
                openDeleteModal(currentEmployee);
            }
        });

        // 6. Delete Modal Controls
        document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
        document.getElementById('confirmDeleteBtn').addEventListener('click', handleDelete);

        // 7. Items Per Page Selector
        const itemsPerPageSelect = document.getElementById('itemsPerPage');
        if (itemsPerPageSelect) {
            itemsPerPageSelect.addEventListener('change', (e) => {
                itemsPerPage = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
                currentPage = 1;  // Reset to first page
                renderTable();
            });
        }
        
        // 5. Table Actions (Event Delegation)
        document.getElementById('employeeTableBody').addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            if (target.classList.contains('js-view-details')) {
                const id = target.getAttribute('data-id');
                const employee = allEmployees.find(emp => emp.id == id);
                if (employee) viewEmployeeDetails(employee);
            }
        });
    }

    // Render Table
    function renderTable() {
        const tbody = document.getElementById('employeeTableBody');
        tbody.innerHTML = '';

        // Calculate start and end indices for current page
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = itemsPerPage === 'all' ? filteredEmployees.length : startIndex + itemsPerPage;
        const pageData = filteredEmployees.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-gray-500 italic">No employee records found.</td></tr>`;
            updatePaginationInfo(filteredEmployees.length);
            return;
        }

        pageData.forEach(employee => {
            // Main row
            const tr = document.createElement('tr');
            tr.className = "border-b border-gray-100 hover:bg-lime-300 transition-colors group";
            tr.setAttribute('data-employee-id', employee.id);
            
            // Format dates
            const joinDate = employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : '-';
            
            tr.innerHTML = `
                <td class="px-4 py-2 font-mono text-gray-400 text-[10px]">${employee.id.substring(0, 8)}...</td>
                <td class="px-4 py-2 font-semibold text-gray-800">${employee.employeeName}</td>
                <td class="px-4 py-2 text-gray-600">${employee.aadhar}</td>
                <td class="px-4 py-2 text-gray-600">${employee.phoneNo}</td>
                <td class="px-4 py-2 text-gray-600">${employee.category}</td>
                <td class="px-4 py-2">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${
                        employee.status === 'active' ? 'bg-green-100 text-green-800' : 
                        employee.status === 'inactive' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                    }">${employee.status}</span>
                </td>
                <td class="px-4 py-2 text-gray-500">${joinDate}</td>
                <td class="px-4 py-2 text-center">
                    <div class="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="js-view-details text-blue-500 hover:bg-blue-50 p-1 rounded transition" data-id="${employee.id}" title="View Details">👁️</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        updatePaginationInfo(filteredEmployees.length);
    }

    function updatePaginationInfo(totalItems) {
        // Calculate pagination info for client-side pagination
        const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage);
        
        if (totalItems === 0) {
            document.getElementById('pageInfo').innerText = `Showing 0 of 0 records`;
            document.getElementById('prevBtn').disabled = true;
            document.getElementById('nextBtn').disabled = true;
            return;
        }
        
        const start = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
        const end = itemsPerPage === 'all' ? totalItems : Math.min(currentPage * itemsPerPage, totalItems);
        
        document.getElementById('pageInfo').innerText = `Showing ${start} - ${end} of ${totalItems} records`;
        
        // Update button states
        document.getElementById('prevBtn').disabled = currentPage === 1;
        document.getElementById('nextBtn').disabled = currentPage >= totalPages || totalItems === 0;
    }

    // Modal Functions
    function viewEmployeeDetails(employee) {
        currentEmployee = employee;
        // Populate the modal with employee details
        document.getElementById('detailEmployeeName').textContent = employee.employeeName || '-';
        document.getElementById('detailFatherHusbandName').textContent = employee.fatherHusbandName || '-';
        document.getElementById('detailAadhar').textContent = employee.aadhar || '-';
        document.getElementById('detailPhone').textContent = employee.phoneNo || '-';
        document.getElementById('detailCategory').textContent = employee.category || '-';
        document.getElementById('detailStatus').textContent = employee.status || '-';
        
        // Format dates
        document.getElementById('detailDateOfBirth').textContent = formatDate(employee.dateOfBirth);
        document.getElementById('detailDateOfJoining').textContent = formatDate(employee.dateOfJoining);
        document.getElementById('detailDateOfExit').textContent = formatDate(employee.dateOfExit);
        
        document.getElementById('detailPDayWage').textContent = employee.pDayWage ? `₹${employee.pDayWage}` : '-';
        document.getElementById('detailBank').textContent = employee.bank || '-';
        document.getElementById('detailBranch').textContent = employee.branch || '-';
        document.getElementById('detailAddress').textContent = employee.address || '-';
        document.getElementById('detailAccountNo').textContent = employee.accountNo || '-';
        document.getElementById('detailIfsc').textContent = employee.ifsc || '-';
        document.getElementById('detailEsicNo').textContent = employee.esicNo || '-';
        document.getElementById('detailPan').textContent = employee.pan || '-';
        document.getElementById('detailSKalyanNo').textContent = employee.sKalyanNo || '-';
        document.getElementById('detailProject').textContent = employee.project || '-';
        document.getElementById('detailSite').textContent = employee.site || '-';
        document.getElementById('detailUan').textContent = employee.uan || '-';

        // Show modal
        const modal = document.getElementById('employeeModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function closeModal() {
        const modal = document.getElementById('employeeModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        currentEmployee = null;
    }

    // Form Modal Functions
    function openFormModal(employee = null) {
        const modal = document.getElementById('employeeFormModal');
        const form = document.getElementById('employeeForm');
        const title = document.getElementById('formModalTitle');
        
        form.reset();
        document.getElementById('formEmployeeId').value = '';
        
        if (employee) {
            title.textContent = 'Edit Employee: ' + employee.employeeName;
            document.getElementById('formEmployeeId').value = employee.id;
            
            // Fill form fields by iterating through employee properties
            for (let key in employee) {
                if (employee.hasOwnProperty(key)) {
                    const input = form.elements[key];
                    if (input) {
                        if (input.type === 'date' && employee[key]) {
                            // Convert date string to YYYY-MM-DD format for input
                            const dateStr = new Date(employee[key]).toISOString().split('T')[0];
                            input.value = dateStr;
                        } else if (input.type === 'select-one') {
                            input.value = employee[key] || '';
                        } else {
                            input.value = employee[key] || '';
                        }
                    }
                }
            }
        } else {
            title.textContent = 'Add New Employee';
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function closeFormModal() {
        const modal = document.getElementById('employeeFormModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const id = data.id;
        delete data.id;

        try {
            const url = id ? `/masterrolls/api/masterrolls/${id}` : '/masterrolls/api/masterrolls';
            
            let res;
            if (id) {
                res = await window.api.put(url, data);
            } else {
                res = await window.api.post(url, data);
            }

            const result = await res.json();
            if (!res.ok) throw new Error(result.message || result.error || 'Operation failed');

            showToast(id ? 'Employee updated successfully' : 'Employee added successfully');
            closeFormModal();
            fetchEmployees(); // Refresh table
        } catch (err) {
            console.error('Form submission error:', err);
            showToast(err.message, 'error');
        }
    }

    // Delete Modal Functions
    function openDeleteModal(employee) {
        document.getElementById('deleteEmployeeName').textContent = employee.employeeName;
        const modal = document.getElementById('deleteConfirmModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function closeDeleteModal() {
        const modal = document.getElementById('deleteConfirmModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    async function handleDelete() {
        if (!currentEmployee) return;

        try {
            const res = await window.api.delete(`/masterrolls/api/masterrolls/${currentEmployee.id}`);

            const result = await res.json();
            if (!res.ok) throw new Error(result.message || result.error || 'Deletion failed');

            showToast('Employee deleted successfully');
            closeDeleteModal();
            closeModal();
            fetchEmployees(); // Refresh table
        } catch (err) {
            console.error('Delete error:', err);
            showToast(err.message, 'error');
        }
    }

    // Export to Excel
    function exportToExcel() {
        // Prepare data for export
        const exportData = filteredEmployees.map(employee => {
            return {
                'ID': employee.id,
                'Employee Name': employee.employeeName,
                'Aadhar': employee.aadhar,
                'Phone': employee.phoneNo,
                'Category': employee.category,
                'Status': employee.status,
                'Date of Birth': formatDate(employee.dateOfBirth),
                'Date of Joining': formatDate(employee.dateOfJoining),
                'Date of Exit': formatDate(employee.dateOfExit),
                'Daily Wage': employee.pDayWage,
                'Bank': employee.bank,
                'Branch': employee.branch,
                'Address': employee.address,
                'Account No': employee.accountNo,
                'IFSC': employee.ifsc,
                'ESIC No': employee.esicNo,
                'PAN': employee.pan,
                'SKalyan No': employee.sKalyanNo,
                'Project': employee.project,
                'Site': employee.site,
                'UAN': employee.uan
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Employees");
        XLSX.writeFile(wb, "employees_" + new Date().toISOString().split('T')[0] + ".xlsx");
    }
})();