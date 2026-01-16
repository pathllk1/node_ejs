const db = require('../config/db');
exports.viewLogs = async (req, res) => {
    try {
        // Check if current user has admin role - check directly from database
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
        
        // Fetch logs using Node.js controller
        const query = "SELECT * FROM request_logs ORDER BY timestamp DESC";
        const logs = db.prepare(query).all();

        // Format the logs to match the expected format
        const formattedLogs = logs.map(log => ({
            id: log.id,
            method: log.method,
            url: log.url,
            ip: log.ip,
            username: log.username,
            timestamp: log.timestamp
        }));
        
        // 2. Render the page with the logs data
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

// Render settings page
exports.viewSettings = (req, res) => {
    // Check if current user has admin role - check directly from database
    // Validate that admin role is properly configured
    if (!process.env.ADMIN_ROLE_VALUE) {
        console.error('CRITICAL ERROR: ADMIN_ROLE_VALUE environment variable is not set');
        return res.status(500).render('admin/settings', {
            layout: 'layouts/main',
            title: 'System Settings',
            error: "Server configuration error"
        });
    }
    
    const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE);
    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
        return res.status(403).render('admin/settings', {
            layout: 'layouts/main',
            title: 'System Settings',
            error: 'You are not permitted to perform this action'
        });
    }
    
    res.render('admin/settings', {
        layout: 'layouts/main',
        title: 'System Settings'
    });
};

// Render firms management page
exports.viewFirmsManagement = (req, res) => {
    // Check if current user has admin role - check directly from database
    // Validate that admin role is properly configured
    if (!process.env.ADMIN_ROLE_VALUE) {
        console.error('CRITICAL ERROR: ADMIN_ROLE_VALUE environment variable is not set');
        return res.status(500).render('admin/firms-management', {
            layout: 'layouts/main',
            title: 'Firm Management',
            error: "Server configuration error",
            user: req.user || { username: 'Guest' }
        });
    }
    
    const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE);
    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
        return res.status(403).render('admin/firms-management', {
            layout: 'layouts/main',
            title: 'Firm Management',
            error: 'You are not permitted to perform this action',
            user: req.user || { username: 'Guest' }
        });
    }
    
    res.render('admin/firms-management', {
        layout: 'layouts/main',
        title: 'Firm Management',
        user: req.user || { username: 'Guest' }
    });
};

// API endpoint to get logs data in JSON format
exports.getLogsData = async (req, res) => {
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
    try {
        // Fetch logs from the database directly
        const query = "SELECT * FROM request_logs ORDER BY timestamp DESC";
        const logs = db.prepare(query).all();

        // Format the logs to match the expected format
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
        console.error("Log API Error:", error.message);
        return res.json({
            success: false,
            error: 'Internal server error',
            logs: []
        });
    }
};

