document.addEventListener('DOMContentLoaded', () => {
    console.log("Navbar JS loaded");

    // --- 1. Mobile Menu Toggle ---
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
    }

    // --- 2. Desktop Tools Toggle ---
    const toolsBtn = document.getElementById('tools-menu-btn');
    const toolsDropdown = document.getElementById('tools-dropdown');
    if (toolsBtn && toolsDropdown) {
        toolsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toolsDropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!toolsBtn.contains(e.target) && !toolsDropdown.contains(e.target)) {
                toolsDropdown.classList.add('hidden');
            }
        });
    }

    const inventoryBtn = document.getElementById('inventory-menu-btn');
    const inventoryDropdown = document.getElementById('inventory-dropdown');
    if (inventoryBtn && inventoryDropdown) {
        inventoryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            inventoryDropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!inventoryBtn.contains(e.target) && !inventoryDropdown.contains(e.target)) {
                inventoryDropdown.classList.add('hidden');
            }
        });
    }

    // --- 3. Mobile Tools Toggle ---
    const mToolsBtn = document.getElementById('mobile-tools-btn');
    const mToolsMenu = document.getElementById('mobile-tools-menu');
    if (mToolsBtn && mToolsMenu) {
        mToolsBtn.addEventListener('click', () => mToolsMenu.classList.toggle('hidden'));
    }

    const mInventoryBtn = document.getElementById('mobile-inventory-btn');
    const mInventoryDropdown = document.getElementById('mobile-inventory-dropdown');
    if (mInventoryBtn && mInventoryDropdown) {
        mInventoryBtn.addEventListener('click', () => mInventoryDropdown.classList.toggle('hidden'));
    }
    
    // --- 4. Desktop HR Toggle ---
    const hrBtn = document.getElementById('hr-menu-btn');
    const hrDropdown = document.getElementById('hr-dropdown');
    if (hrBtn && hrDropdown) {
        hrBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hrDropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!hrBtn.contains(e.target) && !hrDropdown.contains(e.target)) {
                hrDropdown.classList.add('hidden');
            }
        });
    }
    
    // --- 5. Mobile HR Toggle ---
    const mHrBtn = document.getElementById('mobile-hr-btn');
    const mHrDropdown = document.getElementById('mobile-hr-dropdown');
    if (mHrBtn && mHrDropdown) {
        mHrBtn.addEventListener('click', () => mHrDropdown.classList.toggle('hidden'));
    }
});

