/**
 * Data Migration: Populate bill_sequences from existing bills
 * Purpose: Initialize sequence counters based on existing bill history
 * Safety: Read-only operation, does not modify existing bills
 */

const turso = require('../config/turso');

const populateBillSequences = async () => {
    console.log('🔄 Starting bill sequence population from existing bills...');
    
    try {
        // Get all bills with their firm_id and created_at
        const billsResult = await turso.execute(`
            SELECT firm_id, bdate, COUNT(*) as bill_count
            FROM bills
            WHERE firm_id IS NOT NULL AND bno IS NOT NULL
            GROUP BY firm_id, bdate
            ORDER BY firm_id, bdate
        `);
        const bills = billsResult.rows || [];
        
        if (bills.length === 0) {
            console.log('ℹ️  No existing bills found. Starting with empty sequences.');
            return { processed: 0, errors: 0 };
        }
        
        console.log(`📊 Found ${bills.length} distinct firm-date combinations`);
        
        let processed = 0;
        let errors = 0;
        
        // Helper function to extract financial year from date
        const extractFinancialYear = (dateStr) => {
            if (!dateStr) return null;
            
            try {
                const date = new Date(dateStr);
                const year = date.getFullYear();
                const month = date.getMonth();
                
                let fyStart, fyEnd;
                if (month >= 3) { // April onwards
                    fyStart = year;
                    fyEnd = year + 1;
                } else { // January to March
                    fyStart = year - 1;
                    fyEnd = year;
                }
                
                const startYY = String(fyStart % 100).padStart(2, '0');
                const endYY = String(fyEnd % 100).padStart(2, '0');
                
                return `${startYY}-${endYY}`;
            } catch (e) {
                console.warn(`⚠️  Could not parse date: ${dateStr}`);
                return null;
            }
        };
        
        // Group bills by firm and financial year
        const billsByFirmYear = {};
        
        const allBillsResult = await turso.execute(`
            SELECT DISTINCT firm_id, bdate, bno
            FROM bills
            WHERE firm_id IS NOT NULL AND bno IS NOT NULL
            ORDER BY firm_id, bdate
        `);
        const allBills = allBillsResult.rows || [];
        
        allBills.forEach(bill => {
            const fy = extractFinancialYear(bill.bdate);
            if (!fy) return;
            
            const key = `${bill.firm_id}_${fy}`;
            if (!billsByFirmYear[key]) {
                billsByFirmYear[key] = {
                    firm_id: bill.firm_id,
                    financial_year: fy,
                    bills: []
                };
            }
            billsByFirmYear[key].bills.push(bill);
        });
        
        console.log(`📋 Grouped into ${Object.keys(billsByFirmYear).length} firm-year combinations`);
        
        // Process each firm-year combination
        for (const group of Object.values(billsByFirmYear)) {
            try {
                const { firm_id, financial_year, bills } = group;
                
                // Check if sequence already exists
                const existingResult = await turso.execute(`
                    SELECT id, last_sequence FROM bill_sequences
                    WHERE firm_id = ? AND financial_year = ?
                `, [firm_id, financial_year]);
                const existing = existingResult.rows[0];
                
                const billCount = bills.length;
                
                if (existing) {
                    // Update if existing sequence is lower than current bill count
                    if (existing.last_sequence < billCount) {
                        await turso.execute(`
                            UPDATE bill_sequences 
                            SET last_sequence = ?, updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `, [billCount, existing.id]);
                        
                        console.log(`✏️  Updated: Firm ${firm_id}, FY ${financial_year} - Sequence: ${billCount}`);
                        processed++;
                    }
                } else {
                    // Insert new sequence record
                    await turso.execute(`
                        INSERT INTO bill_sequences (firm_id, financial_year, last_sequence, created_at, updated_at)
                        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    `, [firm_id, financial_year, billCount]);
                    
                    console.log(`✅ Created: Firm ${firm_id}, FY ${financial_year} - Sequence: ${billCount}`);
                    processed++;
                }
            } catch (error) {
                console.error(`❌ Error processing group:`, error.message);
                errors++;
            }
        }
        
        console.log(`\n✅ Migration completed:`);
        console.log(`   - Processed: ${processed}`);
        console.log(`   - Errors: ${errors}`);
        
        return { processed, errors };
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
};

module.exports = { populateBillSequences };