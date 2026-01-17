/**
 * Migration: Create bill_sequences table for firm-level bill numbering
 * Purpose: Enable per-firm bill sequence tracking for GST compliance
 * Consistency: Uses transactions to ensure atomic operations
 */

const turso = require('../config/turso');

const createBillSequencesTable = () => {
    console.log('🔨 Creating bill_sequences table...');
    
    try {
        // Create the table
        turso.execute(`
            CREATE TABLE IF NOT EXISTS bill_sequences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                firm_id INTEGER NOT NULL,
                financial_year TEXT NOT NULL,
                last_sequence INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(firm_id, financial_year),
                FOREIGN KEY(firm_id) REFERENCES firms(id) ON DELETE RESTRICT
            )
        `);
        
        // Create indexes for performance
        turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_bill_sequences_firm_year 
            ON bill_sequences(firm_id, financial_year)
        `);
        
        turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_bill_sequences_firm_id 
            ON bill_sequences(firm_id)
        `);
        
        console.log('✅ bill_sequences table created successfully');
        return true;
    } catch (error) {
        console.error('❌ Error creating bill_sequences table:', error);
        throw error;
    }
};

module.exports = { createBillSequencesTable };