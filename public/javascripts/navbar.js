document.addEventListener('DOMContentLoaded', () => {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            // Toggle the 'hidden' class to show/hide the menu
            mobileMenu.classList.toggle('hidden');
        });
    }
});