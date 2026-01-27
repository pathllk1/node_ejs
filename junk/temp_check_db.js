const turso = require('./config/turso');

(async () => {
    console.log('Tables in the database:');
    const tables = await turso.execute("SELECT name FROM sqlite_master WHERE type='table';");
    for (const t of tables.rows) {
        console.log('- ' + t.name);
    }

    console.log('\nSchema of ledger table:');
    const ledgerSchema = await turso.execute("SELECT sql FROM sqlite_master WHERE name='ledger';");
    if (ledgerSchema.rows.length > 0) {
        console.log(ledgerSchema.rows[0].sql);
    } else {
        console.log('No ledger table found');
    }

    console.log('\nSchema of vouchers table:');
    const voucherSchema = await turso.execute("SELECT sql FROM sqlite_master WHERE name='vouchers';");
    if (voucherSchema.rows.length > 0) {
        console.log(voucherSchema.rows[0].sql);
    } else {
        console.log('No vouchers table found');
    }

    console.log('\nSchema of firms table:');
    const firmsSchema = await turso.execute("SELECT sql FROM sqlite_master WHERE name='firms';");
    if (firmsSchema.rows.length > 0) {
        console.log(firmsSchema.rows[0].sql);
    } else {
        console.log('No firms table found');
    }
})();