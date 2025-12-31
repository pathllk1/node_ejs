// A wrapper around the native fetch API with token management
window.api = {
    get: async (url) => request('GET', url),
    post: async (url, body) => request('POST', url, body),
    // You can add put/delete here
};

async function request(method, url, body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };

    // --- INTERCEPTOR LOGIC: Attach both tokens ---
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    if (refreshToken) {
        headers['X-Refresh-Token'] = refreshToken;
    }

    const config = {
        method,
        headers,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, config);

        // --- RESPONSE INTERCEPTOR: Check for new tokens ---
        const newAccessToken = response.headers.get('X-New-Access-Token');
        const newRefreshToken = response.headers.get('X-New-Refresh-Token');

        if (newAccessToken) {
            console.log('✅ New access token received from server');
            localStorage.setItem('access_token', newAccessToken);
            // Restart timer with new token
            if (window.startTokenTimer) {
                window.startTokenTimer();
            }
        }
        if (newRefreshToken) {
            console.log('✅ New refresh token received from server');
            localStorage.setItem('refresh_token', newRefreshToken);
        }

        // Handle 401 (Token invalid/expired and refresh also failed)
        if (response.status === 401) {
            console.error('❌ Authentication failed. Redirecting to login...');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_info');
            window.location.href = '/users/login';
            return;
        }

        return response;
    } catch (error) {
        console.error("API Request Failed", error);
        throw error;
    }
}