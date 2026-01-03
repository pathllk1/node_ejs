// A wrapper around the native fetch API with token management
window.api = {
    get: async (url) => request('GET', url),
    post: async (url, body) => request('POST', url, body),
    put: async (url, body) => request('PUT', url, body),    // Added
    delete: async (url) => request('DELETE', url),          // Added
};

async function request(method, url, body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };

    // Attach both tokens from LocalStorage
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    if (refreshToken) headers['X-Refresh-Token'] = refreshToken;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
        const response = await fetch(url, config);

        // --- RESPONSE INTERCEPTOR ---
        const newAccessToken = response.headers.get('X-New-Access-Token');
        const newRefreshToken = response.headers.get('X-New-Refresh-Token');

        if (newAccessToken) {
            console.log('✅ New access token received');
            
            // 1. Update LocalStorage
            localStorage.setItem('access_token', newAccessToken);
            
            // 2. Update Cookie (CRITICAL FIX for F5 Refresh)
            document.cookie = `access_token=${newAccessToken}; path=/; max-age=900; SameSite=Strict`;
            
            if (window.startTokenTimer) window.startTokenTimer();
        }
        
        if (newRefreshToken) {
            console.log('✅ New refresh token received');
            localStorage.setItem('refresh_token', newRefreshToken);
            document.cookie = `refresh_token=${newRefreshToken}; path=/; max-age=604800; SameSite=Strict`;
        }

        // Handle 401 (Token invalid/expired and refresh also failed)
        if (response.status === 401) {
            console.error('❌ Authentication failed. Redirecting...');
            
            // Clear everything
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_info');
            
            // Clear cookies
            document.cookie = "access_token=; path=/; max-age=0";
            document.cookie = "refresh_token=; path=/; max-age=0";

            window.location.href = '/users/login';
            return;
        }

        return response;
    } catch (error) {
        console.error("API Request Failed", error);
        throw error;
    }
}