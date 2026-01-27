const turso = require('./config/turso');

console.log('Checking bills table btype values...\n');

// Get distinct btype values
(async () => {
    try {
        const btypes = await turso.execute('SELECT DISTINCT btype FROM bills');
        console.log('Distinct btype values in database:');
        for (const row of btypes.rows) {
            console.log(`- ${row.btype}`);
        }
        
        console.log('\nDetailed bill information:');
        const bills = await turso.execute(`
            SELECT 
                id, 
                bno, 
                btype, 
                cgst, 
                sgst, 
                igst, 
                gtot, 
                ntot 
            FROM bills 
            ORDER BY bno
        `);
        
        for (const bill of bills.rows) {
            console.log(`Bill: ${bill.bno}, Type: ${bill.btype}, CGST: ${bill.cgst}, SGST: ${bill.sgst}, IGST: ${bill.igst}`);
        }
        
        // Now check stock_reg types
        console.log('\nChecking stock_reg table types...');
        const types = await turso.execute('SELECT DISTINCT type FROM stock_reg');
        console.log('Types in stock_reg:');
        for (const row of types.rows) {
            console.log(`- ${row.type}`);
        }
        
        // Check for some bills to see the relationship
        console.log('\nSample bill and stock_reg relationship:');
        const billSample = await turso.execute(`
            SELECT 
                s.type as stock_reg_type, 
                b.bno, 
                b.btype, 
                b.firm, 
                b.gtot, 
                b.ntot 
            FROM bills b 
            JOIN stock_reg s ON b.id = s.bill_id 
            LIMIT 10
        `);
        
        for (const row of billSample.rows) {
            console.log(`Bill: ${row.bno}, BillType: ${row.btype}, StockRegType: ${row.stock_reg_type}, Firm: ${row.firm}`);
        }
        
    } catch (error) {
        console.error('Error accessing database:', error.message);
    }
})();