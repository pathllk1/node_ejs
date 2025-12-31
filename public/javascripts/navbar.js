document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Main Mobile Menu Toggle ---
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // --- 2. Desktop Tools Dropdown Toggle ---
    const toolsMenuBtn = document.getElementById('tools-menu-btn');
    const toolsDropdown = document.getElementById('tools-dropdown');
    const toolsMenuIcon = document.getElementById('tools-menu-icon');

    if (toolsMenuBtn && toolsDropdown) {
        // Toggle logic
        toolsMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from bubbling to document
            toolsDropdown.classList.toggle('hidden');
            
            // Rotate icon
            if (toolsMenuIcon) {
                toolsMenuIcon.classList.toggle('rotate-180');
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!toolsMenuBtn.contains(e.target) && !toolsDropdown.contains(e.target)) {
                if (!toolsDropdown.classList.contains('hidden')) {
                    toolsDropdown.classList.add('hidden');
                    // Reset icon rotation
                    if (toolsMenuIcon) {
                        toolsMenuIcon.classList.remove('rotate-180');
                    }
                }
            }
        });
    }

    // --- 3. Mobile Tools Accordion Toggle ---
    // Updated IDs to match the new HTML structure
    const mobileToolsBtn = document.getElementById('mobile-tools-btn');
    const mobileToolsMenu = document.getElementById('mobile-tools-menu');
    const mobileToolsIcon = document.getElementById('mobile-tools-icon');

    if (mobileToolsBtn && mobileToolsMenu) {
        mobileToolsBtn.addEventListener('click', () => {
            mobileToolsMenu.classList.toggle('hidden');
            
            // Rotate icon
            if (mobileToolsIcon) {
                mobileToolsIcon.classList.toggle('rotate-180');
            }
        });
    }
});