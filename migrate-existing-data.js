const db = require('./config/db');

/**
 * Migration script to assign existing records to firms
 * This script should be run once to migrate existing data to the new firm-based system
 */
const migrateExistingDataToFirms = async () => {
    console.log('Starting data migration to firms...');
    
    try {
        // Check if there are any firms already created
        const existingFirms = db.prepare('SELECT * FROM firms LIMIT 1').get();
        
        let defaultFirmId;
        
        if (!existingFirms) {
            // Create a default firm if none exists
            console.log('Creating default firm...');
            const result = db.prepare(`
                INSERT INTO firms (name, address, contact_info, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            `).run('Default Firm', 'Default Address', 'Default Contact', new Date().toISOString(), new Date().toISOString());
            
            defaultFirmId = result.lastInsertRowid;
            console.log(`Created default firm with ID: ${defaultFirmId}`);
        } else {
            // Use the first firm as the default
            defaultFirmId = existingFirms.id;
            console.log(`Using existing firm with ID: ${defaultFirmId}`);
        }
        
        // Assign all existing stocks to the default firm
        console.log('Assigning existing stocks to firm...');
        const stocksResult = db.prepare(`
            UPDATE stocks 
            SET firm_id = ? 
            WHERE firm_id IS NULL
        `).run(defaultFirmId);
        console.log(`Updated ${stocksResult.changes} stocks`);
        
        // Assign all existing parties to the default firm
        console.log('Assigning existing parties to firm...');
        const partiesResult = db.prepare(`
            UPDATE parties 
            SET firm_id = ? 
            WHERE firm_id IS NULL
        `).run(defaultFirmId);
        console.log(`Updated ${partiesResult.changes} parties`);
        
        // Assign all existing bills to the default firm
        console.log('Assigning existing bills to firm...');
        const billsResult = db.prepare(`
            UPDATE bills 
            SET firm_id = ? 
            WHERE firm_id IS NULL
        `).run(defaultFirmId);
        console.log(`Updated ${billsResult.changes} bills`);
        
        // Assign all existing stock_reg entries to the default firm
        console.log('Assigning existing stock_reg entries to firm...');
        const stockRegResult = db.prepare(`
            UPDATE stock_reg 
            SET firm_id = ? 
            WHERE firm_id IS NULL
        `).run(defaultFirmId);
        console.log(`Updated ${stockRegResult.changes} stock_reg entries`);
        
        console.log('Data migration completed successfully!');
        console.log('Note: All existing users still need to be assigned to a firm manually via the admin panel.');
        
    } catch (error) {
        console.error('Error during data migration:', error);
        throw error;
    }
};

// Run the migration if this file is executed directly
if (require.main === module) {
    migrateExistingDataToFirms()
        .then(() => {
            console.log('Migration script completed.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateExistingDataToFirms };