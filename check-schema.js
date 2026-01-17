const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const db = new Database(path.join(__dirname, './config/app.db'));

console.log('Checking indexes on stocks table...');

try {
    const indexes = db.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND tbl_name='stocks';").all();
    console.log('Existing indexes on stocks table:', indexes);
    
    console.log('\nChecking stocks table structure...');
    const columns = db.prepare("PRAGMA table_info(stocks);").all();
    console.log('Stocks table columns:', columns);
    
    console.log('\nChecking if old index still exists...');
    const oldIndexCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_stocks_item';").all();
    console.log('Old idx_stocks_item index exists:', oldIndexCheck.length > 0);
    
    console.log('\nChecking if new index exists...');
    const newIndexCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_stocks_item_firm';").all();
    console.log('New idx_stocks_item_firm index exists:', newIndexCheck.length > 0);
    
} catch (error) {
    console.error('Error checking schema:', error);
}

db.close();