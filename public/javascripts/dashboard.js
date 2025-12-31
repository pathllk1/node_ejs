document.addEventListener('DOMContentLoaded', async () => {
    // 1. Security Check: If no token, kick out immediately
    if (!localStorage.getItem('access_token')) {
        window.location.href = '/users/login';
        return;
    }

    const skeleton = document.getElementById('loading-skeleton');
    const content = document.getElementById('dashboard-content');

    try {
        // 2. Fetch Data using the Global Interceptor (window.api)
        // Note: window.api is available because we loaded api.js in the layout
        const res = await window.api.get('/users/api/profile');
        
        if (res.ok) {
            const data = await res.json();
            const user = data.user;

            // 3. Populate UI safely
            const setText = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.textContent = text;
            };

            setText('user-fullname', user.fullname);
            setText('user-email', user.email);
            setText('user-username', user.username);
            setText('user-id', '#' + user.id);
            
            // Format Date
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
        // If the API fails (e.g., token invalid), the interceptor usually handles redirect.
        // But as a fallback, we redirect to login.
        window.location.href = '/users/login';
    }
});