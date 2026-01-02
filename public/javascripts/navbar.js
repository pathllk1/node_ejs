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

    // --- 3. Mobile Tools Toggle ---
    const mToolsBtn = document.getElementById('mobile-tools-btn');
    const mToolsMenu = document.getElementById('mobile-tools-menu');
    if (mToolsBtn && mToolsMenu) {
        mToolsBtn.addEventListener('click', () => mToolsMenu.classList.toggle('hidden'));
    }
});

// --- 4. AJAX NAVIGATION INTERCEPTOR ---
// --- 4. AJAX NAVIGATION INTERCEPTOR ---
// --- AJAX NAVIGATION INTERCEPTOR ---
document.addEventListener('click', async (e) => {
    const link = e.target.closest('a');
    
    // Check if clicked element is a link and specifically the Profile link
    if (link && link.pathname === '/users/profile') {
        e.preventDefault();

        // Safety Check: Ensure api.js is loaded
        if (!window.api) {
            console.error("API Interceptor not loaded! Falling back to standard reload.");
            window.location.href = link.href;
            return;
        }

        console.log("Navigating to Profile with Token...");

        try {
            // -----------------------------------------------------------
            // THE FIX: Use window.api.get instead of fetch
            // This ensures Authorization headers are attached automatically
            // -----------------------------------------------------------
            const response = await window.api.get(link.href);
            
            // Handle if the interceptor logic itself failed or redirected
            if (!response) return; 

            if (!response.ok) {
                // If the middleware rejected us (e.g., 401/403), the api.js 
                // likely already handled the redirect. If not, throw error.
                throw new Error('Server rejected request');
            }

            const html = await response.text();

            // ... The rest of the logic remains exactly the same ...
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const newMain = doc.querySelector('main') || doc.querySelector('#main-content');
            const currentMain = document.querySelector('main') || document.querySelector('#main-content');

            if (newMain && currentMain) {
                // 1. Swap HTML
                currentMain.innerHTML = newMain.innerHTML;
                
                // 2. Update URL
                window.history.pushState(null, '', link.href);

                // 3. Re-execute Scripts
                const scripts = newMain.querySelectorAll('script');
                scripts.forEach(oldScript => {
                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });
                    newScript.textContent = oldScript.textContent;
                    document.body.appendChild(newScript);
                });

                // 4. Close mobile menu
                const mobileMenu = document.getElementById('mobile-menu');
                if (mobileMenu) mobileMenu.classList.add('hidden');
            }
        } catch (err) {
            console.error("Navigation failed:", err);
            // Fallback: If AJAX fails, force a hard reload so the browser 
            // handles the auth flow normally
            window.location.href = link.href;
        }
    }
});
// Handle Back Button
window.addEventListener('popstate', () => {
    window.location.reload();
});