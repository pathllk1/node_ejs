/**
 * Migration Runner
 * Executes all pending migrations
 */

const fs = require('fs');
const path = require('path');
const turso = require('./config/turso');

(async () => {

// Create migrations_log table if it doesn't exist
const createMigrationsLogTable = `
    CREATE TABLE IF NOT EXISTS migrations_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_name TEXT UNIQUE NOT NULL,
        executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`;

// Execute the migrations log table creation
try {
    await turso.execute(createMigrationsLogTable);
} catch (error) {
    console.error('Error creating migrations_log table:', error.message);
}

// Get all migration files
const migrationsDir = path.join(__dirname, 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir).filter(file => 
    file.startsWith('00') && file.endsWith('.js') && file.match(/^\d+-.*\.js$/)
).sort();

// Get already executed migrations
let executedMigrations;
try {
    const result = await turso.execute('SELECT migration_name FROM migrations_log');
    executedMigrations = result.rows || [];
} catch (error) {
    executedMigrations = []; // If table doesn't exist yet, start with empty array
}
const executedMigrationNames = new Set(executedMigrations.map(m => m.migration_name));

console.log(`Found ${migrationFiles.length} migration files`);
console.log(`${executedMigrations.length} migrations have already been executed`);

// Execute pending migrations
for (const file of migrationFiles) {
    if (!executedMigrationNames.has(file)) {
        console.log(`Executing migration: ${file}`);
        
        try {
            // Import and execute the migration
            const migrationPath = path.join(migrationsDir, file);
            const migrationModule = require(migrationPath);
            
            // Execute the migration function if it exists
            if (migrationModule && typeof migrationModule === 'object') {
                for (const key in migrationModule) {
                    if (typeof migrationModule[key] === 'function') {
                        await migrationModule[key]();
                    }
                }
            }
            
            // Log the migration as executed
            await turso.execute(`INSERT INTO migrations_log (migration_name) VALUES ('${file}')`);
            
            console.log(`✓ Migration ${file} executed successfully`);
        } catch (error) {
            console.error(`✗ Error executing migration ${file}:`, error.message);
            break; // Stop execution if a migration fails
        }
    }
}

console.log('Migration process completed.');
})();