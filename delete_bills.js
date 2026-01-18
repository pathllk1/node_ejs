#!/usr/bin/env node

/**
 * DELETE ALL BILLS RECORDS
 * WARNING: This will permanently delete all bill data
 */

const turso = require('./config/turso');

async function deleteAllBills() {
    try {
        console.log('⚠️  WARNING: About to delete ALL records from bills table');
        console.log('========================================================\n');
        
        // First, let's see how many records we're dealing with
        const countQuery = await turso.execute({
            sql: 'SELECT COUNT(*) as total_count FROM bills'
        });
        
        const totalCount = countQuery.rows[0].total_count;
        console.log(`Found ${totalCount} bill records in the database.`);
        
        if (totalCount === 0) {
            console.log('✅ No bills found. Table is already empty.');
            return;
        }
        
        console.log('\n📋 Sample of bills to be deleted:');
        const sampleQuery = await turso.execute({
            sql: 'SELECT id, bno, bdate, btype, gtot, status FROM bills LIMIT 5'
        });
        
        sampleQuery.rows.forEach(bill => {
            console.log(`  ID: ${bill.id}, Bill No: ${bill.bno}, Date: ${bill.bdate}, Type: ${bill.btype}, Amount: ₹${bill.gtot}, Status: ${bill.status}`);
        });
        
        console.log(`\n... and ${totalCount - 5} more records.`);
        
        console.log('\n🗑️  Starting deletion process...\n');
        
        // Delete related records first to handle foreign key constraints
        console.log('1. Deleting related ledger entries...');
        const ledgerResult = await turso.execute('DELETE FROM ledger WHERE bill_id IS NOT NULL');
        console.log(`   Deleted ${ledgerResult.rowsAffected || 0} ledger entries`);
        
        console.log('2. Deleting related stock_reg entries...');
        const stockRegResult = await turso.execute('DELETE FROM stock_reg WHERE bill_id IS NOT NULL');
        console.log(`   Deleted ${stockRegResult.rowsAffected || 0} stock_reg entries`);
        
        console.log('3. Deleting all bills...');
        const billResult = await turso.execute('DELETE FROM bills');
        console.log(`   Deleted ${billResult.rowsAffected || 0} bill records`);
        
        // Verify deletion
        console.log('\n🔍 Verifying deletion...');
        const verifyQuery = await turso.execute({
            sql: 'SELECT COUNT(*) as remaining_count FROM bills'
        });
        
        const remainingCount = verifyQuery.rows[0].remaining_count;
        console.log(`Remaining bills in database: ${remainingCount}`);
        
        if (remainingCount === 0) {
            console.log('✅ SUCCESS! Bills table is now empty!');
            console.log('✅ All related data has been cleaned up!');
        } else {
            console.log(`⚠️  ${remainingCount} bills still remain`);
        }
        
        console.log('\n✅ Deletion process completed!');
        
    } catch (error) {
        console.error('❌ Error during deletion:', error);
        console.error('Error details:', error.message);
    }
}

// Execute the deletion
deleteAllBills();