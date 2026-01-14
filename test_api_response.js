const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'config/app.db');
const db = new Database(dbPath);

console.log('Testing the updated API response with transaction type...\\n');

// Simulate the updated query from the controllers
const billsWithTransactionType = db.prepare(`
    SELECT 
        b.*, 
        sr.type as transactionType
    FROM bills b
    LEFT JOIN (
        SELECT bill_id, type, MIN(id) as min_id 
        FROM stock_reg 
        GROUP BY bill_id
    ) sr ON b.id = sr.bill_id
    ORDER BY b.created_at DESC
`).all();

console.log('Bills with transaction type from updated API:');
billsWithTransactionType.forEach(bill => {
    // Apply the same mapping logic as in the controller
    const transactionType = bill.transactionType ? 
        (bill.transactionType === 'SALE' ? 'SALES' : 
         bill.transactionType === 'PURCHASE' ? 'PURCHASE' : 
         bill.transactionType) : 'SALES';  // Default to SALES
    
    console.log(`Bill: ${bill.bno}, Type: ${bill.btype}, Transaction: ${transactionType}, CGST: ${bill.cgst}, SGST: ${bill.sgst}, IGST: ${bill.igst}`);
});

db.close();