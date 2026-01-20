const turso = require('./config/turso');

console.log('Checking indexes on stocks table...');

(async () => {
    try {
        const indexes = await turso.execute("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND tbl_name='stocks';");
        console.log('Existing indexes on stocks table:', indexes.rows);
        
        console.log('\nChecking stocks table structure...');
        const columns = await turso.execute("PRAGMA table_info(stocks);");
        console.log('Stocks table columns:', columns.rows);
        
        console.log('\nChecking if old index still exists...');
        const oldIndexCheck = await turso.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_stocks_item';");
        console.log('Old idx_stocks_item index exists:', oldIndexCheck.rows.length > 0);
        
        console.log('\nChecking if new index exists...');
        const newIndexCheck = await turso.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_stocks_item_firm';");
        console.log('New idx_stocks_item_firm index exists:', newIndexCheck.rows.length > 0);
        
    } catch (error) {
        console.error('Error checking schema:', error);
    }
})();