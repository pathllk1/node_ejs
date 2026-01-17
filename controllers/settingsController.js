const db = require('../config/db');
const { verifyFirmAccess } = require('../middleware/firmMiddleware');

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