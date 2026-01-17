(function initTabs() {
    console.log('Tabs script loaded'); // Debugging check

    // 1. Select the specific container to avoid conflicts with other UI elements
    const tabsContainer = document.getElementById('inventory-tabs');

    // Safety check: if the container doesn't exist, stop.
    if (!tabsContainer) {
        console.error("Inventory tabs container not found!");
        return;
    }

    const tabs = tabsContainer.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-pane');

    // Classes for the active tab button
    const activeClasses = ['text-blue-600', 'border-blue-600'];
    // Classes for the inactive tab button
    const inactiveClasses = ['text-gray-500', 'border-transparent'];

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-target');
            console.log('Clicked tab:', targetId); // Debugging check

            // A. Reset visual state of ALL tabs
            tabs.forEach(t => {
                t.classList.remove(...activeClasses);
                t.classList.add(...inactiveClasses);
            });

            // B. Hide ALL content panes
            contents.forEach(content => {
                content.classList.add('hidden');
                content.classList.remove('block');
            });

            // C. Set clicked tab to ACTIVE
            tab.classList.remove(...inactiveClasses);
            tab.classList.add(...activeClasses);

            // D. Show the TARGET content
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.remove('hidden');
                targetContent.classList.add('block');
            } else {
                console.warn(`Content div with id "${targetId}" not found.`);
            }
        });
    });
})();