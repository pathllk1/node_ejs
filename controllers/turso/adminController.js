const turso = require('../../config/turso');

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
        
        // Fetch logs using Node.js controller
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
exports.viewSettings = async (req, res) => {
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
    
    const currentUserQuery = await turso.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [req.user.id]
    });
    const currentUser = currentUserQuery.rows[0];
    
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
exports.viewFirmsManagement = async (req, res) => {
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
    
    const currentUserQuery = await turso.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [req.user.id]
    });
    const currentUser = currentUserQuery.rows[0];
    
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
    
    const currentUserQuery = await turso.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [req.user.id]
    });
    const currentUser = currentUserQuery.rows[0];
    
    if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    try {
        // Fetch logs from the database directly
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
    
    const currentUserQuery = await turso.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [req.user.id]
    });
    const currentUser = currentUserQuery.rows[0];
    
    if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    try {
        const fs = require('fs');
        const path = require('path');

        // Get the database file path
        const dbPath = path.join(__dirname, '../../config/app.db');
        const walPath = path.join(__dirname, '../../config/app.db-wal');
        const shmPath = path.join(__dirname, '../../config/app.db-shm');
        const backupDir = path.join(__dirname, '../../backups');

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
    
    const dbQuery = await turso.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [req.user.id]
    });
    const currentUser = dbQuery.rows[0];
    
    if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    
    try {
        // Import MongoDB Prisma client
        const mongoPrisma = require('../../config/prisma_mongo');
        
        // Delete all records from all collections/models (keeps the collections)
        // Need to respect foreign key relationships - delete related records first
        await mongoPrisma.billSequences.deleteMany(); // Delete bill sequences first due to relation with firms
        await mongoPrisma.firmSettings.deleteMany(); // Delete firm settings first due to relation with firms
        await mongoPrisma.ledger.deleteMany(); // Delete ledger first due to relation with firms
        await mongoPrisma.stockReg.deleteMany(); // Delete stockReg first due to relation with firms
        
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
            mongoPrisma.partyGsts.deleteMany(), // Also need to delete partyGsts that relates to parties
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
            const mongoPrisma = require('../../config/prisma_mongo');
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
    
    const dbQuery = await turso.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [req.user.id]
    });
    const currentUser = dbQuery.rows[0];
    
    if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    
    try {
        // Import MongoDB Prisma client
        const mongoPrisma = require('../../config/prisma_mongo');
        
        // Drop all collections entirely
        // Note: Prisma doesn't have a direct dropCollection method, so we'll delete all records and then disconnect
        // The actual collection dropping would typically be done through the native MongoDB driver
        
        // Delete all records first - need to respect foreign key relationships
        await mongoPrisma.billSequences.deleteMany(); // Delete bill sequences first due to relation with firms
        await mongoPrisma.firmSettings.deleteMany(); // Delete firm settings first due to relation with firms
        await mongoPrisma.ledger.deleteMany(); // Delete ledger first due to relation with firms
        await mongoPrisma.stockReg.deleteMany(); // Delete stockReg first due to relation with firms
        
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
            mongoPrisma.partyGsts.deleteMany(), // Also need to delete partyGsts that relates to parties
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
            const mongoPrisma = require('../../config/prisma_mongo');
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
    
    const currentUserQuery = await turso.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [req.user.id]
    });
    const currentUser = currentUserQuery.rows[0];
    
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

        const dbPath = path.join(__dirname, '../../config/app.db');
        const walPath = path.join(__dirname, '../../config/app.db-wal');
        const shmPath = path.join(__dirname, '../../config/app.db-shm');

        // Backup current database files before restoring
        const currentBackupDir = path.join(__dirname, '../../backups');
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