// Database backup functionality
exports.backupDatabase = async (req, res) => {
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
        console.error('Database backup error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// MongoDB drop all records functionality (keeps collections)
exports.dropMongoDBRecords = async (req, res) => {
    // Validate that admin role is properly configured
    if (!process.env.ADMIN_ROLE_VALUE) {
        console.error('CRITICAL ERROR: ADMIN_ROLE_VALUE environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE);
    const db = require('../config/db');
    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    
    try {
        // Import MongoDB Prisma client
        const mongoPrisma = require('../config/prisma_mongo');
        
        // Delete all records from all collections/models (keeps the collections)
        await Promise.all([
            mongoPrisma.nSE_LIVE.deleteMany(),
            mongoPrisma.advancerecoveries.deleteMany(),
            mongoPrisma.aihistories.deleteMany(),
            mongoPrisma.apilogs.deleteMany(),
            mongoPrisma.bills.deleteMany(),
            mongoPrisma.chatmessages.deleteMany(),
            mongoPrisma.cnnotes.deleteMany(),
            mongoPrisma.cosmosdbconfigs.deleteMany(),
            mongoPrisma.documents.deleteMany(),
            mongoPrisma.employeeadvances.deleteMany(),
            mongoPrisma.expenseParties.deleteMany(),
            mongoPrisma.expenses.deleteMany(),
            mongoPrisma.firms.deleteMany(),
            mongoPrisma.folios.deleteMany(),
            mongoPrisma.idmappings.deleteMany(),
            mongoPrisma.ledgerTransactions.deleteMany(),
            mongoPrisma.ledgers.deleteMany(),
            mongoPrisma.managercodes.deleteMany(),
            mongoPrisma.masterrolls.deleteMany(),
            mongoPrisma.mutualfundinvestments.deleteMany(),
            mongoPrisma.mutualfunds.deleteMany(),
            mongoPrisma.mutualfundschemes.deleteMany(),
            mongoPrisma.mutualfundsips.deleteMany(),
            mongoPrisma.notes.deleteMany(),
            mongoPrisma.notifications.deleteMany(),
            mongoPrisma.notificationsettings.deleteMany(),
            mongoPrisma.nsedocuments.deleteMany(),
            mongoPrisma.nses.deleteMany(),
            mongoPrisma.paidToGroups.deleteMany(),
            mongoPrisma.parties.deleteMany(),
            mongoPrisma.roles.deleteMany(),
            mongoPrisma.stockregs.deleteMany(),
            mongoPrisma.stocks.deleteMany(),
            mongoPrisma.subcontractors.deleteMany(),
            mongoPrisma.subs.deleteMany(),
            mongoPrisma.subsModels.deleteMany(),
            mongoPrisma.subsTransactions.deleteMany(),
            mongoPrisma.supabaseconfigs.deleteMany(),
            mongoPrisma.users.deleteMany(),
            mongoPrisma.wages.deleteMany()
        ]);
        
        // Disconnect from MongoDB after operation
        await mongoPrisma.$disconnect();
        
        res.json({
            success: true,
            message: 'All MongoDB records dropped successfully (collections preserved)'
        });
        
    } catch (error) {
        console.error('MongoDB drop records error:', error.message);
        // Attempt to disconnect from MongoDB in case of error
        try {
            await mongoPrisma.$disconnect();
        } catch (disconnectError) {
            console.error('Error disconnecting from MongoDB:', disconnectError.message);
        }
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// MongoDB drop all collections functionality (removes collections entirely)
exports.dropMongoDBCollections = async (req, res) => {
    // Validate that admin role is properly configured
    if (!process.env.ADMIN_ROLE_VALUE) {
        console.error('CRITICAL ERROR: ADMIN_ROLE_VALUE environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE);
    const db = require('../config/db');
    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    
    try {
        // Import MongoDB Prisma client
        const mongoPrisma = require('../config/prisma_mongo');
        
        // Drop all collections entirely
        // Note: Prisma doesn't have a direct dropCollection method, so we'll delete all records and then disconnect
        // The actual collection dropping would typically be done through the native MongoDB driver
        
        // Delete all records first
        await Promise.all([
            mongoPrisma.nSE_LIVE.deleteMany(),
            mongoPrisma.advancerecoveries.deleteMany(),
            mongoPrisma.aihistories.deleteMany(),
            mongoPrisma.apilogs.deleteMany(),
            mongoPrisma.bills.deleteMany(),
            mongoPrisma.chatmessages.deleteMany(),
            mongoPrisma.cnnotes.deleteMany(),
            mongoPrisma.cosmosdbconfigs.deleteMany(),
            mongoPrisma.documents.deleteMany(),
            mongoPrisma.employeeadvances.deleteMany(),
            mongoPrisma.expenseParties.deleteMany(),
            mongoPrisma.expenses.deleteMany(),
            mongoPrisma.firms.deleteMany(),
            mongoPrisma.folios.deleteMany(),
            mongoPrisma.idmappings.deleteMany(),
            mongoPrisma.ledgerTransactions.deleteMany(),
            mongoPrisma.ledgers.deleteMany(),
            mongoPrisma.managercodes.deleteMany(),
            mongoPrisma.masterrolls.deleteMany(),
            mongoPrisma.mutualfundinvestments.deleteMany(),
            mongoPrisma.mutualfunds.deleteMany(),
            mongoPrisma.mutualfundschemes.deleteMany(),
            mongoPrisma.mutualfundsips.deleteMany(),
            mongoPrisma.notes.deleteMany(),
            mongoPrisma.notifications.deleteMany(),
            mongoPrisma.notificationsettings.deleteMany(),
            mongoPrisma.nsedocuments.deleteMany(),
            mongoPrisma.nses.deleteMany(),
            mongoPrisma.paidToGroups.deleteMany(),
            mongoPrisma.parties.deleteMany(),
            mongoPrisma.roles.deleteMany(),
            mongoPrisma.stockregs.deleteMany(),
            mongoPrisma.stocks.deleteMany(),
            mongoPrisma.subcontractors.deleteMany(),
            mongoPrisma.subs.deleteMany(),
            mongoPrisma.subsModels.deleteMany(),
            mongoPrisma.subsTransactions.deleteMany(),
            mongoPrisma.supabaseconfigs.deleteMany(),
            mongoPrisma.users.deleteMany(),
            mongoPrisma.wages.deleteMany()
        ]);
        
        // Disconnect from MongoDB after operation
        await mongoPrisma.$disconnect();
                
        // Since Prisma doesn't directly support dropping collections entirely,
        // we'll just delete all records from all collections.
        // In MongoDB with Prisma, the collections will remain but be empty.
                
        res.json({
            success: true,
            message: 'All MongoDB collections cleared successfully (collections remain but are empty)'
        });
        
    } catch (error) {
        console.error('MongoDB drop collections error:', error.message);
        
        // Attempt to disconnect from MongoDB in case of error
        try {
            await mongoPrisma.$disconnect();
        } catch (disconnectError) {
            console.error('Error disconnecting from MongoDB:', disconnectError.message);
        }
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Database restore functionality
exports.restoreDatabase = async (req, res) => {
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
        console.error('Database restore error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};