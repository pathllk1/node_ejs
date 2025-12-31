const db = require('../config/db');

// Prepare the statement once for performance
const insertLog = db.prepare(`
    INSERT INTO request_logs (method, url, ip, user_agent, timestamp)
    VALUES (?, ?, ?, ?, ?)
`);

const requestLogger = (req, res, next) => {
    try {
        const method = req.method;
        const url = req.originalUrl || req.url;
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent') || 'Unknown';
        
        // strict ISO string for the timestamp
        const timestamp = new Date().toISOString();

        // Run the insert synchronously (better-sqlite3 is fast enough for this usually)
        insertLog.run(method, url, ip, userAgent, timestamp);
    } catch (err) {
        console.error('Logging failed:', err.message);
    }

    next();
};

module.exports = requestLogger;