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
    
    // Add event listener for GST fetch button
    document.getElementById('btn-fetch-firm-gst')?.addEventListener('click', function() {
        fetchFirmByGST(this);
    });
    
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
                    <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">${firm.legal_name || '-'}</td>
                    <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">${firm.city || '-'}</td>
                    <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">${firm.state || '-'}</td>
                    <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">${firm.phone_number || '-'}</td>
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
        const firmLegalNameInput = document.getElementById('firm-legal-name');
        const firmAddressInput = document.getElementById('firm-address');
        const firmCityInput = document.getElementById('firm-city');
        const firmStateInput = document.getElementById('firm-state');
        const firmCountryInput = document.getElementById('firm-country');
        const firmPincodeInput = document.getElementById('firm-pincode');
        const firmPhoneInput = document.getElementById('firm-phone');
        const firmSecondaryPhoneInput = document.getElementById('firm-secondary-phone');
        const firmEmailInput = document.getElementById('firm-email');
        const firmWebsiteInput = document.getElementById('firm-website');
        const firmBusinessTypeInput = document.getElementById('firm-business-type');
        const firmIndustryTypeInput = document.getElementById('firm-industry-type');
        const firmEstablishmentYearInput = document.getElementById('firm-establishment-year');
        const firmEmployeeCountInput = document.getElementById('firm-employee-count');
        
        // Registration fields
        const firmRegistrationNumberInput = document.getElementById('firm-registration-number');
        const firmRegistrationDateInput = document.getElementById('firm-registration-date');
        const firmCinNumberInput = document.getElementById('firm-cin-number');
        const firmPanNumberInput = document.getElementById('firm-pan-number');
        const firmGstNumberInput = document.getElementById('firm-gst-number');
        const firmTaxIdInput = document.getElementById('firm-tax-id');
        const firmVatNumberInput = document.getElementById('firm-vat-number');
        
        // Banking fields
        const firmBankAccountNumberInput = document.getElementById('firm-bank-account-number');
        const firmBankNameInput = document.getElementById('firm-bank-name');
        const firmBankBranchInput = document.getElementById('firm-bank-branch');
        const firmIfscCodeInput = document.getElementById('firm-ifsc-code');
        const firmPaymentTermsInput = document.getElementById('firm-payment-terms');
        
        // Compliance fields
        const firmStatusInput = document.getElementById('firm-status');
        const firmLicenseNumbersInput = document.getElementById('firm-license-numbers');
        const firmInsuranceDetailsInput = document.getElementById('firm-insurance-details');
        
        // Business settings fields
        const firmCurrencyInput = document.getElementById('firm-currency');
        const firmTimezoneInput = document.getElementById('firm-timezone');
        const firmFiscalYearStartInput = document.getElementById('firm-fiscal-year-start');
        const firmInvoicePrefixInput = document.getElementById('firm-invoice-prefix');
        const firmQuotePrefixInput = document.getElementById('firm-quote-prefix');
        const firmPoPrefixInput = document.getElementById('firm-po-prefix');
        
        // Document settings fields
        const firmLogoUrlInput = document.getElementById('firm-logo-url');
        const firmInvoiceTemplateInput = document.getElementById('firm-invoice-template');
        const firmEnableEInvoiceInput = document.getElementById('firm-enable-e-invoice');
        
        if (firm) {
            // Editing existing firm
            modalTitle.textContent = 'Edit Firm';
            firmIdInput.value = firm.id;
            firmNameInput.value = firm.name || '';
            firmLegalNameInput.value = firm.legal_name || '';
            firmAddressInput.value = firm.address || '';
            firmCityInput.value = firm.city || '';
            firmStateInput.value = firm.state || '';
            firmCountryInput.value = firm.country || '';
            firmPincodeInput.value = firm.pincode || '';
            firmPhoneInput.value = firm.phone_number || '';
            firmSecondaryPhoneInput.value = firm.secondary_phone || '';
            firmEmailInput.value = firm.email || '';
            firmWebsiteInput.value = firm.website || '';
            firmBusinessTypeInput.value = firm.business_type || '';
            firmIndustryTypeInput.value = firm.industry_type || '';
            firmEstablishmentYearInput.value = firm.establishment_year || '';
            firmEmployeeCountInput.value = firm.employee_count || '';
            
            // Registration fields
            firmRegistrationNumberInput.value = firm.registration_number || '';
            firmRegistrationDateInput.value = firm.registration_date || '';
            firmCinNumberInput.value = firm.cin_number || '';
            firmPanNumberInput.value = firm.pan_number || '';
            firmGstNumberInput.value = firm.gst_number || '';
            firmTaxIdInput.value = firm.tax_id || '';
            firmVatNumberInput.value = firm.vat_number || '';
            
            // Banking fields
            firmBankAccountNumberInput.value = firm.bank_account_number || '';
            firmBankNameInput.value = firm.bank_name || '';
            firmBankBranchInput.value = firm.bank_branch || '';
            firmIfscCodeInput.value = firm.ifsc_code || '';
            firmPaymentTermsInput.value = firm.payment_terms || '';
            
            // Compliance fields
            firmStatusInput.value = firm.status || 'ACTIVE';
            firmLicenseNumbersInput.value = firm.license_numbers || '';
            firmInsuranceDetailsInput.value = firm.insurance_details || '';
            
            // Business settings fields
            firmCurrencyInput.value = firm.currency || 'INR';
            firmTimezoneInput.value = firm.timezone || 'Asia/Kolkata';
            firmFiscalYearStartInput.value = firm.fiscal_year_start || 4;
            firmInvoicePrefixInput.value = firm.invoice_prefix || 'INV';
            firmQuotePrefixInput.value = firm.quote_prefix || 'QT';
            firmPoPrefixInput.value = firm.po_prefix || 'PO';
            
            // Document settings fields
            firmLogoUrlInput.value = firm.logo_url || '';
            firmInvoiceTemplateInput.value = firm.invoice_template || 'standard';
            firmEnableEInvoiceInput.checked = firm.enable_e_invoice === 1;
        } else {
            // Adding new firm
            modalTitle.textContent = 'Add New Firm';
            firmForm.reset();
            firmIdInput.value = '';
            
            // Set default values
            firmCountryInput.value = 'India';
            firmStatusInput.value = 'ACTIVE';
            firmCurrencyInput.value = 'INR';
            firmTimezoneInput.value = 'Asia/Kolkata';
            firmFiscalYearStartInput.value = 4;
            firmInvoicePrefixInput.value = 'INV';
            firmQuotePrefixInput.value = 'QT';
            firmPoPrefixInput.value = 'PO';
            firmInvoiceTemplateInput.value = 'standard';
            firmEnableEInvoiceInput.checked = false;
        }
        
        firmModal.classList.remove('hidden');
        firmNameInput.focus();
    }
    
    async function handleFirmSubmit(e) {
        e.preventDefault();
        
        // Get all form values
        const firmId = document.getElementById('firm-id').value;
        const name = document.getElementById('firm-name').value.trim();
        const legalName = document.getElementById('firm-legal-name').value.trim();
        const address = document.getElementById('firm-address').value.trim();
        const city = document.getElementById('firm-city').value.trim();
        const state = document.getElementById('firm-state').value.trim();
        const country = document.getElementById('firm-country').value.trim();
        const pincode = document.getElementById('firm-pincode').value.trim();
        const phoneNumber = document.getElementById('firm-phone').value.trim();
        const secondaryPhone = document.getElementById('firm-secondary-phone').value.trim();
        const email = document.getElementById('firm-email').value.trim();
        const website = document.getElementById('firm-website').value.trim();
        const businessType = document.getElementById('firm-business-type').value.trim();
        const industryType = document.getElementById('firm-industry-type').value.trim();
        const establishmentYear = document.getElementById('firm-establishment-year').value.trim();
        const employeeCount = document.getElementById('firm-employee-count').value.trim();
        
        // Registration fields
        const registrationNumber = document.getElementById('firm-registration-number').value.trim();
        const registrationDate = document.getElementById('firm-registration-date').value.trim();
        const cinNumber = document.getElementById('firm-cin-number').value.trim();
        const panNumber = document.getElementById('firm-pan-number').value.trim();
        const gstNumber = document.getElementById('firm-gst-number').value.trim();
        const taxId = document.getElementById('firm-tax-id').value.trim();
        const vatNumber = document.getElementById('firm-vat-number').value.trim();
        
        // Banking fields
        const bankAccountNumber = document.getElementById('firm-bank-account-number').value.trim();
        const bankName = document.getElementById('firm-bank-name').value.trim();
        const bankBranch = document.getElementById('firm-bank-branch').value.trim();
        const ifscCode = document.getElementById('firm-ifsc-code').value.trim();
        const paymentTerms = document.getElementById('firm-payment-terms').value.trim();
        
        // Compliance fields
        const status = document.getElementById('firm-status').value;
        const licenseNumbers = document.getElementById('firm-license-numbers').value.trim();
        const insuranceDetails = document.getElementById('firm-insurance-details').value.trim();
        
        // Business settings fields
        const currency = document.getElementById('firm-currency').value;
        const timezone = document.getElementById('firm-timezone').value;
        const fiscalYearStart = document.getElementById('firm-fiscal-year-start').value;
        const invoicePrefix = document.getElementById('firm-invoice-prefix').value;
        const quotePrefix = document.getElementById('firm-quote-prefix').value;
        const poPrefix = document.getElementById('firm-po-prefix').value;
        
        // Document settings fields
        const logoUrl = document.getElementById('firm-logo-url').value.trim();
        const invoiceTemplate = document.getElementById('firm-invoice-template').value;
        const enableEInvoice = document.getElementById('firm-enable-e-invoice').checked;
        
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
                    legal_name: legalName || null,
                    address: address || null,
                    city: city || null,
                    state: state || null,
                    country: country || null,
                    pincode: pincode || null,
                    phone_number: phoneNumber || null,
                    secondary_phone: secondaryPhone || null,
                    email: email || null,
                    website: website || null,
                    business_type: businessType || null,
                    industry_type: industryType || null,
                    establishment_year: establishmentYear ? parseInt(establishmentYear) : null,
                    employee_count: employeeCount ? parseInt(employeeCount) : null,
                    registration_number: registrationNumber || null,
                    registration_date: registrationDate || null,
                    cin_number: cinNumber || null,
                    pan_number: panNumber || null,
                    gst_number: gstNumber || null,
                    tax_id: taxId || null,
                    vat_number: vatNumber || null,
                    bank_account_number: bankAccountNumber || null,
                    bank_name: bankName || null,
                    bank_branch: bankBranch || null,
                    ifsc_code: ifscCode || null,
                    payment_terms: paymentTerms || null,
                    status,
                    license_numbers: licenseNumbers || null,
                    insurance_details: insuranceDetails || null,
                    currency,
                    timezone,
                    fiscal_year_start: fiscalYearStart ? parseInt(fiscalYearStart) : null,
                    invoice_prefix: invoicePrefix || null,
                    quote_prefix: quotePrefix || null,
                    po_prefix: poPrefix || null,
                    logo_url: logoUrl || null,
                    invoice_template: invoiceTemplate || null,
                    enable_e_invoice: enableEInvoice
                });
            } else {
                // Create new firm
                response = await window.api.post('/admin/firms', {
                    name,
                    legal_name: legalName || null,
                    address: address || null,
                    city: city || null,
                    state: state || null,
                    country: country || null,
                    pincode: pincode || null,
                    phone_number: phoneNumber || null,
                    secondary_phone: secondaryPhone || null,
                    email: email || null,
                    website: website || null,
                    business_type: businessType || null,
                    industry_type: industryType || null,
                    establishment_year: establishmentYear ? parseInt(establishmentYear) : null,
                    employee_count: employeeCount ? parseInt(employeeCount) : null,
                    registration_number: registrationNumber || null,
                    registration_date: registrationDate || null,
                    cin_number: cinNumber || null,
                    pan_number: panNumber || null,
                    gst_number: gstNumber || null,
                    tax_id: taxId || null,
                    vat_number: vatNumber || null,
                    bank_account_number: bankAccountNumber || null,
                    bank_name: bankName || null,
                    bank_branch: bankBranch || null,
                    ifsc_code: ifscCode || null,
                    payment_terms: paymentTerms || null,
                    status,
                    license_numbers: licenseNumbers || null,
                    insurance_details: insuranceDetails || null,
                    currency,
                    timezone,
                    fiscal_year_start: fiscalYearStart ? parseInt(fiscalYearStart) : null,
                    invoice_prefix: invoicePrefix || null,
                    quote_prefix: quotePrefix || null,
                    po_prefix: poPrefix || null,
                    logo_url: logoUrl || null,
                    invoice_template: invoiceTemplate || null,
                    enable_e_invoice: enableEInvoice
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
    
    async function editFirm(firmId) {
        try {
            const response = await window.api.get(`/admin/firms/${firmId}`);
            if (!response.ok) {
                if (response.status === 403) {
                    const errorData = await response.json();
                    showError(errorData.error || 'Access denied');
                    return;
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            const data = await response.json();
            if (data.firm) {
                openFirmModal(data.firm);
            } else {
                showError('Failed to fetch firm details');
            }
        } catch (error) {
            console.error('Error fetching firm details:', error);
            showError('Failed to fetch firm details');
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

// --- GST LOOKUP FUNCTIONALITY FOR FIRMS ---

async function fetchFirmByGST(buttonElement) {
    const gstin = document.getElementById('firm-gst-number').value;
    
    if (!gstin || gstin.length !== 15) {
        alert('Please enter a valid 15-character GSTIN');
        return;
    }

    const fetchButton = buttonElement;
    const originalText = fetchButton.innerHTML;
    fetchButton.innerHTML = '⏳';
    fetchButton.disabled = true;

    try {
        // Using your backend proxy (CSP compliant)
        const response = await window.api.get(`/inventory/api/gst-lookup?gstin=${gstin}`);
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        // Handle Response: The API might return the data directly or wrapped
        const firmData = data.data || data;
        
        // Use the robust population logic
        populateFirmFromRapidAPI(firmData, gstin);
        
        // Success Feedback
        fetchButton.innerHTML = '✔';
        setTimeout(() => fetchButton.innerHTML = originalText, 1500);

    } catch (error) {
        console.error('Firm GST Lookup Error:', error);
        alert('Failed to fetch details. ' + (error.message || 'Server error'));
        fetchButton.innerHTML = originalText;
    } finally {
        fetchButton.disabled = false;
    }
}

function populateFirmFromRapidAPI(firmData, gstin) {
    console.log('Processing GST Data:', firmData);

    // Extract relevant information from GST API response
    try {
        // Legal name (from legal_name field)
        if (firmData.legal_name && document.getElementById('firm-legal-name')) {
            document.getElementById('firm-legal-name').value = firmData.legal_name;
        }
        
        // Trade name (from trade_name field)
        if (firmData.trade_name && document.getElementById('firm-name')) {
            document.getElementById('firm-name').value = firmData.trade_name;
        }
        
        // Address details from principal place of business
        if (firmData.place_of_business_principal && firmData.place_of_business_principal.address && document.getElementById('firm-address')) {
            const address = formatPowerfulGSTINAddress(firmData);
            if (address && document.getElementById('firm-address')) {
                document.getElementById('firm-address').value = address;
            }
        }
        
        // City
        if (firmData.place_of_business_principal && firmData.place_of_business_principal.address && firmData.place_of_business_principal.address.district && document.getElementById('firm-city')) {
            document.getElementById('firm-city').value = firmData.place_of_business_principal.address.district;
        }
        
        // State
        if (firmData.place_of_business_principal && firmData.place_of_business_principal.address && firmData.place_of_business_principal.address.state && document.getElementById('firm-state')) {
            document.getElementById('firm-state').value = firmData.place_of_business_principal.address.state;
        }
        
        // Pincode
        if (firmData.place_of_business_principal && firmData.place_of_business_principal.address && firmData.place_of_business_principal.address.pin_code && document.getElementById('firm-pincode')) {
            document.getElementById('firm-pincode').value = firmData.place_of_business_principal.address.pin_code;
        }
        
        // PAN (Auto-fill from GSTIN chars 3-12)
        if (gstin && gstin.length >= 12 && document.getElementById('firm-pan-number')) {
            const panValue = gstin.substring(2, 12);
            document.getElementById('firm-pan-number').value = panValue;
        }
        
        // Status
        if (firmData.status && document.getElementById('firm-status')) {
            // Map GST status to our status values
            let statusValue = 'ACTIVE';
            if (firmData.status.toLowerCase().includes('cancel') || firmData.status.toLowerCase().includes('cancelled')) {
                statusValue = 'INACTIVE';
            } else if (firmData.status.toLowerCase().includes('suspended')) {
                statusValue = 'SUSPENDED';
            } else if (firmData.status.toLowerCase().includes('active')) {
                statusValue = 'ACTIVE';
            }
            document.getElementById('firm-status').value = statusValue;
        }
        
        // Business type (from business_constitution)
        if (firmData.business_constitution && document.getElementById('firm-business-type')) {
            document.getElementById('firm-business-type').value = firmData.business_constitution;
        }
        
        // Industry type (from business_activity_nature array)
        if (firmData.business_activity_nature && Array.isArray(firmData.business_activity_nature) && firmData.business_activity_nature.length > 0 && document.getElementById('firm-industry-type')) {
            // Take the first activity if there are multiple
            document.getElementById('firm-industry-type').value = firmData.business_activity_nature[0];
        }
        
        // Registration date (from registration_date)
        if (firmData.registration_date && document.getElementById('firm-registration-date')) {
            // Convert DD/MM/YYYY to YYYY-MM-DD format for date input
            const regDateParts = firmData.registration_date.split('/');
            if (regDateParts.length === 3) {
                const isoDate = `${regDateParts[2]}-${regDateParts[1].padStart(2, '0')}-${regDateParts[0].padStart(2, '0')}`;
                document.getElementById('firm-registration-date').value = isoDate;
            }
        }
        
        // Establishment year (extract from registration date)
        if (firmData.registration_date && document.getElementById('firm-establishment-year')) {
            const regDateParts = firmData.registration_date.split('/');
            if (regDateParts.length === 3) {
                document.getElementById('firm-establishment-year').value = regDateParts[2]; // Year is the third part
            }
        }
        
        console.log('Successfully populated firm details from GSTIN');
    } catch (error) {
        console.error('Error populating firm details from GST data:', error);
    }
}

function formatPowerfulGSTINAddress(firmData) {
    if (!firmData || !firmData.place_of_business_principal || !firmData.place_of_business_principal.address) return '';

    const addr = firmData.place_of_business_principal.address;
    if (!addr) return '';

    const parts = [];

    // Building details
    if (addr.door_num) parts.push(addr.door_num);
    if (addr.building_name) parts.push(addr.building_name);
    if (addr.floor_num) parts.push(addr.floor_num);
    
    // Street and location
    if (addr.street) parts.push(addr.street);
    if (addr.location) parts.push(addr.location);

    // City and district
    if (addr.city && addr.city.trim() !== '') parts.push(addr.city);
    if (addr.district && addr.district.trim() !== '') parts.push(addr.district);
    if (addr.state && addr.state.trim() !== '') parts.push(addr.state);
    
    return parts.filter(p => p && p.toString().trim()).join(', ');
}

function extractPowerfulGSTINPinCode(firmData) {
    if (!firmData || !firmData.place_of_business_principal || !firmData.place_of_business_principal.address) return '';

    const addr = firmData.place_of_business_principal.address;
    if (!addr || !addr.pin_code) return '';

    const pinStr = addr.pin_code.toString().trim();
    // Validate PIN format (6 digits)
    if (/^\d{6}$/.test(pinStr)) {
        return pinStr;
    }

    return '';
}

// Initialize the page - for both direct load and AJAX navigation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirmsManagement);
} else {
    // DOM is already loaded, initialize immediately
    initFirmsManagement();
}