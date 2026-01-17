const turso = require('../../config/turso');

// Get all settings
exports.getAllSettings = async (req, res) => {
    try {
        // Get global settings
        const globalSettingsResult = await turso.execute({
            sql: 'SELECT * FROM settings ORDER BY setting_key'
        });
        const globalSettings = globalSettingsResult.rows;
        
        // Convert BigInt values to numbers in global settings
        const processedGlobalSettings = globalSettings.map(setting => {
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
        
        // If user has firm access, also get firm-specific settings
        let firmSettings = [];
        if (req.user && req.user.firm_id) {
            const firmSettingsResult = await turso.execute({
                sql: 'SELECT * FROM firm_settings WHERE firm_id = ? ORDER BY setting_key',
                args: [req.user.firm_id]
            });
            firmSettings = firmSettingsResult.rows;
            
            // Convert BigInt values to numbers in firm settings
            firmSettings = firmSettings.map(setting => {
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
        }
        
        res.json({ 
            global_settings: processedGlobalSettings,
            firm_settings: firmSettings
        });
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get specific setting
exports.getSetting = async (req, res) => {
    try {
        const { key } = req.params;
        
        // If user has firm access, check for firm-specific setting first
        if (req.user && req.user.firm_id) {
            const firmSettingResult = await turso.execute({
                sql: 'SELECT * FROM firm_settings WHERE firm_id = ? AND setting_key = ?',
                args: [req.user.firm_id, key]
            });
            const firmSetting = firmSettingResult.rows[0];
            
            if (firmSetting) {
                // Convert BigInt values to numbers in firm setting
                const processedFirmSetting = {};
                for (const [settingKey, value] of Object.entries(firmSetting)) {
                    if (typeof value === 'bigint') {
                        processedFirmSetting[settingKey] = Number(value);
                    } else {
                        processedFirmSetting[settingKey] = value;
                    }
                }
                res.json(processedFirmSetting);
                return;
            }
        }
        
        // Fall back to global setting
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
        
        // Check if user has firm access (for firm-specific settings)
        if (req.user && req.user.firm_id) {
            // Update or create firm-specific setting
            const existingFirmSettingResult = await turso.execute({
                sql: 'SELECT * FROM firm_settings WHERE firm_id = ? AND setting_key = ?',
                args: [req.user.firm_id, key]
            });
            const existingFirmSetting = existingFirmSettingResult.rows[0];
            
            if (existingFirmSetting) {
                // Update existing firm setting
                const result = await turso.execute({
                    sql: `
                        UPDATE firm_settings 
                        SET setting_value = ?, description = ?, updated_at = ?
                        WHERE firm_id = ? AND setting_key = ?
                    `,
                    args: [setting_value, description || existingFirmSetting.description, new Date().toISOString(), req.user.firm_id, key]
                });
                
                if (result.rowsAffected === 0) {
                    return res.status(400).json({ error: 'No changes made to setting' });
                }
                
                // Return updated setting
                const updatedSettingResult = await turso.execute({
                    sql: 'SELECT * FROM firm_settings WHERE firm_id = ? AND setting_key = ?',
                    args: [req.user.firm_id, key]
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
            } else {
                // Create new firm setting
                const result = await turso.execute({
                    sql: `
                        INSERT INTO firm_settings (firm_id, setting_key, setting_value, description, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `,
                    args: [
                        req.user.firm_id, 
                        key, 
                        setting_value, 
                        description || `Firm-specific ${key} setting`, 
                        new Date().toISOString(), 
                        new Date().toISOString()
                    ]
                });
                
                if (result.rowsAffected === 0) {
                    return res.status(400).json({ error: 'Failed to create setting' });
                }
                
                // Return newly created setting
                const newSettingResult = await turso.execute({
                    sql: 'SELECT * FROM firm_settings WHERE firm_id = ? AND setting_key = ?',
                    args: [req.user.firm_id, key]
                });
                const newSetting = newSettingResult.rows[0];
                
                // Convert BigInt values to numbers in new setting
                const processedNewSetting = {};
                for (const [settingKey, value] of Object.entries(newSetting)) {
                    if (typeof value === 'bigint') {
                        processedNewSetting[settingKey] = Number(value);
                    } else {
                        processedNewSetting[settingKey] = value;
                    }
                }
                
                res.json({ message: 'Setting created successfully', setting: processedNewSetting });
            }
        } else {
            // Update global setting if no firm context
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
        }
    } catch (err) {
        console.error('Error updating setting:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get GST status
exports.getGstStatus = async (req, res) => {
    try {
        // Check if user has firm access (for firm-specific settings)
        if (req.user && req.user.firm_id) {
            // First check for firm-specific GST setting
            const firmSettingResult = await turso.execute({
                sql: 'SELECT setting_value FROM firm_settings WHERE firm_id = ? AND setting_key = ?',
                args: [req.user.firm_id, 'gst_enabled']
            });
            const firmSetting = firmSettingResult.rows[0];
            
            if (firmSetting) {
                // Use firm-specific setting
                const gstEnabled = firmSetting.setting_value === 'true';
                res.json({ gst_enabled: gstEnabled });
                return;
            }
        }
        
        // Fall back to global setting if no firm-specific setting exists
        const settingResult = await turso.execute({
            sql: 'SELECT setting_value FROM settings WHERE setting_key = ?',
            args: ['gst_enabled']
        });
        const setting = settingResult.rows[0];
        const gstEnabled = setting ? setting.setting_value === 'true' : true; // Default to true if not found
        res.json({ gst_enabled: gstEnabled });
    } catch (err) {
        console.error('Error fetching GST status:', err);
        res.status(500).json({ error: err.message });
    }
};

// Toggle GST status
exports.toggleGstStatus = async (req, res) => {
    try {
        const { enabled } = req.body;
        
        if (enabled === undefined) {
            return res.status(400).json({ error: 'Enabled parameter is required (true/false)' });
        }
        
        const settingValue = enabled ? 'true' : 'false';
        
        // Check if user has firm access (for firm-specific settings)
        if (req.user && req.user.firm_id) {
            // Update or create firm-specific GST setting
            const existingFirmSettingResult = await turso.execute({
                sql: 'SELECT * FROM firm_settings WHERE firm_id = ? AND setting_key = ?',
                args: [req.user.firm_id, 'gst_enabled']
            });
            const existingFirmSetting = existingFirmSettingResult.rows[0];
            
            if (existingFirmSetting) {
                // Update existing firm setting
                await turso.execute({
                    sql: `
                        UPDATE firm_settings 
                        SET setting_value = ?, updated_at = ?
                        WHERE firm_id = ? AND setting_key = ?
                    `,
                    args: [settingValue, new Date().toISOString(), req.user.firm_id, 'gst_enabled']
                });
            } else {
                // Create new firm setting
                await turso.execute({
                    sql: `
                        INSERT INTO firm_settings (firm_id, setting_key, setting_value, description, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `,
                    args: [
                        req.user.firm_id, 
                        'gst_enabled', 
                        settingValue, 
                        'Firm-specific GST calculation toggle', 
                        new Date().toISOString(), 
                        new Date().toISOString()
                    ]
                });
            }
        } else {
            // Update global setting if no firm context
            const existingSettingResult = await turso.execute({
                sql: 'SELECT * FROM settings WHERE setting_key = ?',
                args: ['gst_enabled']
            });
            const existingSetting = existingSettingResult.rows[0];
            
            if (existingSetting) {
                // Update existing setting
                await turso.execute({
                    sql: `
                        UPDATE settings 
                        SET setting_value = ?, updated_at = ?
                        WHERE setting_key = ?
                    `,
                    args: [settingValue, new Date().toISOString(), 'gst_enabled']
                });
            } else {
                // Create new setting
                await turso.execute({
                    sql: `
                        INSERT INTO settings (setting_key, setting_value, description, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?)
                    `,
                    args: ['gst_enabled', settingValue, 'Global GST calculation toggle', new Date().toISOString(), new Date().toISOString()]
                });
            }
        }
        
        res.json({ message: `GST has been ${enabled ? 'enabled' : 'disabled'} successfully`, gst_enabled: enabled });
    } catch (err) {
        console.error('Error updating GST status:', err);
        res.status(500).json({ error: err.message });
    }
};