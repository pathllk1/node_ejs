const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'config/app.db');
const db = new Database(dbPath);

console.log('Checking bills table btype values...\n');

// Get distinct btype values
try {
    const btypes = db.prepare('SELECT DISTINCT btype FROM bills').all();
    console.log('Distinct btype values in database:');
    btypes.forEach(row => {
        console.log(`- ${row.btype}`);
    });
    
    console.log('\nDetailed bill information:');
    const bills = db.prepare(`
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
    `).all();
    
    bills.forEach(bill => {
        console.log(`Bill: ${bill.bno}, Type: ${bill.btype}, CGST: ${bill.cgst}, SGST: ${bill.sgst}, IGST: ${bill.igst}`);
    });
    
    // Now check stock_reg types
    console.log('\nChecking stock_reg table types...');
    const types = db.prepare('SELECT DISTINCT type FROM stock_reg').all();
    console.log('Types in stock_reg:');
    types.forEach(row => {
        console.log(`- ${row.type}`);
    });
    
    // Check for some bills to see the relationship
    console.log('\nSample bill and stock_reg relationship:');
    const billSample = db.prepare(`
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
    `).all();
    
    billSample.forEach(row => {
        console.log(`Bill: ${row.bno}, BillType: ${row.btype}, StockRegType: ${row.stock_reg_type}, Firm: ${row.firm}`);
    });
    
} catch (error) {
    console.error('Error accessing database:', error.message);
}

db.close();