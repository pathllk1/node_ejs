// Dynamic loader for sales page based on URL parameters
(function() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const isEditMode = urlParams.get('edit');
    
    // Load the appropriate JavaScript file based on mode
    if (isEditMode) {
        const script = document.createElement('script');
        script.src = '/javascripts/inventory/edit-bill.js';
        document.head.appendChild(script);
    } else {
        const script = document.createElement('script');
        script.src = '/javascripts/inventory/sls.js';
        document.head.appendChild(script);
    }
})();