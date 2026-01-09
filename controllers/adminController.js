const db = require('../config/db');
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

// Render settings page
exports.viewSettings = (req, res) => {
    res.render('admin/settings', {
        layout: 'layouts/main',
        title: 'System Settings'
    });
};

// Render firms management page
exports.viewFirmsManagement = (req, res) => {
    res.render('admin/firms-management', {
        layout: 'layouts/main',
        title: 'Firm Management',
        user: req.user || { username: 'Guest' }
    });
};

// API endpoint to get logs data in JSON format
exports.getLogsData = async (req, res) => {
    const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE || '');
    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!currentUser || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    try {
        // Fetch logs from the Python microservice
        const response = await fetch('http://127.0.0.1:5200/logs');
        const data = await response.json();

        if (data.success) {
            return res.json({
                success: true,
                logs: data.logs
            });
        } else {
            return res.json({
                success: false,
                error: data.error || 'Failed to fetch logs',
                logs: []
            });
        }

    } catch (error) {
        console.error("Log API Error:", error);
        return res.json({
            success: false,
            error: error.message,
            logs: []
        });
    }
};

// Database backup functionality
exports.backupDatabase = async (req, res) => {
    const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE || '');
    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!currentUser || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    try {
        const fs = require('fs');
        const path = require('path');

        // Get the database file path
        const dbPath = path.join(__dirname, '../config/app.db');
        const walPath = path.join(__dirname, '../config/app.db-wal');
        const shmPath = path.join(__dirname, '../config/app.db-shm');
        const backupDir = path.join(__dirname, '../backups');

        // Create backups directory if it doesn't exist
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Create backup filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupBaseName = `backup-${timestamp}`;

        // Copy the main database file
        const mainBackupPath = path.join(backupDir, `${backupBaseName}.db`);
        fs.copyFileSync(dbPath, mainBackupPath);

        // Copy WAL file if it exists
        if (fs.existsSync(walPath)) {
            const walBackupPath = path.join(backupDir, `${backupBaseName}.db-wal`);
            fs.copyFileSync(walPath, walBackupPath);
        }

        // Copy SHM file if it exists
        if (fs.existsSync(shmPath)) {
            const shmBackupPath = path.join(backupDir, `${backupBaseName}.db-shm`);
            fs.copyFileSync(shmPath, shmBackupPath);
        }

        res.json({
            success: true,
            message: 'Database backup created successfully',
            backupFile: backupBaseName
        });

    } catch (error) {
        console.error('Database backup error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Database restore functionality
exports.restoreDatabase = async (req, res) => {
    const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE || '');
    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!currentUser || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    try {
        const fs = require('fs');
        const path = require('path');

        // Check if files were uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No backup files provided'
            });
        }

        const dbPath = path.join(__dirname, '../config/app.db');
        const walPath = path.join(__dirname, '../config/app.db-wal');
        const shmPath = path.join(__dirname, '../config/app.db-shm');

        // Backup current database files before restoring
        const currentBackupDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(currentBackupDir)) {
            fs.mkdirSync(currentBackupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Backup current main database file if it exists
        if (fs.existsSync(dbPath)) {
            const currentDbBackupPath = path.join(currentBackupDir, `pre-restore-backup-${timestamp}.db`);
            fs.copyFileSync(dbPath, currentDbBackupPath);
        }

        // Backup current WAL file if it exists
        if (fs.existsSync(walPath)) {
            const currentWalBackupPath = path.join(currentBackupDir, `pre-restore-backup-${timestamp}.db-wal`);
            fs.copyFileSync(walPath, currentWalBackupPath);
        }

        // Backup current SHM file if it exists
        if (fs.existsSync(shmPath)) {
            const currentShmBackupPath = path.join(currentBackupDir, `pre-restore-backup-${timestamp}.db-shm`);
            fs.copyFileSync(shmPath, currentShmBackupPath);
        }

        // Process uploaded files
        for (const file of req.files) {
            if (file.originalname.endsWith('.db')) {
                // This is the main database file
                fs.renameSync(file.path, dbPath);
            } else if (file.originalname.endsWith('.db-wal')) {
                // This is the WAL file
                fs.renameSync(file.path, walPath);
            } else if (file.originalname.endsWith('.db-shm')) {
                // This is the SHM file
                fs.renameSync(file.path, shmPath);
            } else {
                // Clean up unrecognized files
                fs.unlinkSync(file.path);
            }
        }

        res.json({
            success: true,
            message: 'Database restored successfully'
        });

    } catch (error) {
        console.error('Database restore error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};