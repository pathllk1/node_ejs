const db = require('../../config/db');

// Helper to get current ISO time
const now = () => new Date().toISOString();

exports.renderStocksPage = (req, res) => {
    // You can pass the logged-in user here if available in req.user
    res.render('inventory/stocks', { title: 'Stock Management', user: req.user || { username: 'Guest' } });
};

exports.renderBillsPage = (req, res) => {
    // You can pass the logged-in user here if available in req.user
    res.render('inventory/bills', { title: 'Inventory Bills', user: req.user || { username: 'Guest' } });
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

// --- PARTIES API ---

exports.getAllParties = (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM parties ORDER BY created_at DESC');
        const parties = stmt.all();
        res.json(parties);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createParty = (req, res) => {
    try {
        const { firm, gstin, contact, state, state_code, addr, pin, pan, user } = req.body;
        
        const stmt = db.prepare(`
            INSERT INTO parties (firm, gstin, contact, state, state_code, addr, pin, pan, usern, supply, created_at, updated_at)
            VALUES (@firm, @gstin, @contact, @state, @state_code, @addr, @pin, @pan, @user, @supply, @created_at, @updated_at)
        `);

        const result = stmt.run({
            firm,
            gstin: gstin || 'UNREGISTERED',
            contact: contact || null,
            state: state || '',
            state_code: state_code || null,
            addr: addr || null,
            pin: pin || null,
            pan: pan || null,
            user: user || 'system',
            supply: state || '', // Assuming place of supply is state
            created_at: now(),
            updated_at: now()
        });

        res.json({ id: result.lastInsertRowid, message: 'Party created successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// --- BILLS API (Sales Transaction) ---

exports.createBill = (req, res) => {
    // Expects: { meta: {}, party: {}, cart: [], otherCharges: [], user: '' }
    const { meta, party, cart, otherCharges, user } = req.body; 

    if (!cart || cart.length === 0) {
        return res.status(400).json({ error: "Cart cannot be empty" });
    }

    // 1. Calculate Header Totals
    let gtot = 0; // Taxable Total
    let totalTax = 0;

    cart.forEach(item => {
        const lineVal = item.qty * item.rate * (1 - (item.disc || 0)/100);
        const lineTax = lineVal * (item.grate / 100);
        gtot += lineVal;
        totalTax += lineTax;
    });

    const ntot = gtot + totalTax; // Grand Total
    const supplyState = party.state || 'Local';

    // 2. Perform Transaction (Insert Bill -> Insert Items -> Deduct Stock)
    const transaction = db.transaction(() => {
        // A. Insert Bill Header - Check for duplicate bill numbers
        const insertBill = db.prepare(`
            INSERT INTO bills (
                bno, bdate, supply, addr, gstin, state, 
                gtot, ntot, btype, usern, firm, 
                party_id, oth_chg_json, created_at, updated_at
            ) VALUES (
                @bno, @bdate, @supply, @addr, @gstin, @state,
                @gtot, @ntot, @btype, @usern, @firm,
                @party_id, @oth_chg_json, @created_at, @updated_at
            )
        `);

        // Retry logic in case of duplicate bill number
        let billResult;
        let attempts = 0;
        const maxAttempts = 10; // Limit retries to prevent infinite loop
        
        while (attempts < maxAttempts) {
            try {
                billResult = insertBill.run({
                    bno: meta.billNo,
                    bdate: meta.billDate,
                    supply: supplyState,
                    addr: party.addr || '',
                    gstin: party.gstin || 'UNREGISTERED',
                    state: party.state || '',
                    gtot: gtot,
                    ntot: ntot,
                    btype: meta.billType ? meta.billType.toUpperCase() : 'SALES',
                    usern: user || 'system',
                    firm: party.firm,
                    party_id: party.id || null,
                    oth_chg_json: otherCharges && otherCharges.length > 0 ? JSON.stringify(otherCharges) : null,
                    created_at: now(),
                    updated_at: now()
                });
                break; // Success, exit the loop
            } catch (error) {
                // Check if the error is due to a duplicate bill number
                if (error.message.includes('UNIQUE constraint') || error.message.includes('duplicate')) {
                    attempts++;
                    console.warn(`Duplicate bill number detected: ${meta.billNo}. Attempt ${attempts}/${maxAttempts}`);
                    
                    // Generate a new bill number by incrementing the sequence
                    const parts = meta.billNo.split('-');
                    if (parts.length === 3) {
                        const prefix = parts[0];
                        const year = parts[1];
                        const seqNum = parseInt(parts[2]);
                        if (!isNaN(seqNum)) {
                            const newSeqNum = seqNum + attempts; // Increment by the attempt number
                            meta.billNo = `${prefix}-${year}-${newSeqNum.toString().padStart(3, '0')}`;
                            console.log(`Generated new bill number: ${meta.billNo}`);
                        } else {
                            throw new Error(`Invalid bill number format: ${meta.billNo}`);
                        }
                    } else {
                        throw new Error(`Invalid bill number format: ${meta.billNo}`);
                    }
                } else {
                    // Some other error occurred, re-throw it
                    throw error;
                }
            }
        }
        
        if (attempts >= maxAttempts) {
            throw new Error(`Failed to generate unique bill number after ${maxAttempts} attempts`);
        }

        const billId = billResult.lastInsertRowid;

        // B. Prepare Statements for Line Items
        const insertReg = db.prepare(`
            INSERT INTO stock_reg (
                type, bno, bdate, supply, item, batch, hsn, 
                qty, uom, rate, grate, disc, total, 
                stock_id, bill_id, user, firm, created_at, updated_at, qtyh
            ) VALUES (
                'SALE', @bno, @bdate, @supply, @item, @batch, @hsn,
                @qty, @uom, @rate, @grate, @disc, @total,
                @stock_id, @bill_id, @user, @firm, @created_at, @updated_at, 0
            )
        `);

        const updateStockQty = db.prepare(`
            UPDATE stocks SET qty = qty - @qty WHERE id = @id
        `);

        // C. Process Items
        cart.forEach(item => {
            const lineTotal = item.qty * item.rate * (1 - (item.disc || 0)/100);

            insertReg.run({
                bno: meta.billNo,
                bdate: meta.billDate,
                supply: supplyState,
                item: item.item,
                batch: item.batch || null,
                hsn: item.hsn,
                qty: item.qty,
                uom: item.uom,
                rate: item.rate,
                grate: item.grate,
                disc: item.disc || 0,
                total: lineTotal,
                stock_id: item.stockId,
                bill_id: billId,
                user: user || 'system',
                firm: party.firm,
                created_at: now(),
                updated_at: now()
            });

            // Deduct from Stock
            updateStockQty.run({
                qty: item.qty,
                id: item.stockId
            });
        });

        return billId;
    });

    try {
        const billId = transaction(); // Execute Transaction
        res.json({ message: "Bill saved successfully", billId });
    } catch (err) {
        console.error("Transaction Error:", err);
        res.status(500).json({ error: "Failed to save bill: " + err.message });
    }
};

exports.getAllBills = (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM bills ORDER BY created_at DESC');
        const bills = stmt.all();
        
        // Parse the oth_chg_json field for each bill
        const processedBills = bills.map(bill => {
            if (bill.oth_chg_json) {
                try {
                    bill.otherCharges = JSON.parse(bill.oth_chg_json);
                } catch (e) {
                    console.warn('Failed to parse other charges for bill', bill.id, e.message);
                    bill.otherCharges = [];
                }
            } else {
                bill.otherCharges = [];
            }
            return bill;
        });
        
        res.json(processedBills);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Function to generate next bill number automatically
exports.getNextBillNumber = (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const prefix = 'INV'; // Can be made configurable if needed
        
        // Query to find the highest bill number with the current year and prefix
        // Since SQLite doesn't support negative positions in INSTR, we'll use a simpler approach
        // and extract the number part in JavaScript
        const stmt = db.prepare(
            `SELECT bno FROM bills 
             WHERE bno LIKE ? 
             ORDER BY bno DESC 
             LIMIT 1`
        );
        
        const pattern = `${prefix}-${currentYear}-%`;
        const result = stmt.get(pattern);
        
        let nextNumber = 1;
        if (result) {
            // Extract the number part and increment it
            const lastBillNo = result.bno;
            const numberPart = lastBillNo.split('-')[2];
            const lastNumber = parseInt(numberPart);
            nextNumber = lastNumber + 1;
        }
        
        // Format the new bill number with leading zeros (3 digits)
        const formattedNumber = nextNumber.toString().padStart(3, '0');
        const nextBillNo = `${prefix}-${currentYear}-${formattedNumber}`;
        
        res.json({ billNo: nextBillNo });
    } catch (err) {
        console.error('Error generating next bill number:', err);
        res.status(500).json({ error: err.message });
    }
};

// ... existing imports

exports.lookupGST = async (req, res) => {
    const { gstin } = req.query;

    if (!gstin) {
        return res.status(400).json({ error: 'GSTIN is required' });
    }

    // RAPID API CONFIG (Keep your secrets on the server!)
    const RAPIDAPI_KEY = '520f2a3f21msh31f572b09541cffp199102jsn33e8d1e9997d'; 
    const url = `https://powerful-gstin-tool.p.rapidapi.com/v1/gstin/${gstin}/details`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': 'powerful-gstin-tool.p.rapidapi.com'
            }
        });

        const data = await response.json();
        
        // Pass the data back to your frontend
        res.json(data);

    } catch (error) {
        console.error('GST API Error:', error);
        res.status(500).json({ error: 'Failed to fetch GST details' });
    }
};