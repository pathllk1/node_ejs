const turso = require('../../config/turso');
const { verifyFirmAccess } = require('../middleware/firmMiddleware');

// Get all settings
exports.getAllSettings = async (req, res) => {
    try {
        const settingsResult = await turso.execute({
            sql: 'SELECT * FROM settings ORDER BY setting_key'
        });
        const settings = settingsResult.rows;
        
        // Convert BigInt values to numbers in settings
        const processedSettings = settings.map(setting => {
            const processedSetting = {};
            for (const [key, value] of Object.entries(setting)) {
                if (typeof value === 'bigint') {
                    processedSetting[key] = Number(value);
                } else {
                    processedSetting[key] = value;
                }
            }
            return processedSetting;
        });
        
        res.json({ settings: processedSettings });
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get specific setting
exports.getSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const settingResult = await turso.execute({
            sql: 'SELECT * FROM settings WHERE setting_key = ?',
            args: [key]
        });
        const setting = settingResult.rows[0];
        
        if (!setting) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        
        // Convert BigInt values to numbers in setting
        const processedSetting = {};
        for (const [settingKey, value] of Object.entries(setting)) {
            if (typeof value === 'bigint') {
                processedSetting[settingKey] = Number(value);
            } else {
                processedSetting[settingKey] = value;
            }
        }
        
        res.json(processedSetting);
    } catch (err) {
        console.error('Error fetching setting:', err);
        res.status(500).json({ error: err.message });
    }
};

// Update specific setting
exports.updateSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const { setting_value, description } = req.body;
        
        if (!setting_value) {
            return res.status(400).json({ error: 'Setting value is required' });
        }
        
        // Check if setting exists
        const existingSettingResult = await turso.execute({
            sql: 'SELECT * FROM settings WHERE setting_key = ?',
            args: [key]
        });
        const existingSetting = existingSettingResult.rows[0];
        if (!existingSetting) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        
        // Update the setting
        const result = await turso.execute({
            sql: `
                UPDATE settings 
                SET setting_value = ?, description = ?, updated_at = ?
                WHERE setting_key = ?
            `,
            args: [setting_value, description || existingSetting.description, new Date().toISOString(), key]
        });
        
        if (result.rowsAffected === 0) {
            return res.status(400).json({ error: 'No changes made to setting' });
        }
        
        // Return updated setting
        const updatedSettingResult = await turso.execute({
            sql: 'SELECT * FROM settings WHERE setting_key = ?',
            args: [key]
        });
        const updatedSetting = updatedSettingResult.rows[0];
        
        // Convert BigInt values to numbers in updated setting
        const processedUpdatedSetting = {};
        for (const [settingKey, value] of Object.entries(updatedSetting)) {
            if (typeof value === 'bigint') {
                processedUpdatedSetting[settingKey] = Number(value);
            } else {
                processedUpdatedSetting[settingKey] = value;
            }
        }
        
        res.json({ message: 'Setting updated successfully', setting: processedUpdatedSetting });
    } catch (err) {
        console.error('Error updating setting:', err);
        res.status(500).json({ error: err.message });
    }
};