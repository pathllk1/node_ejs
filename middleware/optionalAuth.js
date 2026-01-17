const jwt = require('jsonwebtoken');
const { ACCESS_TOKEN_SECRET } = require('../controllers/turso/authController');

/**
 * Optional Authentication Middleware
 * 
 * This middleware attempts to extract user information from JWT tokens
 * WITHOUT failing if tokens are missing. This allows both authenticated
 * and unauthenticated requests to pass through.
 * 
 * Usage: Applied globally before requestLogger to capture user info for logging
 * 
 * Sets req.user = { id, username, type } if valid token is provided
 * Otherwise, req.user remains undefined (which is fine for public requests)
 */
const optionalAuth = (req, res, next) => {
    try {
        // Check if authorization header exists
        const authHeader = req.headers['authorization'];
        
        if (!authHeader) {
            // No token provided - this is fine for public routes
            // req.user will be undefined, requestLogger will log username as null
            return next();
        }

        // Extract token from "Bearer <token>" format
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            // Malformed header - skip and continue
            return next();
        }

        // Try to verify the token silently with explicit algorithm
        jwt.verify(token, ACCESS_TOKEN_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
            if (!err && decoded) {
                // Token is valid - attach user info
                req.user = {
                    id: decoded.id,
                    username: decoded.username,
                    type: decoded.type
                };
            }
            // If token is invalid/expired, we don't set req.user
            // This is fine - public routes don't need auth
            next();
        });

    } catch (error) {
        // Silently ignore any errors and continue
        // This middleware should NEVER fail - it's optional
        next();
    }
};

module.exports = optionalAuth;