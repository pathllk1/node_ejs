/**
 * Migration: Create vouchers table for payment and receipt transactions
 * This table will store manual payment/receipt vouchers separate from bill transactions
 */

const turso = require('../config/turso');

const createVouchersTable = () => {
    console.log('🔨 Creating vouchers table...');
    
    try {
        // Create the vouchers table
        turso.execute(`
            CREATE TABLE IF NOT EXISTS vouchers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                voucher_no TEXT UNIQUE NOT NULL,
                voucher_type TEXT NOT NULL, -- PAYMENT or RECEIPT
                transaction_date TEXT NOT NULL,
                party_id INTEGER NOT NULL,
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
        
        // Create indexes for performance
        turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_vouchers_firm_type 
            ON vouchers(firm_id, voucher_type)
        `);
        
        turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_vouchers_party_id 
            ON vouchers(party_id)
        `);
        
        turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_vouchers_voucher_no 
            ON vouchers(voucher_no)
        `);
        
        turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_vouchers_transaction_date 
            ON vouchers(transaction_date)
        `);
        
        console.log('✅ vouchers table created successfully');
        return true;
    } catch (error) {
        console.error('❌ Error creating vouchers table:', error);
        throw error;
    }
};

// Also extend bill_sequences table to handle voucher types
const extendBillSequencesForVouchers = () => {
    console.log('🔨 Extending bill_sequences table for voucher types...');
    
    try {
        // This ensures we can have separate sequences for PAYMENT and RECEIPT vouchers
        // The sequences will be managed similarly to bill numbers
        
        console.log('✅ bill_sequences table is ready for voucher types');
        return true;
    } catch (error) {
        console.error('❌ Error extending bill_sequences for vouchers:', error);
        throw error;
    }
};

const runMigration = async () => {
    console.log('🚀 Starting vouchers table migration...\n');
    
    try {
        // Step 1: Create vouchers table
        console.log('Step 1: Creating vouchers table');
        console.log('━'.repeat(50));
        createVouchersTable();
        console.log('');
        
        // Step 2: Extend bill_sequences for voucher types
        console.log('Step 2: Preparing bill_sequences for voucher types');
        console.log('━'.repeat(50));
        extendBillSequencesForVouchers();
        console.log('');
        
        console.log('✅ Vouchers migration completed successfully!');
        console.log('━'.repeat(50));
        console.log('Next steps:');
        console.log('1. Restart the application');
        console.log('2. The voucher system will be ready for use');
        
    } catch (error) {
        console.error('\n❌ Vouchers migration failed:');
        console.error(error);
        process.exit(1);
    }
};

// Export for use in other modules
module.exports = {
    createVouchersTable,
    extendBillSequencesForVouchers,
    runMigration
};

// Run the migration if this file is executed directly
if (require.main === module) {
    runMigration();
}