// --- AJAX NAVIGATION INTERCEPTOR ---
document.addEventListener('click', async (e) => {
    // 1. Find the link
    const link = e.target.closest('a');
    
    // If not a link, stop
    if (!link) return;

    const path = link.pathname; // Gets just the path, e.g., "/users/profile"

    // 2. USE IF / ELSE IF TO CHECK SPECIFIC ROUTES
    // We only want to intercept Protected Routes that need the Token
    let shouldIntercept = false;

    if (path === '/users/profile') {
        shouldIntercept = true;
    } 
    else if (path === '/ai/dashboard') {
        shouldIntercept = true;
    }
    else if (path === '/ai/chat') {
        shouldIntercept = true;
    }
    else if (path === '/admin/logs') {
        shouldIntercept = true;
    }
    else if (path === '/inventory/stocks') {
        shouldIntercept = true;
    }

    else if (path === '/inventory/bills') {
        shouldIntercept = true;
    }

    else if (path === '/inventory/sales-report') {
        shouldIntercept = true;
    }
    else if (path === '/inventory/stock-movements') {
        shouldIntercept = true;
    }
    else if (path === '/admin/settings') {
        shouldIntercept = true;
    }
    else if (path === '/admin/firms-management') {
        shouldIntercept = true;
    }
    else if (path === '/ledger') {
        shouldIntercept = true;
    }
    else if (path === '/masterrolls') {
        shouldIntercept = true;
    }

    // 3. IF MATCHED, EXECUTE AJAX NAVIGATION
    if (shouldIntercept) {
        e.preventDefault();
        console.log(`Interceptor triggered for: ${path}`);

        // Safety Check: Ensure api.js is loaded
        if (!window.api) {
            console.error("API Interceptor not loaded.");
            alert("System error: API missing. Cannot navigate securely.");
            return;
        }

        try {
            // A. Fetch content using window.api (Attaches Token)
            const response = await window.api.get(link.href);
            
            // B. Handle Auth Errors Manually
            if (!response) return; // api.js might have handled redirect
            
            if (!response.ok) {
                console.error(`Server Error: ${response.status}`);
                if (response.status === 401 || response.status === 403) {
                    // Redirect to login manually if auth fails
                    window.location.href = '/users/login'; 
                } else {
                    alert(`Cannot load page (Error ${response.status})`);
                }
                return; // STOP HERE. Do not parse HTML.
            }

            // C. Parse HTML
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const newMain = doc.querySelector('main') || doc.querySelector('#main-content');
            const currentMain = document.querySelector('main') || document.querySelector('#main-content');

            // D. Swap Content
            if (newMain && currentMain) {
                currentMain.innerHTML = newMain.innerHTML;
                
                // Update URL
                window.history.pushState(null, '', link.href);

                // Re-execute Scripts
                const scripts = newMain.querySelectorAll('script');
                scripts.forEach(oldScript => {
                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });
                    newScript.textContent = oldScript.textContent;
                    document.body.appendChild(newScript);
                });

                // Close all menus
                const mobileMenu = document.getElementById('mobile-menu');
                const toolsDropdown = document.getElementById('tools-dropdown');
                const inventoryDropdown = document.getElementById('inventory-dropdown');
                if (mobileMenu) mobileMenu.classList.add('hidden');
                if (toolsDropdown) toolsDropdown.classList.add('hidden');
                if (inventoryDropdown) inventoryDropdown.classList.add('hidden');

                const mobileInventoryMenu = document.getElementById('mobile-inventory-menu');
                const mobileInventoryDropdown = document.getElementById('mobile-inventory-dropdown');
                const hrDropdown = document.getElementById('hr-dropdown');
                const mobileHrDropdown = document.getElementById('mobile-hr-dropdown');
                if (mobileInventoryMenu) mobileInventoryMenu.classList.add('hidden');
                if (mobileInventoryDropdown) mobileInventoryDropdown.classList.add('hidden');
                if (hrDropdown) hrDropdown.classList.add('hidden');
                if (mobileHrDropdown) mobileHrDropdown.classList.add('hidden');

                // Update navbar state after AJAX navigation
                if (typeof updateNavbar === 'function') {
                    updateNavbar();
                }
            }

        } catch (err) {
            console.error("Navigation failed:", err);
            // CRITICAL FIX: DO NOT RELOAD PAGE HERE
            // Reloading forces a browser request without token -> 401 Error Loop
            alert("Connection failed. Please try again.");
        }
    }
});

// Helper to close dropdowns after navigation
function closeAllMenus() {
    const mobileMenu = document.getElementById('mobile-menu');
    const toolsDropdown = document.getElementById('tools-dropdown');
    const inventoryDropdown = document.getElementById('inventory-dropdown');
    
    if (mobileMenu) mobileMenu.classList.add('hidden');
    if (toolsDropdown) toolsDropdown.classList.add('hidden');
    if (inventoryDropdown) inventoryDropdown.classList.add('hidden');

    const mobileInventoryDropdown = document.getElementById('mobile-inventory-dropdown');
    const hrDropdown = document.getElementById('hr-dropdown');
    const mobileHrDropdown = document.getElementById('mobile-hr-dropdown');
    if (mobileInventoryDropdown) mobileInventoryDropdown.classList.add('hidden');
    if (hrDropdown) hrDropdown.classList.add('hidden');
    if (mobileHrDropdown) mobileHrDropdown.classList.add('hidden');
}
// Handle Back/Forward buttons
window.addEventListener('popstate', () => {
    window.location.reload();
});