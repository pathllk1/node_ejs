const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, './app.db'));
db.pragma('journal_mode = WAL');

// Request Logs Table
db.exec(`
    CREATE TABLE IF NOT EXISTS request_logs (
        id INTEGER PRIMARY KEY,
        method TEXT NOT NULL,
        url TEXT NOT NULL,
        ip TEXT,
        username TEXT,
        user_agent TEXT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    ) STRICT;
`);

// Migrate: Add username column if it doesn't exist
try {
    db.exec(`ALTER TABLE request_logs ADD COLUMN username TEXT;`);
} catch (err) {
    // Column already exists, ignore the error
    if (!err.message.includes('duplicate column name')) {
        console.error('Migration error:', err.message);
    }
}

// Users Table
// dates are TEXT because SQLite doesn't have a native Date type, but we enforce ISO strings via logic
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        fullname TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    ) STRICT;
`);

// --- STOCKS TABLE MIGRATION ---
const createStocksTable = `
    CREATE TABLE IF NOT EXISTS stocks (
        id INTEGER PRIMARY KEY,
        item TEXT NOT NULL,
        pno TEXT, 
        batch TEXT, 
        oem TEXT,
        hsn TEXT NOT NULL,
        qty REAL NOT NULL,
        uom TEXT NOT NULL,
        rate REAL NOT NULL,
        grate REAL NOT NULL,
        total REAL NOT NULL,
        mrp REAL,
        expiryDate TEXT,
        user TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    ) STRICT;
`;

db.exec(createStocksTable);

// Add Unique Indexes specifically for pno and batch allows NULLs to be non-unique (SQLite standard), 
// but prevents duplicate non-null values.
try { db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_stocks_pno ON stocks(pno) WHERE pno IS NOT NULL;`); } catch (e) {}
try { db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_stocks_batch ON stocks(batch) WHERE batch IS NOT NULL;`); } catch (e) {}

// Simple migration helper to add columns if they are missing in existing table
const columnsToAdd = ['mrp', 'expiryDate', 'oem', 'pno', 'batch'];
columnsToAdd.forEach(col => {
    try {
        db.exec(`ALTER TABLE stocks ADD COLUMN ${col} TEXT;`); // Note: In STRICT mode, might need specific type handling if table wasn't empty, but usually fine for add column
    } catch (err) {
        // Ignore duplicate column errors
    }
});

module.exports = db;