// Remove "document.addEventListener..." and wrap logic in a self-executing function
(async function initDashboard() {
    console.log("Dashboard script started..."); // Debug check

    // 1. Security Check
    if (!localStorage.getItem('access_token')) {
        window.location.href = '/users/login';
        return;
    }

    const skeleton = document.getElementById('loading-skeleton');
    const content = document.getElementById('dashboard-content');

    try {
        // 2. Fetch Data
        // Ensure window.api exists before calling it
        if (!window.api) {
            console.error("API utility not loaded");
            return;
        }

        const res = await window.api.get('/users/api/profile');
        
        if (res.ok) {
            const data = await res.json();
            const user = data.user;

            // 3. Populate UI
            const setText = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.textContent = text;
            };

            setText('user-fullname', user.fullname);
            setText('user-email', user.email);
            setText('user-username', user.username);
            setText('user-id', '#' + user.id);
            
            if (user.created_at) {
                const date = new Date(user.created_at);
                setText('user-joined', date.toLocaleDateString('en-US', { 
                    year: 'numeric', month: 'long', day: 'numeric' 
                }));
            }

            // 4. Reveal Content
            if (skeleton) skeleton.classList.add('hidden');
            if (content) content.classList.remove('hidden');

        } else {
            throw new Error('Failed to load profile');
        }
    } catch (error) {
        console.error('Dashboard Error:', error);
        // window.location.href = '/users/login'; // Uncomment if you want strict redirect
    }
})();