const db = require('../config/db');

// Get all settings
exports.getAllSettings = (req, res) => {
    try {
        // Get global settings
        const globalSettings = db.prepare('SELECT * FROM settings ORDER BY setting_key').all();
        
        // If user has firm access, also get firm-specific settings
        let firmSettings = [];
        if (req.user && req.user.firm_id) {
            firmSettings = db.prepare('SELECT * FROM firm_settings WHERE firm_id = ? ORDER BY setting_key').all(req.user.firm_id);
        }
        
        res.json({ 
            global_settings: globalSettings,
            firm_settings: firmSettings
        });
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get specific setting
exports.getSetting = (req, res) => {
    try {
        const { key } = req.params;
        
        // If user has firm access, check for firm-specific setting first
        if (req.user && req.user.firm_id) {
            const firmSetting = db.prepare(
                'SELECT * FROM firm_settings WHERE firm_id = ? AND setting_key = ?'
            ).get(req.user.firm_id, key);
            
            if (firmSetting) {
                res.json(firmSetting);
                return;
            }
        }
        
        // Fall back to global setting
        const setting = db.prepare('SELECT * FROM settings WHERE setting_key = ?').get(key);
        
        if (!setting) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        
        res.json(setting);
    } catch (err) {
        console.error('Error fetching setting:', err);
        res.status(500).json({ error: err.message });
    }
};

// Update specific setting
exports.updateSetting = (req, res) => {
    try {
        const { key } = req.params;
        const { setting_value, description } = req.body;
        
        if (!setting_value) {
            return res.status(400).json({ error: 'Setting value is required' });
        }
        
        // Check if user has firm access (for firm-specific settings)
        if (req.user && req.user.firm_id) {
            // Update or create firm-specific setting
            const existingFirmSetting = db.prepare(
                'SELECT * FROM firm_settings WHERE firm_id = ? AND setting_key = ?'
            ).get(req.user.firm_id, key);
            
            if (existingFirmSetting) {
                // Update existing firm setting
                const result = db.prepare(`
                    UPDATE firm_settings 
                    SET setting_value = ?, description = ?, updated_at = ?
                    WHERE firm_id = ? AND setting_key = ?
                `).run(setting_value, description || existingFirmSetting.description, new Date().toISOString(), req.user.firm_id, key);
                
                if (result.changes === 0) {
                    return res.status(400).json({ error: 'No changes made to setting' });
                }
                
                // Return updated setting
                const updatedSetting = db.prepare('SELECT * FROM firm_settings WHERE firm_id = ? AND setting_key = ?').get(req.user.firm_id, key);
                res.json({ message: 'Setting updated successfully', setting: updatedSetting });
            } else {
                // Create new firm setting
                const result = db.prepare(`
                    INSERT INTO firm_settings (firm_id, setting_key, setting_value, description, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                    req.user.firm_id, 
                    key, 
                    setting_value, 
                    description || `Firm-specific ${key} setting`, 
                    new Date().toISOString(), 
                    new Date().toISOString()
                );
                
                if (result.changes === 0) {
                    return res.status(400).json({ error: 'Failed to create setting' });
                }
                
                // Return newly created setting
                const newSetting = db.prepare('SELECT * FROM firm_settings WHERE firm_id = ? AND setting_key = ?').get(req.user.firm_id, key);
                res.json({ message: 'Setting created successfully', setting: newSetting });
            }
        } else {
            // Update global setting if no firm context
            const existingSetting = db.prepare('SELECT * FROM settings WHERE setting_key = ?').get(key);
            if (!existingSetting) {
                return res.status(404).json({ error: 'Setting not found' });
            }
            
            // Update the setting
            const result = db.prepare(`
                UPDATE settings 
                SET setting_value = ?, description = ?, updated_at = ?
                WHERE setting_key = ?
            `).run(setting_value, description || existingSetting.description, new Date().toISOString(), key);
            
            if (result.changes === 0) {
                return res.status(400).json({ error: 'No changes made to setting' });
            }
            
            // Return updated setting
            const updatedSetting = db.prepare('SELECT * FROM settings WHERE setting_key = ?').get(key);
            res.json({ message: 'Setting updated successfully', setting: updatedSetting });
        }
    } catch (err) {
        console.error('Error updating setting:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get GST status
exports.getGstStatus = (req, res) => {
    try {
        // Check if user has firm access (for firm-specific settings)
        if (req.user && req.user.firm_id) {
            // First check for firm-specific GST setting
            const firmSetting = db.prepare(
                'SELECT setting_value FROM firm_settings WHERE firm_id = ? AND setting_key = ?'
            ).get(req.user.firm_id, 'gst_enabled');
            
            if (firmSetting) {
                // Use firm-specific setting
                const gstEnabled = firmSetting.setting_value === 'true';
                res.json({ gst_enabled: gstEnabled });
                return;
            }
        }
        
        // Fall back to global setting if no firm-specific setting exists
        const setting = db.prepare('SELECT setting_value FROM settings WHERE setting_key = ?').get('gst_enabled');
        const gstEnabled = setting ? setting.setting_value === 'true' : true; // Default to true if not found
        res.json({ gst_enabled: gstEnabled });
    } catch (err) {
        console.error('Error fetching GST status:', err);
        res.status(500).json({ error: err.message });
    }
};

// Toggle GST status
exports.toggleGstStatus = (req, res) => {
    try {
        const { enabled } = req.body;
        
        if (enabled === undefined) {
            return res.status(400).json({ error: 'Enabled parameter is required (true/false)' });
        }
        
        const settingValue = enabled ? 'true' : 'false';
        
        // Check if user has firm access (for firm-specific settings)
        if (req.user && req.user.firm_id) {
            // Update or create firm-specific GST setting
            const existingFirmSetting = db.prepare(
                'SELECT * FROM firm_settings WHERE firm_id = ? AND setting_key = ?'
            ).get(req.user.firm_id, 'gst_enabled');
            
            if (existingFirmSetting) {
                // Update existing firm setting
                db.prepare(`
                    UPDATE firm_settings 
                    SET setting_value = ?, updated_at = ?
                    WHERE firm_id = ? AND setting_key = ?
                `).run(settingValue, new Date().toISOString(), req.user.firm_id, 'gst_enabled');
            } else {
                // Create new firm setting
                db.prepare(`
                    INSERT INTO firm_settings (firm_id, setting_key, setting_value, description, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                    req.user.firm_id, 
                    'gst_enabled', 
                    settingValue, 
                    'Firm-specific GST calculation toggle', 
                    new Date().toISOString(), 
                    new Date().toISOString()
                );
            }
        } else {
            // Update global setting if no firm context
            const existingSetting = db.prepare('SELECT * FROM settings WHERE setting_key = ?').get('gst_enabled');
            
            if (existingSetting) {
                // Update existing setting
                db.prepare(`
                    UPDATE settings 
                    SET setting_value = ?, updated_at = ?
                    WHERE setting_key = ?
                `).run(settingValue, new Date().toISOString(), 'gst_enabled');
            } else {
                // Create new setting
                db.prepare(`
                    INSERT INTO settings (setting_key, setting_value, description, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                `).run('gst_enabled', settingValue, 'Global GST calculation toggle', new Date().toISOString(), new Date().toISOString());
            }
        }
        
        res.json({ message: `GST has been ${enabled ? 'enabled' : 'disabled'} successfully`, gst_enabled: enabled });
    } catch (err) {
        console.error('Error updating GST status:', err);
        res.status(500).json({ error: err.message });
    }
};