// SQLite to MongoDB backup functionality
exports.sqliteToMongoBackup = async (req, res) => {
    // Validate that admin role is properly configured
    if (!process.env.ADMIN_ROLE_VALUE) {
        console.error('CRITICAL ERROR: ADMIN_ROLE_VALUE environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE);
    
    const dbQuery = await turso.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [req.user.id]
    });
    const currentUser = dbQuery.rows[0];
    
    if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    
    try {
        // Import MongoDB Prisma client
        const mongoPrisma = require('../../config/prisma_mongo');
        
        // First, get counts of data to be backed up
        const countBillSequencesQuery = await turso.execute({ sql: 'SELECT COUNT(*) as count FROM bill_sequences' });
        const countFirmsQuery = await turso.execute({ sql: 'SELECT COUNT(*) as count FROM firms' });
        const countUsersQuery = await turso.execute({ sql: 'SELECT COUNT(*) as count FROM users' });
        const countSettingsQuery = await turso.execute({ sql: 'SELECT COUNT(*) as count FROM settings' });
        const countRequestLogsQuery = await turso.execute({ sql: 'SELECT COUNT(*) as count FROM request_logs' });
        const countPartiesQuery = await turso.execute({ sql: 'SELECT COUNT(*) as count FROM parties' });
        const countPartyGstsQuery = await turso.execute({ sql: 'SELECT COUNT(*) as count FROM party_gsts' });
        const countStocksQuery = await turso.execute({ sql: 'SELECT COUNT(*) as count FROM stocks' });
        const countBillsQuery = await turso.execute({ sql: 'SELECT COUNT(*) as count FROM bills' });
        const countLedgerQuery = await turso.execute({ sql: 'SELECT COUNT(*) as count FROM ledger' });
        const countStockRegQuery = await turso.execute({ sql: 'SELECT COUNT(*) as count FROM stock_reg' });
        const countFirmSettingsQuery = await turso.execute({ sql: 'SELECT COUNT(*) as count FROM firm_settings' });
        
        const countBillSequences = countBillSequencesQuery.rows[0]?.count || 0;
        const countFirms = countFirmsQuery.rows[0]?.count || 0;
        const countUsers = countUsersQuery.rows[0]?.count || 0;
        const countSettings = countSettingsQuery.rows[0]?.count || 0;
        const countRequestLogs = countRequestLogsQuery.rows[0]?.count || 0;
        const countParties = countPartiesQuery.rows[0]?.count || 0;
        const countPartyGsts = countPartyGstsQuery.rows[0]?.count || 0;
        const countStocks = countStocksQuery.rows[0]?.count || 0;
        const countBills = countBillsQuery.rows[0]?.count || 0;
        const countLedger = countLedgerQuery.rows[0]?.count || 0;
        const countStockReg = countStockRegQuery.rows[0]?.count || 0;
        const countFirmSettings = countFirmSettingsQuery.rows[0]?.count || 0;
        
        console.log(`Starting SQLite to MongoDB backup...`);
        console.log(`Data to be backed up: ${countFirms} firms, ${countUsers} users, ${countBills} bills, etc.`);
        
        // Clear existing MongoDB collections first - need to respect foreign key relationships
        await mongoPrisma.billSequences.deleteMany({});
        await mongoPrisma.ledger.deleteMany({}); // Delete ledger first due to relation with firms
        await mongoPrisma.stockReg.deleteMany({}); // Delete stockReg first due to relation with firms
        await mongoPrisma.firmSettings.deleteMany({}); // Delete firmSettings first due to relation with firms
        await mongoPrisma.firms.deleteMany({});
        await mongoPrisma.users.deleteMany({});
        await mongoPrisma.settings.deleteMany({});
        await mongoPrisma.requestLogs.deleteMany({});
        await mongoPrisma.parties.deleteMany({});
        await mongoPrisma.partyGsts.deleteMany({});
        await mongoPrisma.stocks.deleteMany({});
        await mongoPrisma.bills.deleteMany({});
        
        console.log(`Cleared existing MongoDB collections`);
        
        // First, we need to map SQLite firm IDs to MongoDB firm IDs
        const sqliteFirmsResult = await turso.execute({ sql: 'SELECT * FROM firms' });
        const sqliteFirmsData = sqliteFirmsResult.rows;
        const firmIdMap = new Map();
        
        // Backup firms first and create a mapping
        for (const firm of sqliteFirmsData) {
            const createdFirm = await mongoPrisma.firms.create({
                data: {
                    name: firm.name,
                    legalName: firm.legal_name,
                    address: firm.address,
                    city: firm.city,
                    state: firm.state,
                    country: firm.country || 'India',
                    pincode: firm.pincode,
                    phone: firm.phone_number,
                    secondaryPhone: firm.secondary_phone,
                    email: firm.email,
                    website: firm.website,
                    businessType: firm.business_type,
                    industryType: firm.industry_type,
                    establishmentYear: firm.establishment_year,
                    employeeCount: firm.employee_count,
                    registrationNumber: firm.registration_number,
                    registrationDate: firm.registration_date ? new Date(firm.registration_date) : undefined,
                    cinNumber: firm.cin_number,
                    panNumber: firm.pan_number,
                    gstNo: firm.gst_number,
                    taxId: firm.tax_id,
                    vatNumber: firm.vat_number,
                    bankAccountNumber: firm.bank_account_number,
                    bankName: firm.bank_name,
                    bankBranch: firm.bank_branch,
                    ifscCode: firm.ifsc_code,
                    paymentTerms: firm.payment_terms || 'Net 30',
                    licenseNumbers: firm.license_numbers,
                    insuranceDetails: firm.insurance_details,
                    currency: firm.currency || 'INR',
                    timezone: firm.timezone || 'Asia/Kolkata',
                    fiscalYearStart: firm.fiscal_year_start || 4,
                    invoicePrefix: firm.invoice_prefix || 'INV',
                    quotePrefix: firm.quote_prefix || 'QT',
                    poPrefix: firm.po_prefix || 'PO',
                    logoUrl: firm.logo_url,
                    invoiceTemplate: firm.invoice_template || 'standard',
                    enableEInvoice: firm.enable_e_invoice || 0,
                    code: firm.id.toString(), // Provide unique code to avoid unique constraint issue
                    createdAt: firm.created_at ? new Date(firm.created_at) : new Date(),
                    updatedAt: firm.updated_at ? new Date(firm.updated_at) : new Date(),
                    additionalGSTs: [],
                    v: 0,
                }
            });
            // Map the original SQLite ID to the new MongoDB ID
            firmIdMap.set(firm.id, createdFirm.id);
        }
        
        // Backup bill_sequences using mapped firm IDs
        const sqliteBillSeqsResult = await turso.execute({ sql: 'SELECT * FROM bill_sequences' });
        const sqliteBillSeqs = sqliteBillSeqsResult.rows;
        for (const seq of sqliteBillSeqs) {
            await mongoPrisma.billSequences.create({
                data: {
                    firmId: firmIdMap.get(seq.firm_id),
                    financialYear: seq.financial_year,
                    lastSequence: seq.last_sequence,
                    createdAt: new Date(seq.created_at),
                    updatedAt: new Date(seq.updated_at),
                    v: 0,
                }
            });
        }
        
        // Firms have already been backed up with bill_sequences, skipping duplicate creation
        
        // Create a user ID mapping
        const userIdMap = new Map();
        
        // Backup users
        const sqliteUsersResult = await turso.execute({ sql: 'SELECT * FROM users' });
        const sqliteUsersData = sqliteUsersResult.rows;
        for (const user of sqliteUsersData) {
            const createdUser = await mongoPrisma.users.create({
                data: {
                    email: user.email,
                    fullName: user.fullname || user.fullname,
                    username: user.username,
                    password: user.password,
                    firmId: user.firm_id ? firmIdMap.get(user.firm_id) : null,
                    role: user.role ? user.role.toString() : 'USER',
                    createdAt: user.created_at ? new Date(user.created_at) : new Date(),
                    updatedAt: user.updated_at ? new Date(user.updated_at) : new Date(),
                    activeSessions: [],
                    passwordHistory: [],
                    v: 0,
                }
            });
            // Map the original SQLite ID to the new MongoDB ID
            userIdMap.set(user.id, createdUser.id);
        }
        
        // Backup settings
        const sqliteSettingsResult = await turso.execute({ sql: 'SELECT * FROM settings' });
        const sqliteSettingsData = sqliteSettingsResult.rows;
        for (const setting of sqliteSettingsData) {
            await mongoPrisma.settings.create({
                data: {
                    settingKey: setting.setting_key,
                    settingValue: setting.setting_value,
                    description: setting.description,
                    createdAt: setting.created_at ? new Date(setting.created_at) : new Date(),
                    updatedAt: setting.updated_at ? new Date(setting.updated_at) : new Date(),
                    v: 0,
                }
            });
        }
        
        
        // Create a party ID mapping
        const partyIdMap = new Map();
        
        // Backup parties
        const sqlitePartiesResult = await turso.execute({ sql: 'SELECT * FROM parties' });
        const sqlitePartiesData = sqlitePartiesResult.rows;
        for (const party of sqlitePartiesData) {
            const createdParty = await mongoPrisma.parties.create({
                data: {
                    addr: party.addr || '',
                    contact: party.contact || '',
                    createdAt: party.created_at ? new Date(party.created_at) : new Date(),
                    firm: party.firm || 'Default Firm',
                    gstin: party.gstin || 'UNREGISTERED',
                    hasMultipleGSTs: party.has_multiple_gsts ? !!party.has_multiple_gsts : false,
                    pan: party.pan || '',
                    pin: party.pin || 0,
                    state: party.state || '',
                    stateCode: party.state_code || 0,
                    supply: party.supply,
                    updatedAt: party.updated_at ? new Date(party.updated_at) : new Date(),
                    usern: party.usern,
                    hasMultipleGsts: party.has_multiple_gsts || 0,
                    firmId: party.firm_id ? firmIdMap.get(party.firm_id) : null,
                    additionalGSTs: [],
                    billIds: [],
                    v: 0,
                }
            });
            // Map the original SQLite ID to the new MongoDB ID
            partyIdMap.set(party.id, createdParty.id);
        }
        
        // Backup party_gsts
        const sqlitePartyGstsResult = await turso.execute({ sql: 'SELECT * FROM party_gsts' });
        const sqlitePartyGstsData = sqlitePartyGstsResult.rows;
        for (const gsts of sqlitePartyGstsData) {
            await mongoPrisma.partyGsts.create({
                data: {
                    partyId: partyIdMap.get(gsts.party_id),
                    gstNumber: gsts.gst_number,
                    state: gsts.state,
                    stateCode: gsts.state_code,
                    locationName: gsts.location_name,
                    address: gsts.address,
                    city: gsts.city,
                    pincode: gsts.pincode,
                    contactPerson: gsts.contact_person,
                    contactNumber: gsts.contact_number,
                    isActive: gsts.is_active,
                    isDefault: gsts.is_default,
                    registrationType: gsts.registration_type,
                    validFrom: new Date(gsts.valid_from),
                    validTo: gsts.valid_to ? new Date(gsts.valid_to) : null,
                    lastUsedDate: gsts.last_used_date ? new Date(gsts.last_used_date) : null,
                    transactionCount: gsts.transaction_count,
                    v: 0,
                }
            });
        }
        
        // Create a stock ID mapping
        const stockIdMap = new Map();
        
        // Backup stocks
        const sqliteStocksResult = await turso.execute({ sql: 'SELECT * FROM stocks' });
        const sqliteStocksData = sqliteStocksResult.rows;
        for (const stock of sqliteStocksData) {
            const createdStock = await mongoPrisma.stocks.create({
                data: {
                    item: stock.item,
                    pno: stock.pno ? [stock.pno] : [],
                    oem: stock.oem || '',
                    hsn: stock.hsn,
                    qty: Math.round(stock.qty),
                    uom: stock.uom,
                    rate: Math.round(stock.rate),
                    grate: Math.round(stock.grate),
                    total: Math.round(stock.total),
                    mrp: stock.mrp,
                    batches: stock.batches || '',
                    firm: stock.firm || 'Default Firm',
                    user: stock.user,
                    createdAt: stock.created_at ? new Date(stock.created_at) : new Date(),
                    updatedAt: stock.updated_at ? new Date(stock.updated_at) : new Date(),
                    firmId: stock.firm_id ? firmIdMap.get(stock.firm_id) : null,
                    batch: stock.batches ? [stock.batches] : null,
                    v: 0,
                }
            });
            // Map the original SQLite ID to the new MongoDB ID
            stockIdMap.set(stock.id, createdStock.id);
        }
        
        // Create a bill ID mapping
        const billIdMap = new Map();
        
        // Backup bills
        const sqliteBillsResult = await turso.execute({ sql: 'SELECT * FROM bills' });
        const sqliteBillsData = sqliteBillsResult.rows;
        for (const bill of sqliteBillsData) {
            const createdBill = await mongoPrisma.bills.create({
                data: {
                    addr: bill.addr || '',
                    attachmentFileId: bill.attachment_file_id,
                    attachmentUrl: bill.attachment_url,
                    bdate: new Date(bill.bdate),
                    bno: bill.bno,
                    btype: bill.btype,
                    cgst: { value: bill.cgst || 0 },
                    consigneeAddress: bill.consignee_address,
                    consigneeGstin: bill.consignee_gstin,
                    consigneeName: bill.consignee_name,
                    consigneePin: bill.consignee_pin,
                    consigneeState: bill.consignee_state,
                    createdAt: bill.created_at ? new Date(bill.created_at) : new Date(),
                    disc: Math.round(bill.disc || 0),
                    dispatchThrough: bill.dispatch_through || '',
                    docketNo: bill.docket_no || '',
                    firm: bill.firm || 'Default Firm',
                    gstin: bill.gstin || 'UNREGISTERED',
                    gtot: { value: bill.gtot || 0 },
                    igst: { value: bill.igst || 0 },
                    narration: bill.narration,
                    ntot: Math.round(bill.ntot),
                    orderDate: bill.order_date ? new Date(bill.order_date) : null,
                    orderNo: bill.order_no || '',
                    oth_chg: [],
                    partyId: bill.party_id ? partyIdMap.get(bill.party_id) : null,
                    pin: bill.pin || 0,
                    rof: bill.rof || 0,
                    sgst: { value: bill.sgst || 0 },
                    state: bill.state,
                    status: bill.status || 'ACTIVE',
                    stockRegIds: [],
                    supply: bill.supply,
                    updatedAt: bill.updated_at ? new Date(bill.updated_at) : new Date(),
                    usern: bill.usern,
                    vehicleNo: bill.vehicle_no || '',
                    reverseCharge: bill.reverse_charge || 0,
                    stateCode: bill.state_code || null,
                    consigneeStateCode: bill.consignee_state_code || null,
                    cancellationReason: bill.cancellation_reason,
                    cancelledAt: bill.cancelled_at ? new Date(bill.cancelled_at) : null,
                    cancelledBy: bill.cancelled_by ? userIdMap.get(bill.cancelled_by) : null,
                    othChgJson: bill.oth_chg_json,
                    gstSelectionJson: bill.gst_selection_json,
                    firmId: bill.firm_id ? firmIdMap.get(bill.firm_id) : null,
                    v: 0,
                }
            });
            // Map the original SQLite ID to the new MongoDB ID
            billIdMap.set(bill.id, createdBill.id);
        }
        
        // Backup ledger
        const sqliteLedgerResult = await turso.execute({ sql: 'SELECT * FROM ledger' });
        const sqliteLedgerData = sqliteLedgerResult.rows;
        for (const ledgerEntry of sqliteLedgerData) {
            await mongoPrisma.ledger.create({
                data: {
                    voucherId: ledgerEntry.voucher_id,
                    voucherType: ledgerEntry.voucher_type,
                    voucherNo: ledgerEntry.voucher_no,
                    accountHead: ledgerEntry.account_head,
                    accountType: ledgerEntry.account_type,
                    debitAmount: ledgerEntry.debit_amount,
                    creditAmount: ledgerEntry.credit_amount,
                    narration: ledgerEntry.narration,
                    billId: ledgerEntry.bill_id ? billIdMap.get(ledgerEntry.bill_id) : null,
                    partyId: ledgerEntry.party_id ? partyIdMap.get(ledgerEntry.party_id) : null,
                    taxType: ledgerEntry.tax_type,
                    taxRate: ledgerEntry.tax_rate,
                    transactionDate: new Date(ledgerEntry.transaction_date),
                    createdBy: ledgerEntry.created_by,
                    firmId: firmIdMap.get(ledgerEntry.firm_id),
                    createdAt: ledgerEntry.created_at ? new Date(ledgerEntry.created_at) : new Date(),
                    updatedAt: ledgerEntry.updated_at ? new Date(ledgerEntry.updated_at) : new Date(),
                    v: 0,
                }
            });
        }
        
        // Backup stock_reg
        const sqliteStockRegResult = await turso.execute({ sql: 'SELECT * FROM stock_reg' });
        const sqliteStockRegData = sqliteStockRegResult.rows;
        for (const stockReg of sqliteStockRegData) {
            await mongoPrisma.stockReg.create({
                data: {
                    type: stockReg.type,
                    bno: stockReg.bno,
                    bdate: new Date(stockReg.bdate),
                    supply: stockReg.supply,
                    item: stockReg.item,
                    itemNarration: stockReg.item_narration,
                    pno: stockReg.pno,
                    batch: stockReg.batch,
                    oem: stockReg.oem,
                    hsn: stockReg.hsn,
                    qty: stockReg.qty,
                    qtyh: stockReg.qtyh,
                    uom: stockReg.uom,
                    rate: stockReg.rate,
                    grate: stockReg.grate,
                    cgst: stockReg.cgst || 0,
                    sgst: stockReg.sgst || 0,
                    igst: stockReg.igst || 0,
                    disc: stockReg.disc || 0,
                    discamt: stockReg.discamt || 0,
                    total: stockReg.total,
                    mrp: stockReg.mrp,
                    expiryDate: stockReg.expiry_date ? new Date(stockReg.expiry_date) : null,
                    project: stockReg.project,
                    user: stockReg.user,
                    firm: stockReg.firm || 'Default Firm',
                    stockId: stockReg.stock_id ? stockIdMap.get(stockReg.stock_id) : null,
                    billId: stockReg.bill_id ? billIdMap.get(stockReg.bill_id) : null,
                    createdAt: stockReg.created_at ? new Date(stockReg.created_at) : new Date(),
                    updatedAt: stockReg.updated_at ? new Date(stockReg.updated_at) : new Date(),
                    firmId: stockReg.firm_id ? firmIdMap.get(stockReg.firm_id) : null,
                    v: 0,
                }
            });
        }
        
        // Backup request_logs
        const sqliteRequestLogsResult = await turso.execute({ sql: 'SELECT * FROM request_logs' });
        const sqliteRequestLogsData = sqliteRequestLogsResult.rows;
        for (const log of sqliteRequestLogsData) {
            await mongoPrisma.requestLogs.create({
                data: {
                    method: log.method,
                    url: log.url,
                    ip: log.ip,
                    username: log.username,
                    userAgent: log.user_agent,
                    timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
                    v: 0,
                }
            });
        }
        
        // Backup firm_settings
        const sqliteFirmSettingsResult = await turso.execute({ sql: 'SELECT * FROM firm_settings' });
        const sqliteFirmSettingsData = sqliteFirmSettingsResult.rows;
        for (const firmSetting of sqliteFirmSettingsData) {
            await mongoPrisma.firmSettings.create({
                data: {
                    firmId: firmIdMap.get(firmSetting.firm_id),
                    settingKey: firmSetting.setting_key,
                    settingValue: firmSetting.setting_value,
                    description: firmSetting.description,
                    createdAt: firmSetting.created_at ? new Date(firmSetting.created_at) : new Date(),
                    updatedAt: firmSetting.updated_at ? new Date(firmSetting.updated_at) : new Date(),
                    v: 0,
                }
            });
        }
        
        // Disconnect from MongoDB
        await mongoPrisma.$disconnect();
        
        res.json({
            success: true,
            message: 'SQLite to MongoDB backup completed successfully',
            dataCounts: {
                firms: countFirms,
                users: countUsers,
                bills: countBills,
                parties: countParties,
                stocks: countStocks,
                ledger: countLedger,
                stockReg: countStockReg,
                settings: countSettings,
                billSequences: countBillSequences,
                requestLogs: countRequestLogs,
                partyGsts: countPartyGsts,
                firmSettings: countFirmSettings
            }
        });
        
    } catch (error) {
        console.error('SQLite to MongoDB backup error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};