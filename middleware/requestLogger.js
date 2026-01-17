const turso = require('../config/turso');

// Function to extract true client IP (handles proxies)
const getClientIp = (req) => {
    // Check for IP from proxy headers (in order of priority)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, take the first one (original client)
        return forwardedFor.split(',')[0].trim();
    }

    // Check for cloudflare
    if (req.headers['cf-connecting-ip']) {
        return req.headers['cf-connecting-ip'];
    }

    // Check for other common proxy headers
    if (req.headers['x-client-ip']) {
        return req.headers['x-client-ip'];
    }

    // Fallback to express req.ip (which considers trust proxy settings)
    if (req.ip) {
        return req.ip;
    }

    // Last resort: get from connection
    return req.connection.remoteAddress || req.socket.remoteAddress || 'Unknown';
};

const requestLogger = (req, res, next) => {
    try {
        const method = req.method;
        const url = req.originalUrl || req.url;
        const ip = getClientIp(req);
        
        // Extract username from authenticated user (if available)
        // req.user is set by authMiddleware only for protected routes
        // For public routes, req.user will be undefined, so username will be null
        const username = (req.user && req.user.username) ? req.user.username : null;
        
        const userAgent = req.get('User-Agent') || 'Unknown';
        
        // strict ISO string for the timestamp
        const timestamp = new Date().toISOString();

        // Run the insert asynchronously using Turso
        turso.execute({
            sql: `INSERT INTO request_logs (method, url, ip, username, user_agent, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?)` ,
            args: [method, url, ip, username, userAgent, timestamp]
        }).catch(err => {
            // Log the error internally but don't interrupt the request
            console.error('Request logging failed:', err.message);
        });
    } catch (err) {
        // Only log error internally, don't expose to user
        console.error('Request logging failed:', err.message);
    }

    next();
};

module.exports = requestLogger;