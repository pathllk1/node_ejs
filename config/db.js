const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, './app.db'));
db.pragma('journal_mode = WAL');

// 1. Request Logs Table
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

// Request Logs Migration
try {
    db.exec(`ALTER TABLE request_logs ADD COLUMN username TEXT;`);
} catch (err) {
    if (!err.message.includes('duplicate column name')) console.error('Migration error:', err.message);
}

// 2. Users Table
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

// 3. Stocks Table
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

// Stocks Indexes
try { db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_stocks_pno ON stocks(pno) WHERE pno IS NOT NULL;`); } catch (e) {}
try { db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_stocks_batch ON stocks(batch) WHERE batch IS NOT NULL;`); } catch (e) {}

// Stocks Migration Helper
const stockColumns = ['mrp', 'expiryDate', 'oem', 'pno', 'batch'];
stockColumns.forEach(col => {
    try { db.exec(`ALTER TABLE stocks ADD COLUMN ${col} TEXT;`); } catch (err) {}
});

// ---------------------------------------------------------
// NEW TABLES (Migrated from Mongoose)
// ---------------------------------------------------------

// 4. Party Table
// Boolean fields (isActive, etc.) are stored as INTEGER (0 or 1)
db.exec(`
    CREATE TABLE IF NOT EXISTS parties (
        id INTEGER PRIMARY KEY,
        supply TEXT NOT NULL,
        addr TEXT,
        gstin TEXT DEFAULT 'UNREGISTERED',
        state TEXT,
        state_code INTEGER,
        pin INTEGER,
        pan TEXT,
        contact TEXT,
        usern TEXT NOT NULL,
        firm TEXT NOT NULL,
        has_multiple_gsts INTEGER DEFAULT 0, -- Boolean: 0=false, 1=true
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    ) STRICT;
`);

// 5. Party Additional GSTs Table (Child of Parties)
// Handles the 'additionalGSTs' array from the Mongoose schema
db.exec(`
    CREATE TABLE IF NOT EXISTS party_gsts (
        id INTEGER PRIMARY KEY,
        party_id INTEGER NOT NULL,
        gst_number TEXT NOT NULL,
        state TEXT NOT NULL,
        state_code INTEGER NOT NULL,
        location_name TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        pincode TEXT NOT NULL,
        contact_person TEXT,
        contact_number TEXT,
        is_active INTEGER DEFAULT 1,     -- Boolean
        is_default INTEGER DEFAULT 0,    -- Boolean
        registration_type TEXT DEFAULT 'regular',
        valid_from TEXT NOT NULL,        -- Date (ISO String)
        valid_to TEXT,                   -- Date (ISO String)
        last_used_date TEXT,             -- Date (ISO String)
        transaction_count INTEGER DEFAULT 0,
        FOREIGN KEY(party_id) REFERENCES parties(id) ON DELETE CASCADE
    ) STRICT;
`);

