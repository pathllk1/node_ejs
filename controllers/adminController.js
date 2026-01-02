exports.viewLogs = async (req, res) => {
    try {
        // 1. Fetch from Python Microservice
        const response = await fetch('http://127.0.0.1:5200/logs');
        const data = await response.json();

        if (data.success) {
            // 2. Render the page with the logs data
            return res.render('admin/logs', { 
                layout: 'layouts/main',
                title: 'System Logs',
                logs: data.logs 
            });
        } else {
            throw new Error(data.error || 'Failed to fetch logs');
        }

    } catch (error) {
        console.error("Log View Error:", error);
        // Render page with empty state + error message
        return res.render('admin/logs', { 
            layout: 'layouts/main',
            title: 'System Logs',
            error: "Service Unavailable",
            logs: []
        });
    }
};