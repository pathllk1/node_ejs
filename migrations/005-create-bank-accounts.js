// migrations/005-create-bank-accounts.js
const turso = require('../config/turso');

// Create bank_accounts table
const createBankAccountsTable = async () => {
    console.log('🔨 Creating bank_accounts table...');
    
    try {
        // Create the table
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS bank_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                firm_id INTEGER NOT NULL,
                bank_name TEXT NOT NULL,
                account_holder_name TEXT,
                account_number TEXT NOT NULL,
                account_type TEXT DEFAULT 'Savings',
                ifsc_code TEXT,
                micr_code TEXT,
                branch_name TEXT,
                branch_address TEXT,
                opening_balance REAL DEFAULT 0,
                current_balance REAL DEFAULT 0,
                account_status TEXT DEFAULT 'Active',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE CASCADE
            )
        `);
        
        // Create indexes for performance
        await turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_bank_accounts_firm_id 
            ON bank_accounts(firm_id)
        `);
        
        await turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_bank_accounts_account_number 
            ON bank_accounts(account_number)
        `);
        
        // Add trigger to update the updated_at column
        await turso.execute(`
            CREATE TRIGGER IF NOT EXISTS update_bank_accounts_updated_at 
            AFTER UPDATE ON bank_accounts
            BEGIN
                UPDATE bank_accounts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        `);
        
        console.log('✅ bank_accounts table created successfully');
        return true;
    } catch (error) {
        console.error('❌ Error creating bank_accounts table:', error);
        throw error;
    }
};

module.exports = { createBankAccountsTable };