// 6. Bills Table
// 'oth_chg' and 'gstSelection' are stored as JSON strings in TEXT columns
db.exec(`
    CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY,
        bno TEXT NOT NULL,
        bdate TEXT NOT NULL,             -- Date (ISO String)
        supply TEXT NOT NULL,
        addr TEXT,
        gstin TEXT DEFAULT 'UNREGISTERED',
        state TEXT,
        pin INTEGER,
        gtot REAL NOT NULL,
        disc REAL,
        cgst REAL,
        usern TEXT NOT NULL,
        sgst REAL,
        firm TEXT NOT NULL,
        igst REAL,
        rof REAL,
        ntot REAL NOT NULL,
        btype TEXT NOT NULL DEFAULT 'SALES',
        order_no TEXT,
        order_date TEXT,                 -- Date
        dispatch_through TEXT,
        docket_no TEXT,
        vehicle_no TEXT,
        consignee_name TEXT,
        consignee_gstin TEXT,
        consignee_address TEXT,
        consignee_state TEXT,
        consignee_pin TEXT,
        reason_for_note TEXT,
        original_bill_no TEXT,
        original_bill_date TEXT,         -- Date
        narration TEXT,
        status TEXT DEFAULT 'ACTIVE',    -- Enum: ACTIVE, CANCELLED
        cancellation_reason TEXT,
        cancelled_at TEXT,               -- Date
        cancelled_by INTEGER,            -- FK to users.id
        attachment_url TEXT,
        attachment_file_id TEXT,
        party_id INTEGER,                -- FK to parties.id
        
        -- JSON Fields for complex objects
        oth_chg_json TEXT,               -- Stores Array<IOtherCharge> as JSON
        gst_selection_json TEXT,         -- Stores IGSTSelection object as JSON
        reverse_charge INTEGER DEFAULT 0, -- Boolean: 0=false, 1=true
        
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,

        FOREIGN KEY(party_id) REFERENCES parties(id),
        FOREIGN KEY(cancelled_by) REFERENCES users(id)
    ) STRICT;
`);

// 7. StockReg Table (Transaction Register)
db.exec(`
    CREATE TABLE IF NOT EXISTS stock_reg (
        id INTEGER PRIMARY KEY,
        type TEXT NOT NULL,
        bno TEXT NOT NULL,
        bdate TEXT NOT NULL,             -- Date
        supply TEXT NOT NULL,
        item TEXT NOT NULL,
        item_narration TEXT,
        pno TEXT,
        batch TEXT,
        oem TEXT,
        hsn TEXT NOT NULL,
        qty REAL NOT NULL,
        qtyh REAL NOT NULL,
        uom TEXT NOT NULL,
        rate REAL NOT NULL,
        grate REAL,
        cgst REAL,
        sgst REAL,
        igst REAL,
        disc REAL,
        discamt REAL,
        total REAL NOT NULL,
        mrp REAL,
        expiry_date TEXT,                -- Date
        project TEXT,
        user TEXT NOT NULL,
        firm TEXT NOT NULL,
        rid TEXT,
        
        stock_id INTEGER,                -- FK to stocks.id
        bill_id INTEGER,                 -- FK to bills.id
        
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,

        FOREIGN KEY(stock_id) REFERENCES stocks(id),
        FOREIGN KEY(bill_id) REFERENCES bills(id)
    ) STRICT;
`);

// StockReg Table Migration for item_narration
try {
    db.exec(`ALTER TABLE stock_reg ADD COLUMN item_narration TEXT;`);
} catch (err) {
    if (!err.message.includes('duplicate column name')) console.error('Migration error for item_narration:', err.message);
}

// Bills Table Migration for reverse_charge
try {
    db.exec(`ALTER TABLE bills ADD COLUMN reverse_charge INTEGER DEFAULT 0;`);
} catch (err) {
    if (!err.message.includes('duplicate column name')) console.error('Migration error for reverse_charge:', err.message);
}

// Indexes for performance
try {
    // Lookup bills by number
    db.exec(`CREATE INDEX IF NOT EXISTS idx_bills_bno ON bills(bno);`);
    
    // Create unique constraint for bill numbers (add if not exists)
    try {
        db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_bills_bno_unique ON bills(bno);`);
    } catch (e) {
        console.warn('Warning: Could not create unique bill number index - possible duplicates exist:', e.message);
    }
    // Lookup stock registers by bill number or item
    db.exec(`CREATE INDEX IF NOT EXISTS idx_stockreg_bno ON stock_reg(bno);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_stockreg_item ON stock_reg(item);`);
    // Lookup parties by GSTIN
    db.exec(`CREATE INDEX IF NOT EXISTS idx_parties_gstin ON parties(gstin);`);
    // Lookup bills by Party ID (Reverse relation)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_bills_party_id ON bills(party_id);`);
} catch (e) {
    console.error("Index creation error:", e.message);
}

module.exports = db;