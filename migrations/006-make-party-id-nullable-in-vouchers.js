/**
 * Migration: Make party_id nullable in vouchers table to support journal entries
 * Journal entries don't always involve a specific party, so party_id should be optional
 */

const turso = require('../config/turso');

const makePartyIdNullableInVouchers = async () => {
    console.log('🔨 Making party_id nullable in vouchers table...');
    
    try {
        // SQLite doesn't support direct ALTER COLUMN, so we need to recreate the table
        // Step 1: Create a new table with the updated schema
        await turso.execute(`
            CREATE TABLE vouchers_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                voucher_no TEXT UNIQUE NOT NULL,
                voucher_type TEXT NOT NULL, -- PAYMENT, RECEIPT, or JOURNAL
                transaction_date TEXT NOT NULL,
                party_id INTEGER, -- Made nullable (removed NOT NULL)
                amount REAL NOT NULL,
                payment_mode TEXT, -- CASH, BANK, etc.
                narration TEXT,
                firm_id INTEGER NOT NULL,
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(firm_id) REFERENCES firms(id) ON DELETE CASCADE,
                FOREIGN KEY(party_id) REFERENCES parties(id) ON DELETE RESTRICT
            )
        `);
        
        // Step 2: Copy data from old table to new table
        await turso.execute(`
            INSERT INTO vouchers_new 
            SELECT id, voucher_no, voucher_type, transaction_date, party_id, amount, 
                   payment_mode, narration, firm_id, created_by, created_at, updated_at
            FROM vouchers
        `);
        
        // Step 3: Drop the old table
        await turso.execute('DROP TABLE vouchers');
        
        // Step 4: Rename the new table to the original name
        await turso.execute('ALTER TABLE vouchers_new RENAME TO vouchers');
        
        // Step 5: Recreate indexes
        await turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_vouchers_firm_type 
            ON vouchers(firm_id, voucher_type)
        `);
        
        await turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_vouchers_party_id 
            ON vouchers(party_id)
        `);
        
        await turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_vouchers_voucher_no 
            ON vouchers(voucher_no)
        `);
        
        await turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_vouchers_transaction_date 
            ON vouchers(transaction_date)
        `);
        
        console.log('✅ vouchers table updated successfully - party_id is now nullable');
        return true;
    } catch (error) {
        console.error('❌ Error updating vouchers table:', error);
        throw error;
    }
};

const runMigration = async () => {
    console.log('🚀 Starting party_id nullable migration...\n');
    
    try {
        console.log('Step 1: Making party_id nullable in vouchers table');
        console.log('━'.repeat(50));
        await makePartyIdNullableInVouchers();
        console.log('');
        
        console.log('✅ Party ID nullable migration completed successfully!');
        console.log('━'.repeat(50));
        console.log('The vouchers table now allows NULL party_id for journal entries');
        
    } catch (error) {
        console.error('\n❌ Party ID nullable migration failed:');
        console.error(error);
        process.exit(1);
    }
};

// Export for use in other modules
module.exports = {
    makePartyIdNullableInVouchers,
    runMigration
};

// Run the migration if this file is executed directly
if (require.main === module) {
    runMigration();
}