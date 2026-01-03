const db = require('../../config/db');

// Helper to get current ISO time
const now = () => new Date().toISOString();

exports.renderStocksPage = (req, res) => {
    // You can pass the logged-in user here if available in req.user
    res.render('inventory/stocks', { title: 'Stock Management', user: req.user || { username: 'Guest' } });
};

exports.getAllStocks = (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM stocks ORDER BY created_at DESC');
        const stocks = stmt.all();
        res.json(stocks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createStock = (req, res) => {
    try {
        const { item, pno, batch, oem, hsn, qty, uom, rate, grate, mrp, expiryDate, user } = req.body;
        
        // Calculate total
        const total = parseFloat(qty) * parseFloat(rate);

        const stmt = db.prepare(`
            INSERT INTO stocks (item, pno, batch, oem, hsn, qty, uom, rate, grate, total, mrp, expiryDate, user, created_at, updated_at)
            VALUES (@item, @pno, @batch, @oem, @hsn, @qty, @uom, @rate, @grate, @total, @mrp, @expiryDate, @user, @created_at, @updated_at)
        `);

        const result = stmt.run({
            item,
            pno: pno || null, // Convert empty strings to null for UNIQUE constraint
            batch: batch || null,
            oem: oem || null,
            hsn,
            qty: parseFloat(qty),
            uom,
            rate: parseFloat(rate),
            grate: parseFloat(grate),
            total,
            mrp: mrp ? parseFloat(mrp) : null,
            expiryDate: expiryDate || null,
            user: user || 'system',
            created_at: now(),
            updated_at: now()
        });

        res.json({ id: result.lastInsertRowid, message: 'Stock added successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.updateStock = (req, res) => {
    try {
        const { id } = req.params;
        const { item, pno, batch, oem, hsn, qty, uom, rate, grate, mrp, expiryDate, user } = req.body;
        
        const total = parseFloat(qty) * parseFloat(rate);

        const stmt = db.prepare(`
            UPDATE stocks SET 
                item = @item, pno = @pno, batch = @batch, oem = @oem, hsn = @hsn, 
                qty = @qty, uom = @uom, rate = @rate, grate = @grate, total = @total, 
                mrp = @mrp, expiryDate = @expiryDate, user = @user, updated_at = @updated_at
            WHERE id = @id
        `);

        stmt.run({
            id,
            item,
            pno: pno || null,
            batch: batch || null,
            oem: oem || null,
            hsn,
            qty: parseFloat(qty),
            uom,
            rate: parseFloat(rate),
            grate: parseFloat(grate),
            total,
            mrp: mrp ? parseFloat(mrp) : null,
            expiryDate: expiryDate || null,
            user: user || 'system',
            updated_at: now()
        });

        res.json({ message: 'Stock updated successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteStock = (req, res) => {
    try {
        const { id } = req.params;
        const stmt = db.prepare('DELETE FROM stocks WHERE id = ?');
        stmt.run(id);
        res.json({ message: 'Stock deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};