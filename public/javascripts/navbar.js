document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Main Mobile Menu Toggle ---
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // --- 2. Desktop AI Dropdown Toggle ---
    const aiMenuBtn = document.getElementById('ai-menu-btn');
    const aiDropdown = document.getElementById('ai-dropdown');
    const aiMenuIcon = document.getElementById('ai-menu-icon');

    if (aiMenuBtn && aiDropdown) {
        // Toggle logic
        aiMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from bubbling to document
            aiDropdown.classList.toggle('hidden');
            
            // Rotate icon
            if (aiMenuIcon) {
                aiMenuIcon.classList.toggle('rotate-180');
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!aiMenuBtn.contains(e.target) && !aiDropdown.contains(e.target)) {
                if (!aiDropdown.classList.contains('hidden')) {
                    aiDropdown.classList.add('hidden');
                    // Reset icon rotation
                    if (aiMenuIcon) {
                        aiMenuIcon.classList.remove('rotate-180');
                    }
                }
            }
        });
    }

    // --- 3. Mobile AI Accordion Toggle ---
    const mobileAiBtn = document.getElementById('mobile-ai-btn');
    const mobileAiMenu = document.getElementById('mobile-ai-menu');
    const mobileAiIcon = document.getElementById('mobile-ai-icon');

    if (mobileAiBtn && mobileAiMenu) {
        mobileAiBtn.addEventListener('click', () => {
            mobileAiMenu.classList.toggle('hidden');
            
            // Rotate icon
            if (mobileAiIcon) {
                mobileAiIcon.classList.toggle('rotate-180');
            }
        });
    }
});