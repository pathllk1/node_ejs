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