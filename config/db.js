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
        user_agent TEXT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    ) STRICT;
`);

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

module.exports = db;