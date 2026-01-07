const db = require('../../config/db');

// Helper to get current ISO time
const now = () => new Date().toISOString();

const getActorUsername = (req) => (req && req.user && req.user.username ? req.user.username : null);

exports.renderStocksPage = (req, res) => {
    // You can pass the logged-in user here if available in req.user
    res.render('inventory/stocks', { title: 'Stock Management', user: req.user || { username: 'Guest' } });
};

exports.renderBillsPage = (req, res) => {
    // You can pass the logged-in user here if available in req.user
    res.render('inventory/bills', { title: 'Inventory Bills', user: req.user || { username: 'Guest' } });
};

exports.renderSalesReportPage = (req, res) => {
    // You can pass the logged-in user here if available in req.user
    res.render('inventory/sales-report', { title: 'Sales Report', user: req.user || { username: 'Guest' } });
};

exports.getAllStocks = (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM stocks ORDER BY created_at DESC');
        const stocks = stmt.all();
        
        // Parse batches JSON for each stock
        const stocksWithBatches = stocks.map(stock => {
            return {
                ...stock,
                batches: stock.batches ? JSON.parse(stock.batches) : []
            };
        });
        
        res.json(stocksWithBatches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPartyItemHistory = (req, res) => {
    try {
        const partyId = parseInt(req.query.partyId);
        const stockId = parseInt(req.query.stockId);
        const limit = req.query.limit === 'all' ? null : Math.min(parseInt(req.query.limit) || 10, 500);

        if (!partyId || !stockId) {
            return res.status(400).json({ error: 'partyId and stockId are required' });
        }

        let query = `
            SELECT 
                sr.id as reg_id,
                sr.stock_id,
                sr.item,
                sr.batch,
                sr.hsn,
                sr.qty,
                sr.uom,
                sr.rate,
                sr.grate,
                sr.disc,
                sr.total,
                sr.bno,
                sr.bdate,
                sr.created_at,
                b.id as bill_id,
                b.party_id,
                b.firm,
                b.usern
            FROM stock_reg sr
            JOIN bills b ON b.id = sr.bill_id
            WHERE b.party_id = ?
              AND sr.stock_id = ?
              AND sr.type = 'SALE'
            ORDER BY COALESCE(sr.bdate, b.bdate, sr.created_at) DESC
        `;
        
        const params = [partyId, stockId];
        
        if (limit !== null) {
            query += ' LIMIT ?';
            params.push(limit);
        }

        const stmt = db.prepare(query);
        const rows = stmt.all(...params);
        res.json({ partyId, stockId, rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createStock = (req, res) => {
    try {
        const { item, pno, batch, oem, hsn, qty, uom, rate, grate, mrp, expiryDate } = req.body;

        const actorUsername = getActorUsername(req);
        if (!actorUsername) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Check if item already exists
        const existingStock = db.prepare('SELECT * FROM stocks WHERE item = ?').get(item);
        
        if (existingStock) {
            // Item exists, update batches JSON
            let batches = existingStock.batches ? JSON.parse(existingStock.batches) : [];
            
            // Check if batch already exists
            const existingBatchIndex = batches.findIndex(b => b.batch === batch);
            
            if (existingBatchIndex !== -1) {
                // Update existing batch
                batches[existingBatchIndex].qty += parseFloat(qty);
                if (mrp) batches[existingBatchIndex].mrp = parseFloat(mrp);
                if (expiryDate) batches[existingBatchIndex].expiry = expiryDate;
                if (rate) batches[existingBatchIndex].rate = parseFloat(rate);
            } else {
                // Add new batch
                batches.push({
                    batch: batch || null,
                    qty: parseFloat(qty),
                    rate: parseFloat(rate),
                    expiry: expiryDate || null,
                    mrp: mrp ? parseFloat(mrp) : null
                });
            }
            
            // Calculate new total quantity
            const newTotalQty = batches.reduce((sum, b) => sum + b.qty, 0);
            const newTotal = newTotalQty * parseFloat(rate); // Using provided rate
            
            // Update the stock record
            const updateStmt = db.prepare(`
                UPDATE stocks 
                SET qty = @qty, total = @total, mrp = @mrp, batches = @batches, user = @user, updated_at = @updated_at
                WHERE item = @item
            `);
            
            updateStmt.run({
                item,
                qty: newTotalQty,
                total: newTotal,
                mrp: mrp ? parseFloat(mrp) : null,
                batches: JSON.stringify(batches),
                user: actorUsername,
                updated_at: now()
            });
            
            res.json({ id: existingStock.id, message: 'Stock batch updated successfully' });
        } else {
            // Item doesn't exist, create new record with batch
            const batches = [{
                batch: batch || null,
                qty: parseFloat(qty),
                rate: parseFloat(rate),
                expiry: expiryDate || null,
                mrp: mrp ? parseFloat(mrp) : null
            }];
            
            const total = parseFloat(qty) * parseFloat(rate);

            const stmt = db.prepare(`
                INSERT INTO stocks (item, pno, oem, hsn, qty, uom, rate, grate, total, mrp, batches, user, created_at, updated_at)
                VALUES (@item, @pno, @oem, @hsn, @qty, @uom, @rate, @grate, @total, @mrp, @batches, @user, @created_at, @updated_at)
            `);

            const result = stmt.run({
                item,
                pno: pno || null,
                oem: oem || null,
                hsn,
                qty: parseFloat(qty),
                uom,
                rate: parseFloat(rate),
                grate: parseFloat(grate),
                total,
                mrp: mrp ? parseFloat(mrp) : null,
                batches: JSON.stringify(batches),
                user: actorUsername,
                created_at: now(),
                updated_at: now()
            });

            res.json({ id: result.lastInsertRowid, message: 'Stock added successfully' });
        }
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.updateStock = (req, res) => {
    try {
        const { id } = req.params;
        const { item, pno, batch, oem, hsn, qty, uom, rate, grate, mrp, expiryDate } = req.body;

        const actorUsername = getActorUsername(req);
        if (!actorUsername) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Get the current stock record
        const currentStock = db.prepare('SELECT * FROM stocks WHERE id = ?').get(id);
        if (!currentStock) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        
        // Parse existing batches
        let batches = currentStock.batches ? JSON.parse(currentStock.batches) : [];
        
        // If batch is specified, update that specific batch
        if (batch) {
            const batchIndex = batches.findIndex(b => b.batch === batch);
            if (batchIndex !== -1) {
                // Update existing batch
                batches[batchIndex].qty = parseFloat(qty);
                if (rate) batches[batchIndex].rate = parseFloat(rate);
                if (expiryDate) batches[batchIndex].expiry = expiryDate;
                if (mrp) batches[batchIndex].mrp = parseFloat(mrp);
            } else {
                // If batch doesn't exist in the array, add it
                batches.push({
                    batch: batch,
                    qty: parseFloat(qty),
                    rate: parseFloat(rate),
                    expiry: expiryDate || null,
                    mrp: mrp ? parseFloat(mrp) : null
                });
            }
        } else {
            // If no batch specified, update the first batch or add as non-batched
            if (batches.length > 0) {
                batches[0].qty = parseFloat(qty);
                if (rate) batches[0].rate = parseFloat(rate);
                if (expiryDate) batches[0].expiry = expiryDate;
                if (mrp) batches[0].mrp = parseFloat(mrp);
            } else {
                // Add as non-batched entry
                batches.push({
                    batch: null,
                    qty: parseFloat(qty),
                    rate: parseFloat(rate),
                    expiry: expiryDate || null,
                    mrp: mrp ? parseFloat(mrp) : null
                });
            }
        }
        
        // Calculate new total quantity
        const newTotalQty = batches.reduce((sum, b) => sum + b.qty, 0);
        const newTotal = newTotalQty * parseFloat(rate || currentStock.rate);
        
        const stmt = db.prepare(`
            UPDATE stocks SET 
                item = @item, pno = @pno, oem = @oem, hsn = @hsn, 
                qty = @qty, uom = @uom, rate = @rate, grate = @grate, total = @total, 
                mrp = @mrp, batches = @batches, user = @user, updated_at = @updated_at
            WHERE id = @id
        `);

        stmt.run({
            id,
            item,
            pno: pno || null,
            oem: oem || null,
            hsn,
            qty: newTotalQty,
            uom,
            rate: parseFloat(rate || currentStock.rate),
            grate: parseFloat(grate),
            total: newTotal,
            mrp: mrp ? parseFloat(mrp) : null,
            batches: JSON.stringify(batches),
            user: actorUsername,
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
        const { firm, gstin, contact, state, state_code, addr, pin, pan } = req.body;

        const actorUsername = getActorUsername(req);
        if (!actorUsername) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
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
            user: actorUsername,
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
    const { meta, party, cart, otherCharges } = req.body; 

    const actorUsername = getActorUsername(req);
    if (!actorUsername) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!cart || cart.length === 0) {
        return res.status(400).json({ error: "Cart cannot be empty" });
    }

    // 1. Calculate Header Totals
    let gtot = 0; // Taxable Total (items + other charges)
    let totalTax = 0; // Tax on items only

    cart.forEach(item => {
        const lineVal = item.qty * item.rate * (1 - (item.disc || 0)/100);
        const lineTax = lineVal * (item.grate / 100);
        gtot += lineVal;
        totalTax += lineTax;
    });

    // Calculate other charges total and their GST
    let otherChargesTotal = 0;
    let otherChargesGstTotal = 0;
    
    if (otherCharges && otherCharges.length > 0) {
        otherCharges.forEach(charge => {
            const chargeAmount = parseFloat(charge.amount) || 0;
            const chargeGstRate = parseFloat(charge.gstRate) || 0;
            const chargeGstAmount = (chargeAmount * chargeGstRate) / 100;
            otherChargesTotal += chargeAmount;
            otherChargesGstTotal += chargeGstAmount;
        });
    }
    
    // According to Indian GST Standards:
    // gtot = taxable value of items + other charges (total taxable amount)
    gtot = gtot + otherChargesTotal;
    
    // Calculate tax amounts for CGST/SGST or IGST based on supply type
    let cgst = 0, sgst = 0, igst = 0;
    
    if (meta.billType === 'intra-state') {
        cgst = (totalTax / 2) + (otherChargesGstTotal / 2); // CGST on items + other charges
        sgst = (totalTax / 2) + (otherChargesGstTotal / 2); // SGST on items + other charges
    } else {
        igst = totalTax + otherChargesGstTotal; // IGST on items + other charges
    }
    
    // For reverse charge, tax is calculated but not added to ntot (grand total)
    // The tax liability shifts to the recipient
    const ntot = gtot + (meta.reverseCharge ? 0 : totalTax + otherChargesGstTotal); // Grand Total
    const supplyState = party.state || 'Local';

    // 2. Perform Transaction (Insert Bill -> Insert Items -> Deduct Stock)
    const transaction = db.transaction(() => {
        // A. Insert Bill Header - Check for duplicate bill numbers
        const insertBill = db.prepare(`
            INSERT INTO bills (
                bno, bdate, supply, addr, gstin, state, 
                gtot, ntot, btype, usern, firm, 
                party_id, oth_chg_json, order_no, vehicle_no, dispatch_through, narration, created_at, updated_at, reverse_charge,
                cgst, sgst, igst
            ) VALUES (
                @bno, @bdate, @supply, @addr, @gstin, @state,
                @gtot, @ntot, @btype, @usern, @firm,
                @party_id, @oth_chg_json, @order_no, @vehicle_no, @dispatch_through, @narration, @created_at, @updated_at, @reverse_charge,
                @cgst, @sgst, @igst
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
                    usern: actorUsername,
                    firm: party.firm,
                    party_id: party.id || null,
                    oth_chg_json: otherCharges && otherCharges.length > 0 ? JSON.stringify(otherCharges) : null,
                    order_no: meta.referenceNo || null,
                    vehicle_no: meta.vehicleNo || null,
                    dispatch_through: meta.dispatchThrough || null,
                    narration: meta.narration || null,
                    created_at: now(),
                    updated_at: now(),
                    reverse_charge: meta.reverseCharge || 0, // Store reverse charge flag in database
                    cgst: cgst,
                    sgst: sgst,
                    igst: igst
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
                type, bno, bdate, supply, item, item_narration, batch, hsn, 
                qty, uom, rate, grate, disc, total, 
                stock_id, bill_id, user, firm, created_at, updated_at, qtyh
            ) VALUES (
                'SALE', @bno, @bdate, @supply, @item, @item_narration, @batch, @hsn,
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

            // Get the stock record to update the specific batch
            const stockRecord = db.prepare('SELECT * FROM stocks WHERE id = ?').get(item.stockId);
            if (!stockRecord) {
                throw new Error(`Stock record not found for ID: ${item.stockId}`);
            }
            
            // Parse existing batches
            let batches = stockRecord.batches ? JSON.parse(stockRecord.batches) : [];
            
            // Find the specific batch to deduct from
            const batchIndex = batches.findIndex(b => b.batch === item.batch);
            if (batchIndex === -1) {
                throw new Error(`Batch ${item.batch} not found for item ${item.item}`);
            }
            
            // Update the specific batch quantity
            batches[batchIndex].qty -= item.qty;
            if (batches[batchIndex].qty < 0) {
                throw new Error(`Insufficient quantity in batch ${item.batch} for item ${item.item}`);
            }
            
            // Calculate new total quantity
            const newTotalQty = batches.reduce((sum, b) => sum + b.qty, 0);
            
            // Update the stock record with new batches and total quantity
            const updateStockBatchesStmt = db.prepare(`
                UPDATE stocks 
                SET qty = @qty, batches = @batches, user = @user, updated_at = @updated_at
                WHERE id = @id
            `);
            
            updateStockBatchesStmt.run({
                id: item.stockId,
                qty: newTotalQty,
                batches: JSON.stringify(batches),
                user: actorUsername,
                updated_at: now()
            });

            insertReg.run({
                bno: meta.billNo,
                bdate: meta.billDate,
                supply: supplyState,
                item: item.item,
                item_narration: item.narration || null,  // Add item narration if available
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
                user: actorUsername,
                firm: party.firm,
                created_at: now(),
                updated_at: now()
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
}

// Get complete bill details by ID
exports.getBillById = (req, res) => {
    try {
        const { id } = req.params;
        
        // Get bill header information
        if (!id) {
            return res.status(400).json({ error: 'Bill ID is required' });
        }
        
        const billStmt = db.prepare('SELECT * FROM bills WHERE id = ?');
        let bill = billStmt.get(id);
        
        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }
        
        // Parse other charges if exists
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
        
        // Add reverse charge information to the meta object
        bill.reverseCharge = bill.reverse_charge || false;
        
        // Add stored tax amounts
        bill.cgst = bill.cgst || 0;
        bill.sgst = bill.sgst || 0;
        bill.igst = bill.igst || 0;
        
        // Get bill items from stock_reg table
        const itemsStmt = db.prepare('SELECT *, item_narration FROM stock_reg WHERE bill_id = ? ORDER BY created_at');
        bill.items = itemsStmt.all(id);
        
        res.json(bill);
    } catch (err) {
        res.status(500).json({ error: err.message });
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
            
            // Add reverse charge information
            bill.reverseCharge = bill.reverse_charge || false;
            
            // Add stored tax amounts
            bill.cgst = bill.cgst || 0;
            bill.sgst = bill.sgst || 0;
            bill.igst = bill.igst || 0;
            
            return bill;
        });
        
        res.json(processedBills);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get all batches for a specific stock item
exports.getStockBatches = (req, res) => {
    try {
        const { id } = req.params;
        
        const stock = db.prepare('SELECT * FROM stocks WHERE id = ?').get(id);
        if (!stock) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        
        const batches = stock.batches ? JSON.parse(stock.batches) : [];
        
        res.json({
            id: stock.id,
            item: stock.item,
            batches: batches
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Function to get unique other charges types for auto-complete
exports.getOtherChargesTypes = (req, res) => {
    try {
        // Query to get unique charge types from bills table
        const query = `SELECT DISTINCT json_extract(oth_chg_json, '$[0].type') as type,
                                  json_extract(oth_chg_json, '$[0].name') as name,
                                  json_extract(oth_chg_json, '$[0].hsnSac') as hsnSac,
                                  json_extract(oth_chg_json, '$[0].gstRate') as gstRate
                           FROM bills 
                           WHERE oth_chg_json IS NOT NULL 
                           AND oth_chg_json != 'null'
                           AND oth_chg_json != ''
                           ORDER BY json_extract(oth_chg_json, '$[0].type')`;
        
        const stmt = db.prepare(query);
        const results = stmt.all();
        
        // Process results to extract unique combinations
        const uniqueCharges = [];
        const seen = new Set();
        
        results.forEach(row => {
            if (row.type) {
                const key = `${row.type}-${row.name || ''}-${row.hsnSac || ''}-${row.gstRate || ''}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueCharges.push({
                        type: row.type,
                        name: row.name || '',
                        hsnSac: row.hsnSac || '',
                        gstRate: row.gstRate ? parseFloat(row.gstRate) : 0
                    });
                }
            }
        });
        
        res.json(uniqueCharges);
    } catch (err) {
        console.error('Error fetching other charges types:', err);
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