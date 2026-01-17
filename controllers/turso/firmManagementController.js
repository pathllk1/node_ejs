// Import database
const turso = require('../../config/turso');

// Create firm
exports.createFirm = async (req, res) => {
    // Validate that admin role is properly configured
    if (!process.env.ADMIN_ROLE_VALUE) {
        console.error('CRITICAL ERROR: ADMIN_ROLE_VALUE environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE);
    const currentUserResult = await turso.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [req.user.id]
    });
    const currentUser = currentUserResult.rows[0];
    if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    
    try {
        const { name, legal_name, address, city, state, country, pincode, phone_number, secondary_phone, email, website, business_type, industry_type, establishment_year, employee_count, registration_number, registration_date, cin_number, pan_number, gst_number, tax_id, vat_number, bank_account_number, bank_name, bank_branch, ifsc_code, payment_terms, status, license_numbers, insurance_details, currency, timezone, fiscal_year_start, invoice_prefix, quote_prefix, po_prefix, logo_url, invoice_template, enable_e_invoice } = req.body;
        
        // Convert boolean to integer for enable_e_invoice
        const enableEInvoiceInt = enable_e_invoice === true ? 1 : (enable_e_invoice === false ? 0 : enable_e_invoice);
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({ error: 'Firm name is required' });
        }
        
        // Check if firm with same name already exists
        const existingFirmResult = await turso.execute({
            sql: 'SELECT * FROM firms WHERE name = ?',
            args: [name]
        });
        const existingFirm = existingFirmResult.rows[0];
        if (existingFirm) {
            return res.status(409).json({ error: 'A firm with this name already exists' });
        }
        
        const now = new Date().toISOString();
        
        const result = await turso.execute({
            sql: `
                INSERT INTO firms (
                    name, legal_name, address, city, state, country, pincode,
                    phone_number, secondary_phone, email, website, business_type, industry_type,
                    establishment_year, employee_count, registration_number, registration_date,
                    cin_number, pan_number, gst_number, tax_id, vat_number,
                    bank_account_number, bank_name, bank_branch, ifsc_code, payment_terms,
                    status, license_numbers, insurance_details, currency, timezone,
                    fiscal_year_start, invoice_prefix, quote_prefix, po_prefix,
                    logo_url, invoice_template, enable_e_invoice,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                name, legal_name, address, city, state, country, pincode,
                phone_number, secondary_phone, email, website, business_type, industry_type,
                establishment_year, employee_count, registration_number, registration_date,
                cin_number, pan_number, gst_number, tax_id, vat_number,
                bank_account_number, bank_name, bank_branch, ifsc_code, payment_terms,
                status, license_numbers, insurance_details, currency, timezone,
                fiscal_year_start, invoice_prefix, quote_prefix, po_prefix,
                logo_url, invoice_template, enableEInvoiceInt,
                now, now
            ]
        });
        
        res.status(201).json({ 
            message: 'Firm created successfully', 
            firmId: Number(result.lastInsertRowid) 
        });
    } catch (err) {
        console.error('Error creating firm:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all firms
exports.getAllFirms = async (req, res) => {
    // Validate that admin role is properly configured
    if (!process.env.ADMIN_ROLE_VALUE) {
        console.error('CRITICAL ERROR: ADMIN_ROLE_VALUE environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE);
    const currentUserResult = await turso.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [req.user.id]
    });
    const currentUser = currentUserResult.rows[0];
    if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    
    try {
        const firmsResult = await turso.execute({
            sql: 'SELECT * FROM firms ORDER BY created_at DESC'
        });
        const firms = firmsResult.rows;
        
        // Convert BigInt values to numbers in firms
        const processedFirms = firms.map(firm => {
            const processedFirm = {};
            for (const [key, value] of Object.entries(firm)) {
                if (typeof value === 'bigint') {
                    processedFirm[key] = Number(value);
                } else {
                    processedFirm[key] = value;
                }
            }
            return processedFirm;
        });
        
        res.json({ firms: processedFirms });
    } catch (err) {
        console.error('Error fetching firms:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get firm by ID
exports.getFirm = async (req, res) => {
    // Validate that admin role is properly configured
    if (!process.env.ADMIN_ROLE_VALUE) {
        console.error('CRITICAL ERROR: ADMIN_ROLE_VALUE environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE);
    const currentUserResult = await turso.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [req.user.id]
    });
    const currentUser = currentUserResult.rows[0];
    if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    
    try {
        const { id } = req.params;
        const firmResult = await turso.execute({
            sql: 'SELECT * FROM firms WHERE id = ?',
            args: [id]
        });
        const firm = firmResult.rows[0];
        
        if (!firm) {
            return res.status(404).json({ error: 'Firm not found' });
        }
        
        // Convert BigInt values to numbers in firm
        const processedFirm = {};
        for (const [key, value] of Object.entries(firm)) {
            if (typeof value === 'bigint') {
                processedFirm[key] = Number(value);
            } else {
                processedFirm[key] = value;
            }
        }
        
        res.json({ firm: processedFirm });
    } catch (err) {
        console.error('Error fetching firm:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update firm
exports.updateFirm = async (req, res) => {
    // Validate that admin role is properly configured
    if (!process.env.ADMIN_ROLE_VALUE) {
        console.error('CRITICAL ERROR: ADMIN_ROLE_VALUE environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE);
    const currentUserResult = await turso.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [req.user.id]
    });
    const currentUser = currentUserResult.rows[0];
    if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    
    try {
        const { id } = req.params;
        const { name, legal_name, address, city, state, country, pincode, phone_number, secondary_phone, email, website, business_type, industry_type, establishment_year, employee_count, registration_number, registration_date, cin_number, pan_number, gst_number, tax_id, vat_number, bank_account_number, bank_name, bank_branch, ifsc_code, payment_terms, status, license_numbers, insurance_details, currency, timezone, fiscal_year_start, invoice_prefix, quote_prefix, po_prefix, logo_url, invoice_template, enable_e_invoice } = req.body;
        
        // Convert boolean to integer for enable_e_invoice
        const enableEInvoiceInt = enable_e_invoice === true ? 1 : (enable_e_invoice === false ? 0 : enable_e_invoice);
        
        // Check if firm exists
        const existingFirmResult = await turso.execute({
            sql: 'SELECT * FROM firms WHERE id = ?',
            args: [id]
        });
        const existingFirm = existingFirmResult.rows[0];
        if (!existingFirm) {
            return res.status(404).json({ error: 'Firm not found' });
        }
        
        // Check if another firm with same name exists (excluding current firm)
        if (name) {
            const sameNameFirmResult = await turso.execute({
                sql: 'SELECT * FROM firms WHERE name = ? AND id != ?',
                args: [name, id]
            });
            const sameNameFirm = sameNameFirmResult.rows[0];
            if (sameNameFirm) {
                return res.status(409).json({ error: 'Another firm with this name already exists' });
            }
        }
        
        const now = new Date().toISOString();
        
        const result = await turso.execute({
            sql: `
                UPDATE firms 
                SET name = COALESCE(?, name), 
                    legal_name = COALESCE(?, legal_name),
                    address = COALESCE(?, address),
                    city = COALESCE(?, city),
                    state = COALESCE(?, state),
                    country = COALESCE(?, country),
                    pincode = COALESCE(?, pincode),
                    phone_number = COALESCE(?, phone_number),
                    secondary_phone = COALESCE(?, secondary_phone),
                    email = COALESCE(?, email),
                    website = COALESCE(?, website),
                    business_type = COALESCE(?, business_type),
                    industry_type = COALESCE(?, industry_type),
                    establishment_year = COALESCE(?, establishment_year),
                    employee_count = COALESCE(?, employee_count),
                    registration_number = COALESCE(?, registration_number),
                    registration_date = COALESCE(?, registration_date),
                    cin_number = COALESCE(?, cin_number),
                    pan_number = COALESCE(?, pan_number),
                    gst_number = COALESCE(?, gst_number),
                    tax_id = COALESCE(?, tax_id),
                    vat_number = COALESCE(?, vat_number),
                    bank_account_number = COALESCE(?, bank_account_number),
                    bank_name = COALESCE(?, bank_name),
                    bank_branch = COALESCE(?, bank_branch),
                    ifsc_code = COALESCE(?, ifsc_code),
                    payment_terms = COALESCE(?, payment_terms),
                    status = COALESCE(?, status),
                    license_numbers = COALESCE(?, license_numbers),
                    insurance_details = COALESCE(?, insurance_details),
                    currency = COALESCE(?, currency),
                    timezone = COALESCE(?, timezone),
                    fiscal_year_start = COALESCE(?, fiscal_year_start),
                    invoice_prefix = COALESCE(?, invoice_prefix),
                    quote_prefix = COALESCE(?, quote_prefix),
                    po_prefix = COALESCE(?, po_prefix),
                    logo_url = COALESCE(?, logo_url),
                    invoice_template = COALESCE(?, invoice_template),
                    enable_e_invoice = COALESCE(?, enable_e_invoice),
                    updated_at = ?
                WHERE id = ?
            `,
            args: [
                name, 
                legal_name, 
                address, 
                city, 
                state, 
                country, 
                pincode, 
                phone_number, 
                secondary_phone, 
                email, 
                website, 
                business_type, 
                industry_type, 
                establishment_year, 
                employee_count, 
                registration_number, 
                registration_date, 
                cin_number, 
                pan_number, 
                gst_number, 
                tax_id, 
                vat_number, 
                bank_account_number, 
                bank_name, 
                bank_branch, 
                ifsc_code, 
                payment_terms, 
                status, 
                license_numbers, 
                insurance_details, 
                currency, 
                timezone, 
                fiscal_year_start, 
                invoice_prefix, 
                quote_prefix, 
                po_prefix, 
                logo_url, 
                invoice_template, 
                enableEInvoiceInt, 
                now, 
                id
            ]
        });
        
        if (result.rowsAffected === 0) {
            return res.status(400).json({ error: 'No changes made to firm' });
        }
        
        res.json({ message: 'Firm updated successfully' });
    } catch (err) {
        console.error('Error updating firm:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete firm
exports.deleteFirm = async (req, res) => {
    // Validate that admin role is properly configured
    if (!process.env.ADMIN_ROLE_VALUE) {
        console.error('CRITICAL ERROR: ADMIN_ROLE_VALUE environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE);
    const currentUserResult = await turso.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [req.user.id]
    });
    const currentUser = currentUserResult.rows[0];
    if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    
    try {
        const { id } = req.params;
        
        // Check if firm exists
        const existingFirmResult = await turso.execute({
            sql: 'SELECT * FROM firms WHERE id = ?',
            args: [id]
        });
        const existingFirm = existingFirmResult.rows[0];
        if (!existingFirm) {
            return res.status(404).json({ error: 'Firm not found' });
        }
        
        // Check if firm has associated users
        const firmUsersResult = await turso.execute({
            sql: 'SELECT COUNT(*) as count FROM users WHERE firm_id = ?',
            args: [id]
        });
        const firmUsers = firmUsersResult.rows[0];
        if (firmUsers.count > 0) {
            return res.status(400).json({ error: 'Cannot delete firm with associated users. Remove users first.' });
        }
        
        // Check if firm has associated data (stocks, bills, parties, etc.)
        const firmStocksResult = await turso.execute({
            sql: 'SELECT COUNT(*) as count FROM stocks WHERE firm_id = ?',
            args: [id]
        });
        const firmBillsResult = await turso.execute({
            sql: 'SELECT COUNT(*) as count FROM bills WHERE firm_id = ?',
            args: [id]
        });
        const firmPartiesResult = await turso.execute({
            sql: 'SELECT COUNT(*) as count FROM parties WHERE firm_id = ?',
            args: [id]
        });
        
        const firmStocks = firmStocksResult.rows[0];
        const firmBills = firmBillsResult.rows[0];
        const firmParties = firmPartiesResult.rows[0];
        
        if (firmStocks.count > 0 || firmBills.count > 0 || firmParties.count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete firm with associated data. Remove all related data first.',
                details: {
                    stocks: firmStocks.count,
                    bills: firmBills.count,
                    parties: firmParties.count
                }
            });
        }
        
        // Delete the firm
        const result = await turso.execute({
            sql: 'DELETE FROM firms WHERE id = ?',
            args: [id]
        });
        
        if (result.rowsAffected === 0) {
            return res.status(400).json({ error: 'No firm was deleted' });
        }
        
        res.json({ message: 'Firm deleted successfully' });
    } catch (err) {
        console.error('Error deleting firm:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Assign user to firm
exports.assignUserToFirm = async (req, res) => {
    // Validate that admin role is properly configured
    if (!process.env.ADMIN_ROLE_VALUE) {
        console.error('CRITICAL ERROR: ADMIN_ROLE_VALUE environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE);
    const currentUserResult = await turso.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [req.user.id]
    });
    const currentUser = currentUserResult.rows[0];
    if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    
    try {
        const { userId, firmId } = req.body;
        
        // Validate inputs
        if (!userId || !firmId) {
            return res.status(400).json({ error: 'User ID and Firm ID are required' });
        }
        
        // Check if user exists
        const userResult = await turso.execute({
            sql: 'SELECT * FROM users WHERE id = ?',
            args: [userId]
        });
        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if firm exists
        const firmResult = await turso.execute({
            sql: 'SELECT * FROM firms WHERE id = ?',
            args: [firmId]
        });
        const firm = firmResult.rows[0];
        if (!firm) {
            return res.status(404).json({ error: 'Firm not found' });
        }
        
        // Check if user is already assigned to a different firm
        const currentUserFirmResult = await turso.execute({
            sql: 'SELECT firm_id FROM users WHERE id = ?',
            args: [userId]
        });
        const currentUserFirm = currentUserFirmResult.rows[0];
        if (currentUserFirm.firm_id && currentUserFirm.firm_id != firmId) {
            // If user is already assigned to another firm, we might want to confirm the reassignment
            console.log(`User ${userId} was previously assigned to firm ${currentUserFirm.firm_id}, reassigning to ${firmId}`);
        }
        
        // Assign user to firm
        const result = await turso.execute({
            sql: 'UPDATE users SET firm_id = ? WHERE id = ?',
            args: [firmId, userId]
        });
        
        if (result.rowsAffected === 0) {
            return res.status(400).json({ error: 'Failed to assign user to firm' });
        }
        
        res.json({ message: 'User assigned to firm successfully' });
    } catch (err) {
        console.error('Error assigning user to firm:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all users with their assigned firms
exports.getAllUsersWithFirms = async (req, res) => {
    // Validate that admin role is properly configured
    if (!process.env.ADMIN_ROLE_VALUE) {
        console.error('CRITICAL ERROR: ADMIN_ROLE_VALUE environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE);
    const currentUserResult = await turso.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [req.user.id]
    });
    const currentUser = currentUserResult.rows[0];
    if (!currentUser || !currentUser.role || currentUser.role !== adminRoleValue) {
        return res.status(403).json({ error: 'You are not permitted to perform this action' });
    }
    
    try {
        const usersResult = await turso.execute({
            sql: `
                SELECT 
                    u.id,
                    u.fullname,
                    u.username,
                    u.email,
                    u.firm_id,
                    f.name as firm_name
                FROM users u
                LEFT JOIN firms f ON u.firm_id = f.id
                ORDER BY u.fullname ASC
            `
        });
        const users = usersResult.rows;
        
        // Convert BigInt values to numbers in users
        const processedUsers = users.map(user => {
            const processedUser = {};
            for (const [key, value] of Object.entries(user)) {
                if (typeof value === 'bigint') {
                    processedUser[key] = Number(value);
                } else {
                    processedUser[key] = value;
                }
            }
            return processedUser;
        });
        
        res.json({ users: processedUsers });
    } catch (err) {
        console.error('Error fetching users with firms:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};