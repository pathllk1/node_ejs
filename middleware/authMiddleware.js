const jwt = require('jsonwebtoken');
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, generateTokens } = require('../controllers/authController');
const db = require('../config/db');

const verifyToken = (req, res, next) => {
    // 1. Try getting token from Headers (Standard AJAX/API approach)
    const accessTokenHeader = req.headers['authorization'];
    const refreshTokenHeader = req.headers['x-refresh-token'];

    let accessToken = accessTokenHeader && accessTokenHeader.split(' ')[1];
    let refreshToken = refreshTokenHeader;

    // 2. FALLBACK: Try getting token from Cookies (Fixes Page Refresh / F5)
    if (!accessToken && req.cookies) {
        accessToken = req.cookies['access_token'];
        refreshToken = req.cookies['refresh_token'];
    }

    // 3. Logic: If no token found at all
    if (!accessToken) {
        // If the browser is asking for HTML (User refreshed page), redirect to login
        if (req.accepts('html')) {
            return res.redirect('/users/login');
        }
        // If it's an API call (JSON), send 401 Unauthorized
        return res.status(401).json({ error: 'Missing tokens' });
    }

    // 4. Verify Access Token
    jwt.verify(accessToken, ACCESS_TOKEN_SECRET, (err, accessData) => {
        if (!err) {
            req.user = accessData;
            return next(); // Valid token, proceed
        }

        // 5. Access Token Expired -> Try Refresh Token
        if (!refreshToken) {
            if (req.accepts('html')) return res.redirect('/users/login');
            return res.status(401).json({ error: 'Token expired' });
        }

        jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (refreshErr, refreshData) => {
            if (refreshErr) {
                // Both tokens dead
                if (req.accepts('html')) return res.redirect('/users/login');
                return res.status(401).json({ error: 'Token expired. Please login again.' });
            }

            // 6. Refresh Valid -> Generate New Pair
            try {
                const findUser = db.prepare('SELECT * FROM users WHERE id = ?');
                const user = findUser.get(refreshData.id);

                if (!user) return res.status(401).json({ error: 'User not found' });

                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user);

                // A. Attach to Headers (For your API Interceptor)
                res.setHeader('X-New-Access-Token', newAccessToken);
                res.setHeader('X-New-Refresh-Token', newRefreshToken);

                // B. Attach to Cookies (For the Browser Refresh)
                // Set maxAge to match token life (15 min = 900000ms, 7 days for refresh)
                res.cookie('access_token', newAccessToken, { httpOnly: false, sameSite: 'Strict', maxAge: 900000 });
                res.cookie('refresh_token', newRefreshToken, { httpOnly: false, sameSite: 'Strict', maxAge: 604800000 });

                req.user = refreshData;
                next();
            } catch (error) {
                console.error('Token refresh error:', error);
                return res.status(500).json({ error: 'Server error' });
            }
        });
    });
};

module.exports = verifyToken;