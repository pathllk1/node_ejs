const db = require('../config/db');

// Fetch logs from the database
exports.fetchLogs = async (req, res) => {
    try {
        // Validate that admin role is properly configured
        if (!process.env.ADMIN_ROLE_VALUE) {
            console.error('CRITICAL ERROR: ADMIN_ROLE_VALUE environment variable is not set');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE);
        const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
            return res.status(403).json({ error: 'You are not permitted to perform this action' });
        }

        // Query to fetch all logs ordered by timestamp descending
        const query = "SELECT * FROM request_logs ORDER BY timestamp DESC";
        const logs = db.prepare(query).all();

        // Format the logs to match the Python service response format
        const formattedLogs = logs.map(log => ({
            id: log.id,
            method: log.method,
            url: log.url,
            ip: log.ip,
            username: log.username,
            timestamp: log.timestamp
        }));

        return res.json({
            success: true,
            logs: formattedLogs
        });

    } catch (error) {
        console.error("Log fetching error:", error.message);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            logs: []
        });
    }
};

// Alternative function for rendering logs page (similar to the existing viewLogs function)
exports.viewLogs = async (req, res) => {
    try {
        // Validate that admin role is properly configured
        if (!process.env.ADMIN_ROLE_VALUE) {
            console.error('CRITICAL ERROR: ADMIN_ROLE_VALUE environment variable is not set');
            return res.status(500).render('admin/logs', {
                layout: 'layouts/main',
                title: 'System Logs',
                error: "Server configuration error",
                logs: []
            });
        }

        const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE);
        const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
            return res.status(403).render('admin/logs', {
                layout: 'layouts/main',
                title: 'System Logs',
                error: 'You are not permitted to perform this action',
                logs: []
            });
        }

        // Query to fetch all logs ordered by timestamp descending
        const query = "SELECT * FROM request_logs ORDER BY timestamp DESC";
        const logs = db.prepare(query).all();

        // Format the logs to match the Python service response format
        const formattedLogs = logs.map(log => ({
            id: log.id,
            method: log.method,
            url: log.url,
            ip: log.ip,
            username: log.username,
            timestamp: log.timestamp
        }));

        // Render the page with the logs data
        return res.render('admin/logs', {
            layout: 'layouts/main',
            title: 'System Logs',
            logs: formattedLogs
        });

    } catch (error) {
        console.error("Log View Error:", error.message);
        // Render page with empty state + error message
        return res.render('admin/logs', {
            layout: 'layouts/main',
            title: 'System Logs',
            error: "Service Unavailable",
            logs: []
        });
    }
};