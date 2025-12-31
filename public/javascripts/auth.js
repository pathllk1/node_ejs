// File: public/javascripts/auth.js

console.log("✅ AUTH SCRIPT LOADED - System Ready");

// Initialize immediately if DOM is already loaded, or wait if it's not
function initAuth() {
    
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

    // --- TOKEN TIMER (Real-time countdown) ---
    const decodeJWT = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
            );
            return JSON.parse(jsonPayload);
        } catch (err) {
            console.error('Failed to decode token:', err);
            return null;
        }
    };

    let tokenTimerInterval = null;
    let timerStartTime = null; // Track when timer started

    const updateTokenTimer = () => {
        const token = localStorage.getItem('access_token');
        const timerElement = document.getElementById('token-timer');
        const mobileTimerElement = document.getElementById('mobile-token-timer');

        // Only update timer if timer elements exist on the page
        if (!timerElement && !mobileTimerElement) {
            return;
        }

        if (!token) {
            if (timerElement) timerElement.textContent = '--:--';
            if (mobileTimerElement) mobileTimerElement.textContent = '--:--';
            return;
        }

        const decoded = decodeJWT(token);
        if (!decoded || !decoded.exp) return;

        const expiresAt = decoded.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeRemaining = Math.max(0, expiresAt - now);

        // Convert to mm:ss
        const totalSeconds = Math.floor(timeRemaining / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        if (timerElement) {
            timerElement.textContent = timeString;
            // Change color when less than 1 minute (minutes === 0 means < 60 seconds)
            if (minutes === 0) {
                if (!timerElement.parentElement.classList.contains('bg-red-500/40')) {
                    timerElement.parentElement.classList.add('bg-red-500/40');
                    timerElement.parentElement.classList.remove('bg-white/20');
                }
            } else {
                if (!timerElement.parentElement.classList.contains('bg-white/20')) {
                    timerElement.parentElement.classList.remove('bg-red-500/40');
                    timerElement.parentElement.classList.add('bg-white/20');
                }
            }
        }

        if (mobileTimerElement) {
            mobileTimerElement.textContent = timeString;
        }

        // Note: NO auto-logout here! 
        // With refresh token mechanism, when access token expires, 
        // the API interceptor will automatically get a new one.
        // If BOTH tokens are expired, the API call will fail with 401,
        // and the interceptor will redirect to login.
        // This is handled by the api.js interceptor, not the timer.
    };

    const startTokenTimer = () => {
        if (tokenTimerInterval) clearInterval(tokenTimerInterval);
        timerStartTime = Date.now(); // Mark when timer started
        console.log('✅ Token timer started');
        updateTokenTimer(); // Update immediately
        tokenTimerInterval = setInterval(updateTokenTimer, 500); // Update every 500ms
    };

    const stopTokenTimer = () => {
        if (tokenTimerInterval) {
            clearInterval(tokenTimerInterval);
            tokenTimerInterval = null;
            timerStartTime = null;
            console.log('⏹️ Token timer stopped');
        }
    };

    // Make timer functions available globally for api.js interceptor
    window.startTokenTimer = startTokenTimer;
    window.stopTokenTimer = stopTokenTimer;

    // Only start timer if token exists AND page has timer elements (user is logged in)
    const shouldStartTimer = () => {
        const hasToken = !!localStorage.getItem('access_token');
        const hasTimerElement = !!(document.getElementById('token-timer') || document.getElementById('mobile-token-timer'));
        return hasToken && hasTimerElement;
    };

    if (shouldStartTimer()) {
        startTokenTimer();
    }

    const handleLogout = () => {
        stopTokenTimer(); // Stop timer before logging out
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_info');
        showToast('Logged out successfully');
        updateNavbar();
        setTimeout(() => window.location.href = '/users/login', 1000);
    };
    const logoutBtn = document.getElementById('logout-btn');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

    // --- LOGIN BUTTON ---
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        console.log("✅ Login Button Found");
        loginBtn.addEventListener('click', async () => {
            console.log("🚀 Login Button Clicked - Submitting via AJAX...");
            
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value.trim();
            
            if (!email || !password) {
                showToast('Please fill in all fields', 'error');
                return;
            }

            console.log("📤 Sending Data: email =", email);

            try {
                const res = await fetch('/users/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await res.json();

                if (res.ok && data.access_token && data.refresh_token) {
                    console.log("✅ Both tokens received from server");
                    localStorage.setItem('access_token', data.access_token);
                    localStorage.setItem('refresh_token', data.refresh_token);
                    localStorage.setItem('user_info', JSON.stringify(data.user));
                    
                    // Verify storage
                    const storedAccess = localStorage.getItem('access_token');
                    const storedRefresh = localStorage.getItem('refresh_token');
                    console.log("✅ Access token stored:", storedAccess ? "YES" : "NO");
                    console.log("✅ Refresh token stored:", storedRefresh ? "YES" : "NO");

                    showToast(data.message || 'Login successful', 'success');
                    updateNavbar();
                    startTokenTimer(); // Start the countdown timer
                    setTimeout(() => window.location.href = '/users/profile', 1000);
                } else if (!res.ok) {
                    console.error("❌ Server returned error status:", res.status);
                    showToast(data.error || 'Login failed', 'error');
                } else {
                    console.error("❌ Token missing in response. Response:", data);
                    showToast('Login failed: No token received', 'error');
                }
            } catch (err) {
                console.error("❌ Network Error:", err);
                showToast('Network error occurred', 'error');
            }
        });
    }

    // --- SIGNUP BUTTON ---
    const signupBtn = document.getElementById('signup-btn');
    if (signupBtn) {
        console.log("✅ Signup Button Found");
        signupBtn.addEventListener('click', async () => {
            console.log("🚀 Signup Button Clicked - Submitting via AJAX...");
            
            const fullname = document.getElementById('signup-fullname').value.trim();
            const username = document.getElementById('signup-username').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value.trim();
            const confirm_password = document.getElementById('signup-confirm-password').value.trim();
            
            if (!fullname || !username || !email || !password || !confirm_password) {
                showToast('Please fill in all fields', 'error');
                return;
            }

            try {
                const res = await fetch('/users/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullname, username, email, password, confirm_password })
                });
                const data = await res.json();

                if (res.ok) {
                    showToast(data.message || 'Account created successfully', 'success');
                    setTimeout(() => window.location.href = '/users/login', 1500);
                } else {
                    showToast(data.error || 'Signup failed', 'error');
                }
            } catch (err) {
                console.error("❌ Network Error:", err);
                showToast('Network error occurred', 'error');
            }
        });
    }
}

// Call immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}