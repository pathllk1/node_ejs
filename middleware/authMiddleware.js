const jwt = require('jsonwebtoken');
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, generateTokens } = require('../controllers/authController');
const db = require('../config/db');

const verifyToken = (req, res, next) => {
    // Get tokens from headers
    const accessTokenHeader = req.headers['authorization'];
    const refreshTokenHeader = req.headers['x-refresh-token'];

    if (!accessTokenHeader || !refreshTokenHeader) {
        return res.status(401).json({ error: 'Missing tokens' });
    }

    // Extract tokens (format: "Bearer <token>")
    const accessToken = accessTokenHeader.split(' ')[1];
    const refreshToken = refreshTokenHeader;

    // Try to verify access token
    jwt.verify(accessToken, ACCESS_TOKEN_SECRET, (err, accessData) => {
        if (!err) {
            // Access token is valid
            req.user = accessData;
            return next();
        }

        // Access token expired or invalid, try refresh token
        jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (refreshErr, refreshData) => {
            if (refreshErr) {
                // Both tokens invalid/expired
                return res.status(401).json({ error: 'Token expired. Please login again.' });
            }

            // Refresh token is valid, generate new access token
            try {
                const findUser = db.prepare('SELECT * FROM users WHERE id = ?');
                const user = findUser.get(refreshData.id);

                if (!user) {
                    return res.status(401).json({ error: 'User not found' });
                }

                // Generate new tokens
                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user);

                // Attach new tokens to response headers
                res.setHeader('X-New-Access-Token', newAccessToken);
                res.setHeader('X-New-Refresh-Token', newRefreshToken);

                // Set user in request
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