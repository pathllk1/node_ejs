const db = require('../config/db');

// Get all settings
exports.getAllSettings = (req, res) => {
    try {
        const settings = db.prepare('SELECT * FROM settings ORDER BY setting_key').all();
        res.json({ settings });
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get specific setting
exports.getSetting = (req, res) => {
    try {
        const { key } = req.params;
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
        
        // Check if setting exists
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
    } catch (err) {
        console.error('Error updating setting:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get GST status
exports.getGstStatus = (req, res) => {
    try {
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
        
        // Check if setting exists
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
        
        res.json({ message: `GST has been ${enabled ? 'enabled' : 'disabled'} successfully`, gst_enabled: enabled });
    } catch (err) {
        console.error('Error updating GST status:', err);
        res.status(500).json({ error: err.message });
    }
};