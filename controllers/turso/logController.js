const turso = require('../../config/turso');

// Fetch logs from the database
exports.fetchLogs = async (req, res) => {
    try {
        // Validate that admin role is properly configured
        if (!process.env.ADMIN_ROLE_VALUE) {
            console.error('CRITICAL ERROR: ADMIN_ROLE_VALUE environment variable is not set');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE);
        
        const currentUserQuery = await turso.execute({
            sql: 'SELECT * FROM users WHERE id = ?',
            args: [req.user.id]
        });
        const currentUser = currentUserQuery.rows[0];
        
        if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
            return res.status(403).json({ error: 'You are not permitted to perform this action' });
        }

        // Query to fetch all logs ordered by timestamp descending
        const query = "SELECT * FROM request_logs ORDER BY timestamp DESC";
        const result = await turso.execute({ sql: query });

        // Convert BigInt values to numbers in logs and format them
        const formattedLogs = result.rows.map(log => {
            const processedLog = {};
            for (const [key, value] of Object.entries(log)) {
                if (typeof value === 'bigint') {
                    processedLog[key] = Number(value);
                } else {
                    processedLog[key] = value;
                }
            }
            return {
                id: processedLog.id,
                method: processedLog.method,
                url: processedLog.url,
                ip: processedLog.ip,
                username: processedLog.username,
                timestamp: processedLog.timestamp
            };
        });

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
        
        const currentUserQuery = await turso.execute({
            sql: 'SELECT * FROM users WHERE id = ?',
            args: [req.user.id]
        });
        const currentUser = currentUserQuery.rows[0];
        
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
        const result = await turso.execute({ sql: query });

        // Convert BigInt values to numbers in logs and format them
        const formattedLogs = result.rows.map(log => {
            const processedLog = {};
            for (const [key, value] of Object.entries(log)) {
                if (typeof value === 'bigint') {
                    processedLog[key] = Number(value);
                } else {
                    processedLog[key] = value;
                }
            }
            return {
                id: processedLog.id,
                method: processedLog.method,
                url: processedLog.url,
                ip: processedLog.ip,
                username: processedLog.username,
                timestamp: processedLog.timestamp
            };
        });

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