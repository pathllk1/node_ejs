console.log("✅ AUTH SCRIPT LOADED - System Ready");

function initAuth() {
    
    // --- COOKIE HELPERS (NEW) ---
    const setAuthCookie = (name, value, seconds) => {
        document.cookie = `${name}=${value}; path=/; max-age=${seconds}; SameSite=Strict`;
    };

    const clearAuthCookies = () => {
        document.cookie = "access_token=; path=/; max-age=0";
        document.cookie = "refresh_token=; path=/; max-age=0";
    };

    // --- TOAST SYSTEM ---
    const showToast = (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        const template = document.getElementById('toast-template');
        if (!container || !template) return;

        const toast = template.cloneNode(true);
        toast.id = '';
        toast.classList.remove('hidden');
        
        toast.querySelector('#toast-message').textContent = message;
        const iconContainer = toast.querySelector('#toast-icon');
        
        if (type === 'success') {
            toast.classList.add('border-green-500');
            iconContainer.innerHTML = `<svg class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
        } else {
            toast.classList.add('border-red-500');
            iconContainer.innerHTML = `<svg class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
        }

        container.appendChild(toast);
        
        // Add event listener to the toast for the close button using event delegation
        toast.addEventListener('click', function(event) {
            if (event.target.closest('.toast-close-btn')) {
                event.preventDefault();
                toast.classList.add('translate-x-full', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }
        });
        
        setTimeout(() => toast.classList.remove('translate-x-full', 'opacity-0'), 10);
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // --- NAVBAR UPDATE ---
    const updateNavbar = () => {
        const token = localStorage.getItem('access_token');
        const userStr = localStorage.getItem('user_info');
        
        const guestNav = document.getElementById('nav-guest');
        const userNav = document.getElementById('nav-user');
        const usernameDisplay = document.getElementById('nav-username');
        const mobileGuestNav = document.getElementById('mobile-nav-guest');
        const mobileUserNav = document.getElementById('mobile-nav-user');
        const mobileUsernameDisplay = document.getElementById('mobile-nav-username');

        if (token && userStr) {
            const user = JSON.parse(userStr);
            if (guestNav) guestNav.classList.add('hidden');
            if (userNav) userNav.classList.remove('hidden');
            if (usernameDisplay) usernameDisplay.textContent = `Hi, ${user.username}`;

            if (mobileGuestNav) mobileGuestNav.classList.add('hidden');
            if (mobileUserNav) mobileUserNav.classList.remove('hidden');
            if (mobileUsernameDisplay) mobileUsernameDisplay.textContent = `Hi, ${user.username}`;
        } else {
            if (guestNav) guestNav.classList.remove('hidden');
            if (userNav) userNav.classList.add('hidden');

            if (mobileGuestNav) mobileGuestNav.classList.remove('hidden');
            if (mobileUserNav) mobileUserNav.classList.add('hidden');
        }
    };
    updateNavbar();

    // --- TOKEN TIMER ---
    const decodeJWT = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            return JSON.parse(jsonPayload);
        } catch (err) {
            return null;
        }
    };

    let tokenTimerInterval = null;

    const updateTokenTimer = () => {
        const token = localStorage.getItem('access_token');
        const timerElement = document.getElementById('token-timer');
        const mobileTimerElement = document.getElementById('mobile-token-timer');

        if (!timerElement && !mobileTimerElement) return;

        if (!token) {
            if (timerElement) timerElement.textContent = '--:--';
            if (mobileTimerElement) mobileTimerElement.textContent = '--:--';
            return;
        }

        const decoded = decodeJWT(token);
        if (!decoded || !decoded.exp) return;

        const expiresAt = decoded.exp * 1000;
        const now = Date.now();
        const timeRemaining = Math.max(0, expiresAt - now);

        const totalSeconds = Math.floor(timeRemaining / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        if (timerElement) timerElement.textContent = timeString;
        if (mobileTimerElement) mobileTimerElement.textContent = timeString;
    };

    const startTokenTimer = () => {
        if (tokenTimerInterval) clearInterval(tokenTimerInterval);
        updateTokenTimer();
        tokenTimerInterval = setInterval(updateTokenTimer, 500);
    };

    const stopTokenTimer = () => {
        if (tokenTimerInterval) clearInterval(tokenTimerInterval);
    };

    window.startTokenTimer = startTokenTimer;
    window.stopTokenTimer = stopTokenTimer;
    window.updateNavbar = updateNavbar;

    if (localStorage.getItem('access_token')) startTokenTimer();

    // --- LOGOUT ---
    const handleLogout = () => {
        stopTokenTimer();
        
        // 1. Clear Storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_info');
        
        // 2. Clear Cookies (CRITICAL FIX)
        clearAuthCookies();

        showToast('Logged out successfully');
        updateNavbar();
        setTimeout(() => window.location.href = '/users/login', 1000);
    };

    const logoutBtn = document.getElementById('logout-btn');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

    // --- LOGIN ---
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value.trim();
            
            if (!email || !password) return showToast('Please fill in all fields', 'error');

            try {
                const res = await fetch('/users/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await res.json();

                if (res.ok && data.access_token && data.refresh_token) {
                    // 1. Save to LocalStorage
                    localStorage.setItem('access_token', data.access_token);
                    localStorage.setItem('refresh_token', data.refresh_token);
                    localStorage.setItem('user_info', JSON.stringify(data.user));
                    
                    // 2. Save to Cookies (CRITICAL FIX)
                    // Access Token = 15 mins (900s), Refresh = 7 days (604800s)
                    setAuthCookie('access_token', data.access_token, 900);
                    setAuthCookie('refresh_token', data.refresh_token, 604800);

                    showToast('Login successful', 'success');
                    updateNavbar();
                    startTokenTimer();
                    setTimeout(() => window.location.href = '/users/profile', 1000);
                } else {
                    showToast(data.error || 'Login failed', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Network error occurred', 'error');
            }
        });
    }
    
    // --- SIGNUP (No changes needed, but included for completeness) ---
    const signupBtn = document.getElementById('signup-btn');
    if (signupBtn) {
        signupBtn.addEventListener('click', async () => {
            const fullname = document.getElementById('signup-fullname').value.trim();
            const username = document.getElementById('signup-username').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value.trim();
            const confirm_password = document.getElementById('signup-confirm-password').value.trim();
            
            if (!fullname || !username || !email || !password || !confirm_password) {
                return showToast('Please fill in all fields', 'error');
            }

            try {
                const res = await fetch('/users/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullname, username, email, password, confirm_password })
                });
                const data = await res.json();

                if (res.ok) {
                    showToast('Account created! Please login.', 'success');
                    setTimeout(() => window.location.href = '/users/login', 1500);
                } else {
                    showToast(data.error || 'Signup failed', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Network error occurred', 'error');
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}