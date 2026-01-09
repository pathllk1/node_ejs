const db = require('../config/db');

// Get all firms
exports.getAllFirms = (req, res) => {
    try {
        // Check if current user has admin role - check directly from database
        const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE || '');
        const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!currentUser || currentUser.role !== adminRoleValue) {
            return res.status(403).json({ error: 'You are not permitted to perform this action' });
        }
        
        const firms = db.prepare('SELECT * FROM firms ORDER BY created_at DESC').all();
        res.json({ firms });
    } catch (err) {
        console.error('Error fetching firms:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get firm by ID
exports.getFirm = (req, res) => {
    try {
        // Check if current user has admin role - check directly from database
        const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE || '');
        const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!currentUser || currentUser.role !== adminRoleValue) {
            return res.status(403).json({ error: 'You are not permitted to perform this action' });
        }
        
        const { id } = req.params;
        const firm = db.prepare('SELECT * FROM firms WHERE id = ?').get(id);
        
        if (!firm) {
            return res.status(404).json({ error: 'Firm not found' });
        }
        
        res.json(firm);
    } catch (err) {
        console.error('Error fetching firm:', err);
        res.status(500).json({ error: err.message });
    }
};

// Create firm
exports.createFirm = (req, res) => {
    try {
        const { name, address, contact_info } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Firm name is required' });
        }
        
        // Check if current user has admin role - check directly from database
        const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE || '');
        const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!currentUser || currentUser.role !== adminRoleValue) {
            return res.status(403).json({ error: 'You are not permitted to perform this action' });
        }
        
        // Check if firm already exists
        const existingFirm = db.prepare('SELECT * FROM firms WHERE name = ?').get(name);
        if (existingFirm) {
            return res.status(409).json({ error: 'Firm with this name already exists' });
        }
        
        const now = new Date().toISOString();
        
        const result = db.prepare(`
            INSERT INTO firms (name, address, contact_info, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(name, address || null, contact_info || null, now, now);
        
        res.json({ id: result.lastInsertRowid, message: 'Firm created successfully' });
    } catch (err) {
        console.error('Error creating firm:', err);
        res.status(500).json({ error: err.message });
    }
};

// Update firm
exports.updateFirm = (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, contact_info } = req.body;
        
        // Check if firm exists
        const existingFirm = db.prepare('SELECT * FROM firms WHERE id = ?').get(id);
        if (!existingFirm) {
            return res.status(404).json({ error: 'Firm not found' });
        }
        
        // Check if another firm with same name exists (excluding current firm)
        if (name) {
            const sameNameFirm = db.prepare('SELECT * FROM firms WHERE name = ? AND id != ?').get(name, id);
            if (sameNameFirm) {
                return res.status(409).json({ error: 'Another firm with this name already exists' });
            }
        }
        
        const now = new Date().toISOString();
        
        const result = db.prepare(`
            UPDATE firms 
            SET name = COALESCE(?, name), address = COALESCE(?, address), contact_info = COALESCE(?, contact_info), updated_at = ?
            WHERE id = ?
        `).run(name, address, contact_info, now, id);
        
        if (result.changes === 0) {
            return res.status(400).json({ error: 'No changes made to firm' });
        }
        
        res.json({ message: 'Firm updated successfully' });
    } catch (err) {
        console.error('Error updating firm:', err);
        res.status(500).json({ error: err.message });
    }
};

// Delete firm
exports.deleteFirm = (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if firm exists
        const existingFirm = db.prepare('SELECT * FROM firms WHERE id = ?').get(id);
        if (!existingFirm) {
            return res.status(404).json({ error: 'Firm not found' });
        }
        
        // Check if any users are associated with this firm
        const usersCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE firm_id = ?').get(id).count;
        if (usersCount > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete firm because it has users associated with it. Reassign users to another firm first.' 
            });
        }
        
        const result = db.prepare('DELETE FROM firms WHERE id = ?').run(id);
        
        if (result.changes === 0) {
            return res.status(400).json({ error: 'Could not delete firm' });
        }
        
        res.json({ message: 'Firm deleted successfully' });
    } catch (err) {
        console.error('Error deleting firm:', err);
        res.status(500).json({ error: err.message });
    }
};

// Assign user to firm
exports.assignUserToFirm = (req, res) => {
    try {
        const { userId, firmId } = req.body;
        
        if (!userId || !firmId) {
            return res.status(400).json({ error: 'User ID and Firm ID are required' });
        }
        
        // Check if user exists
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if current user has admin role - check directly from database
        const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE || '');
        const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!currentUser || currentUser.role !== adminRoleValue) {
            return res.status(403).json({ error: 'You are not permitted to perform this action' });
        }
        
        // Check if firm exists
        const firm = db.prepare('SELECT * FROM firms WHERE id = ?').get(firmId);
        if (!firm) {
            return res.status(404).json({ error: 'Firm not found' });
        }
        
        const result = db.prepare('UPDATE users SET firm_id = ? WHERE id = ?').run(firmId, userId);
        
        if (result.changes === 0) {
            return res.status(400).json({ error: 'Could not assign user to firm' });
        }
        
        res.json({ message: 'User assigned to firm successfully' });
    } catch (err) {
        console.error('Error assigning user to firm:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get all users with their firm assignments
exports.getAllUsersWithFirms = (req, res) => {
    try {
        // Check if current user has admin role - check directly from database
        const adminRoleValue = parseInt(process.env.ADMIN_ROLE_VALUE || '');
        const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!currentUser || currentUser.role !== adminRoleValue) {
            return res.status(403).json({ error: 'You are not permitted to perform this action' });
        }
        
        const users = db.prepare(`
            SELECT u.id, u.fullname, u.username, u.email, u.created_at, u.updated_at, f.id as firm_id, f.name as firm_name
            FROM users u
            LEFT JOIN firms f ON u.firm_id = f.id
            ORDER BY u.created_at DESC
        `).all();
        
        res.json({ users });
    } catch (err) {
        console.error('Error fetching users with firms:', err);
        res.status(500).json({ error: err.message });
    }
};