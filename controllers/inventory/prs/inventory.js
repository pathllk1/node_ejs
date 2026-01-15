const db = require('../../../config/db');
const { verifyFirmAccess, verifyFirmOwnership, addFirmId } = require('../../../middleware/firmMiddleware');
const { getNextBillNumber, getCurrentFinancialYear, getNextBillNumberPreview, getCurrentSequence } = require('../../../utils/billNumberGenerator');

// Helper to get current ISO time
const now = () => new Date().toISOString();

const getActorUsername = (req) => (req && req.user && req.user.username ? req.user.username : null);

exports.renderStocksPage = (req, res) => {
    // Fetch firm name for the logged-in user
    let firmName = '';
    if (req.user && req.user.firm_id) {
        const firmStmt = db.prepare('SELECT name FROM firms WHERE id = ?');
        const firm = firmStmt.get(req.user.firm_id);
        firmName = firm ? firm.name : '';
    }
    
    // You can pass the logged-in user here if available in req.user
    res.render('inventory/stocks', { 
        title: 'Stock Management', 
        user: { 
            ...req.user, 
            firm_name: firmName 
        } || { username: 'Guest', firm_name: '' } 
    });
};

exports.renderPurchasePage = (req, res) => {
    // Fetch firm name for the logged-in user
    let firmName = '';
    if (req.user && req.user.firm_id) {
        const firmStmt = db.prepare('SELECT name FROM firms WHERE id = ?');
        const firm = firmStmt.get(req.user.firm_id);
        firmName = firm ? firm.name : '';
    }
    
    // You can pass the logged-in user here if available in req.user
    res.render('inventory/purchase', { 
        title: 'Purchase', 
        user: { 
            ...req.user, 
            firm_name: firmName 
        } || { username: 'Guest', firm_name: '' } 
    });
};

exports.renderBillsPage = (req, res) => {
    // Fetch firm name for the logged-in user
    let firmName = '';
    if (req.user && req.user.firm_id) {
        const firmStmt = db.prepare('SELECT name FROM firms WHERE id = ?');
        const firm = firmStmt.get(req.user.firm_id);
        firmName = firm ? firm.name : '';
    }
    
    // You can pass the logged-in user here if available in req.user
    res.render('inventory/bills', { 
        title: 'Inventory Bills', 
        user: { 
            ...req.user, 
            firm_name: firmName 
        } || { username: 'Guest', firm_name: '' } 
    });
};

exports.renderSalesReportPage = (req, res) => {
    // Fetch firm name for the logged-in user
    let firmName = '';
    if (req.user && req.user.firm_id) {
        const firmStmt = db.prepare('SELECT name FROM firms WHERE id = ?');
        const firm = firmStmt.get(req.user.firm_id);
        firmName = firm ? firm.name : '';
    }
    
    // You can pass the logged-in user here if available in req.user
    res.render('inventory/sales-report', { 
        title: 'Sales Report', 
        user: { 
            ...req.user, 
            firm_name: firmName 
        } || { username: 'Guest', firm_name: '' } 
    });
};

exports.getAllStocks = (req, res) => {
    try {
        // Check if user has firm access
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }
        
        const stmt = db.prepare('SELECT * FROM stocks WHERE firm_id = ? ORDER BY created_at DESC');
        const stocks = stmt.all(req.user.firm_id);
        
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
              AND sr.type = 'PURCHASE'
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
        let { item, pno, batch, oem, hsn, qty, uom, rate, grate, mrp, expiryDate, batches } = req.body;

        if ((!batch && !qty && !rate && !mrp && !expiryDate) && batches) {
            try {
                const parsed = Array.isArray(batches) ? batches : JSON.parse(batches);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const b0 = parsed[0] || {};
                    batch = b0.batch ?? batch;
                    qty = b0.qty ?? qty;
                    rate = b0.rate ?? rate;
                    mrp = b0.mrp ?? mrp;
                    expiryDate = b0.expiry ?? expiryDate;
                    batches = parsed;
                }
            } catch (e) {
                // ignore JSON parse issues and fall back to direct fields
            }
        }

        const normalizedBatches = (() => {
            if (!batches) return null;
            try {
                const parsed = Array.isArray(batches) ? batches : JSON.parse(batches);
                return Array.isArray(parsed) ? parsed : null;
            } catch (e) {
                return null;
            }
        })();

        const actorUsername = getActorUsername(req);
        if (!actorUsername) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Check if user has firm access
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }
        
        // Check if item already exists in the same firm
        const existingStock = db.prepare('SELECT * FROM stocks WHERE item = ? AND firm_id = ?').get(item, req.user.firm_id);
        
        if (existingStock) {
            // Item exists in this firm, update batches JSON
            let existingBatches = existingStock.batches ? JSON.parse(existingStock.batches) : [];
            const incomingBatches = normalizedBatches;

            if (incomingBatches && incomingBatches.length > 0) {
                const b0 = incomingBatches[0] || {};
                batch = b0.batch ?? batch;
                qty = b0.qty ?? qty;
                rate = b0.rate ?? rate;
                mrp = b0.mrp ?? mrp;
                expiryDate = b0.expiry ?? expiryDate;
            }

            // Check if batch already exists
            const existingBatchIndex = existingBatches.findIndex(b => b.batch === batch);

            if (existingBatchIndex !== -1) {
                // Update existing batch
                existingBatches[existingBatchIndex].qty += parseFloat(qty);
                if (mrp !== undefined && mrp !== null && mrp !== '') existingBatches[existingBatchIndex].mrp = parseFloat(mrp);
                if (expiryDate) existingBatches[existingBatchIndex].expiry = expiryDate;
                if (rate !== undefined && rate !== null && rate !== '') existingBatches[existingBatchIndex].rate = parseFloat(rate);
            } else {
                // Add new batch
                existingBatches.push({
                    batch: batch || null,
                    qty: parseFloat(qty),
                    rate: parseFloat(rate),
                    expiry: expiryDate || null,
                    mrp: mrp ? parseFloat(mrp) : null
                });
            }

            // Calculate new total quantity
            const newTotalQty = existingBatches.reduce((sum, b) => sum + b.qty, 0);
            const newTotal = newTotalQty * parseFloat(rate); // Using provided rate
            
            // Update the stock record
            const updateStmt = db.prepare(`
                UPDATE stocks 
                SET qty = @qty, total = @total, mrp = @mrp, batches = @batches, user = @user, updated_at = @updated_at
                WHERE item = @item AND firm_id = @firm_id
            `);
            
            updateStmt.run({
                item,
                qty: newTotalQty,
                total: newTotal,
                mrp: mrp ? parseFloat(mrp) : null,
                batches: JSON.stringify(existingBatches),
                user: actorUsername,
                updated_at: now(),
                firm_id: req.user.firm_id
            });
            
            res.json({ id: existingStock.id, message: 'Stock batch updated successfully' });
        } else {
            // Item doesn't exist in this firm, create new record with batch
            const batchesToStore = (normalizedBatches && normalizedBatches.length > 0)
                ? normalizedBatches
                : [{
                    batch: batch || null,
                    qty: parseFloat(qty),
                    rate: parseFloat(rate),
                    expiry: expiryDate || null,
                    mrp: mrp ? parseFloat(mrp) : null
                }];
            
            const total = parseFloat(qty) * parseFloat(rate);

            const stmt = db.prepare(`
                INSERT INTO stocks (item, pno, oem, hsn, qty, uom, rate, grate, total, mrp, batches, user, created_at, updated_at, firm_id)
                VALUES (@item, @pno, @oem, @hsn, @qty, @uom, @rate, @grate, @total, @mrp, @batches, @user, @created_at, @updated_at, @firm_id)
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
                batches: JSON.stringify(batchesToStore),
                user: actorUsername,
                created_at: now(),
                updated_at: now(),
                firm_id: req.user.firm_id
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
        let { item, pno, batch, oem, hsn, qty, uom, rate, grate, mrp, expiryDate, batches: incomingBatches } = req.body;

        const actorUsername = getActorUsername(req);
        if (!actorUsername) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Check if user has firm access
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }
        
        // Get the current stock record
        const currentStock = db.prepare('SELECT * FROM stocks WHERE id = ? AND firm_id = ?').get(id, req.user.firm_id);
        if (!currentStock) {
            return res.status(404).json({ error: 'Stock not found or does not belong to your firm' });
        }
        
        // Parse existing batches
        let batches = currentStock.batches ? JSON.parse(currentStock.batches) : [];

        // If UI sent batches JSON (new batch system), prefer it
        if (incomingBatches) {
            try {
                const parsed = Array.isArray(incomingBatches) ? incomingBatches : JSON.parse(incomingBatches);
                if (Array.isArray(parsed)) {
                    batches = parsed;
                }
            } catch (e) {
                // ignore parse errors and fall back to existing batches + direct fields
            }

            // Derive convenience fields when missing
            const b0 = Array.isArray(batches) && batches.length > 0 ? (batches[0] || {}) : null;
            if (b0) {
                if (!batch && (b0.batch !== undefined)) batch = b0.batch;
                if (!qty && (b0.qty !== undefined)) qty = b0.qty;
                if (!rate && (b0.rate !== undefined)) rate = b0.rate;
                if (!mrp && (b0.mrp !== undefined)) mrp = b0.mrp;
                if (!expiryDate && (b0.expiry !== undefined)) expiryDate = b0.expiry;
            }
        }

        // If batch is specified, update that specific batch
        if (!incomingBatches && batch) {
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
        } else if (!incomingBatches) {
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
        const effectiveRate = parseFloat(rate || currentStock.rate || 0);
        const newTotal = newTotalQty * effectiveRate;
        
        const stmt = db.prepare(`
            UPDATE stocks SET 
                item = @item, pno = @pno, oem = @oem, hsn = @hsn, 
                qty = @qty, uom = @uom, rate = @rate, grate = @grate, total = @total, 
                mrp = @mrp, batches = @batches, user = @user, updated_at = @updated_at
            WHERE id = @id AND firm_id = @firm_id
        `);

        stmt.run({
            id,
            item,
            pno: pno || null,
            oem: oem || null,
            hsn,
            qty: newTotalQty,
            uom,
            rate: effectiveRate,
            grate: parseFloat(grate),
            total: newTotal,
            mrp: mrp ? parseFloat(mrp) : null,
            batches: JSON.stringify(batches),

            user: actorUsername,
            updated_at: now(),
            firm_id: req.user.firm_id
        });

        res.json({ message: 'Stock updated successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteStock = (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if user has firm access
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }
        
        const stmt = db.prepare('DELETE FROM stocks WHERE id = ? AND firm_id = ?');
        const result = stmt.run(id, req.user.firm_id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Stock not found or does not belong to your firm' });
        }
        
        res.json({ message: 'Stock deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- PARTIES API ---

exports.getAllParties = (req, res) => {
    try {
        // Check if user has firm access
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }
        
        const stmt = db.prepare('SELECT * FROM parties WHERE firm_id = ? ORDER BY created_at DESC');
        const parties = stmt.all(req.user.firm_id);
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
        
        // Check if user has firm access
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }
        
        const stmt = db.prepare(`
            INSERT INTO parties (firm, gstin, contact, state, state_code, addr, pin, pan, usern, supply, created_at, updated_at, firm_id)
            VALUES (@firm, @gstin, @contact, @state, @state_code, @addr, @pin, @pan, @user, @supply, @created_at, @updated_at, @firm_id)
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
            updated_at: now(),
            firm_id: req.user.firm_id
        });

        res.json({ id: result.lastInsertRowid, message: 'Party created successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// --- BILLS API (Purchase Transaction) ---

exports.createBill = (req, res) => {
    // Expects: { meta: {}, party: {}, cart: [], otherCharges: [], user: '' }
    const { meta, party, cart, otherCharges } = req.body; 

    const actorUsername = getActorUsername(req);
    if (!actorUsername) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has firm access
    if (!req.user || !req.user.firm_id) {
        return res.status(403).json({ error: 'User is not associated with any firm' });
    }

    if (!cart || cart.length === 0) {
        return res.status(400).json({ error: "Cart cannot be empty" });
    }
    
    // STRICT: Generate bill number server-side only when bill is actually saved
    let billNo;
    try {
        billNo = getNextBillNumber(req.user.firm_id);
        console.log(`[CREATE_BILL] Generated bill number: ${billNo}`);
    } catch (error) {
        console.error(`[CREATE_BILL] Failed to generate bill number:`, error.message);
        return res.status(500).json({ error: `Failed to generate bill number: ${error.message}` });
    }
    
    // Set the generated bill number
    meta.billNo = billNo;

    // Check GST status to determine if tax calculations should be performed
    // First check for firm-specific GST setting
    const firmGstSetting = db.prepare(
        'SELECT setting_value FROM firm_settings WHERE firm_id = ? AND setting_key = ?'
    ).get(req.user.firm_id, 'gst_enabled');
    
    let gstEnabled;
    if (firmGstSetting) {
        // Use firm-specific setting
        gstEnabled = firmGstSetting.setting_value === 'true';
    } else {
        // Fall back to global setting if no firm-specific setting exists
        const gstSetting = db.prepare('SELECT setting_value FROM settings WHERE setting_key = ?').get('gst_enabled');
        gstEnabled = gstSetting ? gstSetting.setting_value === 'true' : true; // Default to true if not found
    }

    // 1. Calculate Header Totals
    let gtot = 0; // Taxable Total (items + other charges)
    let totalTax = 0; // Tax on items only

    cart.forEach(item => {
        const lineVal = item.qty * item.rate * (1 - (item.disc || 0)/100);
        if (gstEnabled) {
            const lineTax = lineVal * (item.grate / 100);
            totalTax += lineTax;
        }
        gtot += lineVal;
    });

    // Calculate other charges total and their GST
    let otherChargesTotal = 0;
    let otherChargesGstTotal = 0;
    
    if (otherCharges && otherCharges.length > 0) {
        otherCharges.forEach(charge => {
            const chargeAmount = parseFloat(charge.amount) || 0;
            otherChargesTotal += chargeAmount;
            
            if (gstEnabled) {
                const chargeGstRate = parseFloat(charge.gstRate) || 0;
                const chargeGstAmount = (chargeAmount * chargeGstRate) / 100;
                otherChargesGstTotal += chargeGstAmount;
            }
        });
    }
    
    // According to Indian GST Standards (when GST is enabled):
    // gtot = taxable value of items + other charges (total taxable amount)
    gtot = gtot + otherChargesTotal;
    
    // Calculate tax amounts for CGST/SGST or IGST based on supply type (only when GST is enabled)
    let cgst = 0, sgst = 0, igst = 0;
    
    if (gstEnabled && meta.billType === 'intra-state') {
        cgst = (totalTax / 2) + (otherChargesGstTotal / 2); // CGST on items + other charges
        sgst = (totalTax / 2) + (otherChargesGstTotal / 2); // SGST on items + other charges
    } else if (gstEnabled) {
        igst = totalTax + otherChargesGstTotal; // IGST on items + other charges
    }
    
    // For reverse charge, tax is calculated but not added to ntot (grand total)
    // The tax liability shifts to the recipient
    // When GST is disabled, tax values are 0, so ntot = gtot only
    let ntot = gtot + (meta.reverseCharge ? 0 : totalTax + otherChargesGstTotal); // Grand Total
    const roundedNtot = Math.round(ntot);
    const rof = (roundedNtot - ntot).toFixed(2);
    ntot = roundedNtot;

    const supplyState = party.state || 'Local';

    // 2. Perform Transaction (Insert Bill -> Insert Items -> Deduct Stock)
    const transaction = db.transaction(() => {
        // A. Insert Bill Header
        // NOTE: Bill number is generated server-side, no retry logic needed
        const insertBill = db.prepare(`
            INSERT INTO bills (
                bno, bdate, supply, addr, gstin, state, 
                gtot, ntot, rof, btype, usern, firm, 
                party_id, oth_chg_json, order_no, vehicle_no, dispatch_through, narration, created_at, updated_at, reverse_charge,
                cgst, sgst, igst, firm_id
            ) VALUES (
                @bno, @bdate, @supply, @addr, @gstin, @state,
                @gtot, @ntot, @rof, @btype, @usern, @firm,
                @party_id, @oth_chg_json, @order_no, @vehicle_no, @dispatch_through, @narration, @created_at, @updated_at, @reverse_charge,
                @cgst, @sgst, @igst, @firm_id
            )
        `);

        // STRICT: Single attempt (bill number already guaranteed unique)
        const billResult = insertBill.run({
            bno: meta.billNo,
            bdate: meta.billDate,
            supply: supplyState,
            addr: party.addr || '',
            gstin: party.gstin || 'UNREGISTERED',
            state: party.state || '',
            gtot: gtot,
            ntot: ntot,
            rof: rof,
            btype: meta.billType ? meta.billType.toUpperCase() : 'PURCHASE',
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
            reverse_charge: meta.reverseCharge || 0,
            cgst: cgst,
            sgst: sgst,
            igst: igst,
            firm_id: req.user.firm_id
        });

        const billId = billResult.lastInsertRowid;

        // B. Prepare Statements for Line Items
        const insertReg = db.prepare(`
            INSERT INTO stock_reg (
                type, bno, bdate, supply, item, item_narration, batch, hsn, 
                qty, uom, rate, grate, disc, total, 
                stock_id, bill_id, user, firm, created_at, updated_at, qtyh, firm_id
            ) VALUES (
                'PURCHASE', @bno, @bdate, @supply, @item, @item_narration, @batch, @hsn,
                @qty, @uom, @rate, @grate, @disc, @total,
                @stock_id, @bill_id, @user, @firm, @created_at, @updated_at, 0, @firm_id
            )
        `);

        // Note: updateStockQty is not used in purchase transactions since we use the updateStockBatchesStmt instead

            // C. Process Items
        cart.forEach(item => {
            const lineTotal = item.qty * item.rate * (1 - (item.disc || 0)/100);

            // Get the stock record to update the specific batch
            const stockRecord = db.prepare('SELECT * FROM stocks WHERE id = ? AND firm_id = ?').get(item.stockId, req.user.firm_id);
            if (!stockRecord) {
                throw new Error(`Stock record not found for ID: ${item.stockId} or does not belong to your firm`);
            }
            
            // Parse existing batches
            let batches = stockRecord.batches ? JSON.parse(stockRecord.batches) : [];
            
            // Find the specific batch to add to
            let batchIndex = -1;
            if (item.batch === null || item.batch === undefined || item.batch === '') {
                // Look for a batch with null/undefined/empty string value
                batchIndex = batches.findIndex(b => b.batch === null || b.batch === undefined || b.batch === '');
            } else {
                batchIndex = batches.findIndex(b => b.batch === item.batch);
            }
            
            // If batch doesn't exist, add new batch
            if (batchIndex === -1) {
                batches.push({
                    batch: item.batch || null,
                    qty: 0,
                    rate: item.rate,
                    expiry: null,
                    mrp: null
                });
                batchIndex = batches.length - 1; // Point to the newly added batch
            }
            
            // Update the specific batch quantity by adding the purchase quantity
            batches[batchIndex].qty += item.qty;
            
            // Calculate new total quantity
            const newTotalQty = batches.reduce((sum, b) => sum + b.qty, 0);
            
            // Update the stock record with new batches and total quantity
            const updateStockBatchesStmt = db.prepare(`
                UPDATE stocks 
                SET qty = @qty, batches = @batches, user = @user, updated_at = @updated_at
                WHERE id = @id AND firm_id = @firm_id
            `);
            
            updateStockBatchesStmt.run({
                id: item.stockId,
                qty: newTotalQty,
                batches: JSON.stringify(batches),
                user: actorUsername,
                updated_at: now(),
                firm_id: req.user.firm_id
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
                updated_at: now(),
                firm_id: req.user.firm_id
            });
        });

        // D. Ledger Postings
        const insertLedger = db.prepare(`
            INSERT INTO ledger (
                voucher_id, voucher_type, voucher_no, account_head, account_type,
                debit_amount, credit_amount, narration, bill_id, party_id,
                tax_type, tax_rate, transaction_date, created_by, firm_id,
                created_at, updated_at
            ) VALUES (
                @voucher_id, @voucher_type, @voucher_no, @account_head, @account_type,
                @debit_amount, @credit_amount, @narration, @bill_id, @party_id,
                @tax_type, @tax_rate, @transaction_date, @created_by, @firm_id,
                @created_at, @updated_at
            )
        `);

        const ledgerBase = {
            voucher_id: billId,
            voucher_type: 'PURCHASE',
            voucher_no: meta.billNo,
            bill_id: billId,
            transaction_date: meta.billDate,
            created_by: actorUsername,
            firm_id: req.user.firm_id,
            created_at: now(),
            updated_at: now()
        };

        // 1. Party DR Post
        insertLedger.run({
            ...ledgerBase,
            account_head: party.firm,
            account_type: 'CREDITOR',
            debit_amount: 0,
            credit_amount: ntot,
            narration: `Purchase Bill No: ${meta.billNo}`,
            party_id: party.id || null,
            tax_type: null,
            tax_rate: null
        });

        // 2. GST Posts
        if (cgst > 0) {
            insertLedger.run({
                ...ledgerBase,
                account_head: 'CGST',
                account_type: 'TAX',
                debit_amount: cgst,
                credit_amount: 0,
                narration: `CGST on Bill No: ${meta.billNo}`,
                party_id: null,
                tax_type: 'CGST',
                tax_rate: null
            });
        }
        if (sgst > 0) {
            insertLedger.run({
                ...ledgerBase,
                account_head: 'SGST',
                account_type: 'TAX',
                debit_amount: sgst,
                credit_amount: 0,
                narration: `SGST on Bill No: ${meta.billNo}`,
                party_id: null,
                tax_type: 'SGST',
                tax_rate: null
            });
        }
        if (igst > 0) {
            insertLedger.run({
                ...ledgerBase,
                account_head: 'IGST',
                account_type: 'TAX',
                debit_amount: igst,
                credit_amount: 0,
                narration: `IGST on Bill No: ${meta.billNo}`,
                party_id: null,
                tax_type: 'IGST',
                tax_rate: null
            });
        }

        // 3. Round Off Post
        if (Math.abs(parseFloat(rof)) > 0) {
            const rofVal = parseFloat(rof);
            insertLedger.run({
                ...ledgerBase,
                account_head: 'Round Off',
                account_type: 'INDIRECT EXPENSE',
                debit_amount: rofVal < 0 ? Math.abs(rofVal) : 0,
                credit_amount: rofVal > 0 ? rofVal : 0,
                narration: `Round off on Bill No: ${meta.billNo}`,
                party_id: null,
                tax_type: null,
                tax_rate: null
            });
        }

        // 4. Other Charges Post (Dynamic)
        if (otherCharges && otherCharges.length > 0) {
            otherCharges.forEach(charge => {
                const chargeAmount = parseFloat(charge.amount) || 0;
                if (chargeAmount > 0) {
                    insertLedger.run({
                        ...ledgerBase,
                        account_head: charge.name || charge.type || 'Other Charges',
                        account_type: 'EXPENSE',
                        debit_amount: chargeAmount,
                        credit_amount: 0,
                        narration: `${charge.name || charge.type || 'Other Charges'} on Bill No: ${meta.billNo}`,
                        party_id: null,
                        tax_type: null,
                        tax_rate: null
                    });
                }
            });
        }

        // 5. Purchase Account Post (To balance the ledger)
        const taxableItemsTotal = cart.reduce((sum, item) => sum + (item.qty * item.rate * (1 - (item.disc || 0)/100)), 0);
        insertLedger.run({
            ...ledgerBase,
            account_head: 'Purchase',
            account_type: 'EXPENSE',
            debit_amount: taxableItemsTotal,
            credit_amount: 0,
            narration: `Purchase on Bill No: ${meta.billNo}`,
            party_id: null,
            tax_type: null,
            tax_rate: null
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
        
        // Check if user has firm access
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }
        
        // Get bill header information
        if (!id) {
            return res.status(400).json({ error: 'Bill ID is required' });
        }
        
        // Join with stock_reg to get the transaction type (SALE/PURCHASE)
        const billStmt = db.prepare(`
            SELECT 
                b.*, 
                sr.type as transactionType
            FROM bills b
            LEFT JOIN (
                SELECT bill_id, type, MIN(id) as min_id 
                FROM stock_reg 
                GROUP BY bill_id
            ) sr ON b.id = sr.bill_id
            WHERE b.id = ? AND b.firm_id = ?
        `);
        let bill = billStmt.get(id, req.user.firm_id);
        
        if (!bill) {
            return res.status(404).json({ error: 'Bill not found or does not belong to your firm' });
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
        
        // Check GST status to determine if tax calculations were enabled when the bill was created
        // First check for firm-specific GST setting
        const firmGstSetting = db.prepare(
            'SELECT setting_value FROM firm_settings WHERE firm_id = ? AND setting_key = ?'
        ).get(req.user.firm_id, 'gst_enabled');
        
        if (firmGstSetting) {
            // Use firm-specific setting
            bill.gstEnabled = firmGstSetting.setting_value === 'true';
        } else {
            // Fall back to global setting if no firm-specific setting exists
            const gstSetting = db.prepare('SELECT setting_value FROM settings WHERE setting_key = ?').get('gst_enabled');
            bill.gstEnabled = gstSetting ? gstSetting.setting_value === 'true' : true; // Default to true if not found
        }
        
        // Map the stock_reg type to a more user-friendly transaction type
        // If transactionType exists from the joined query, convert it; otherwise default to PURCHASE
        bill.transactionType = bill.transactionType ? 
            (bill.transactionType === 'SALE' ? 'SALES' : 
             bill.transactionType === 'PURCHASE' ? 'PURCHASE' : 
             bill.transactionType) : 'PURCHASE';  // Default to PURCHASE for PRS
        
        // Get bill items from stock_reg table
        const itemsStmt = db.prepare('SELECT *, item_narration FROM stock_reg WHERE bill_id = ? AND firm_id = ? ORDER BY created_at');
        bill.items = itemsStmt.all(id, req.user.firm_id);
        
        res.json(bill);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAllBills = (req, res) => {
    try {
        // Check if user has firm access
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }
        
        // Join with stock_reg to get the transaction type (SALE/PURCHASE)
        // Use the first occurrence of type from stock_reg for each bill
        const stmt = db.prepare(`
            SELECT 
                b.*, 
                sr.type as transactionType
            FROM bills b
            LEFT JOIN (
                SELECT bill_id, type, MIN(id) as min_id 
                FROM stock_reg 
                GROUP BY bill_id
            ) sr ON b.id = sr.bill_id
            WHERE b.firm_id = ?
            ORDER BY b.created_at DESC
        `);
        const bills = stmt.all(req.user.firm_id);
        
        // Check GST status to determine if tax calculations were enabled when the bills were created
        // First check for firm-specific GST setting
        const firmGstSetting = db.prepare(
            'SELECT setting_value FROM firm_settings WHERE firm_id = ? AND setting_key = ?'
        ).get(req.user.firm_id, 'gst_enabled');
        
        let gstEnabled;
        if (firmGstSetting) {
            // Use firm-specific setting
            gstEnabled = firmGstSetting.setting_value === 'true';
        } else {
            // Fall back to global setting if no firm-specific setting exists
            const gstSetting = db.prepare('SELECT setting_value FROM settings WHERE setting_key = ?').get('gst_enabled');
            gstEnabled = gstSetting ? gstSetting.setting_value === 'true' : true; // Default to true if not found
        }
        
        // Parse the oth_chg_json field for each bill
        const processedBills = bills.map(bill => {
            // Mask sensitive data for cancelled or deleted bills
            if (bill.status === 'CANCELLED' || bill.status === 'DELETED') {
                return {
                    id: bill.id,
                    bno: bill.bno,
                    bdate: bill.bdate,
                    status: bill.status,
                    cancellation_reason: bill.cancellation_reason,
                    cancelled_at: bill.cancelled_at,
                    firm_id: bill.firm_id,
                    // Mask everything else
                    supply: '***',
                    addr: '***',
                    gstin: '***',
                    state: '***',
                    gtot: 0,
                    ntot: 0,
                    rof: 0,
                    cgst: 0,
                    sgst: 0,
                    igst: 0,
                    usern: bill.usern,
                    firm: '***',
                    otherCharges: [],
                    items: []
                };
            }

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
            
            // Add GST enabled status
            bill.gstEnabled = gstEnabled;
            
            // Map the stock_reg type to a more user-friendly transaction type
            // If transactionType exists from the joined query, convert it; otherwise default to PURCHASE
            bill.transactionType = bill.transactionType ? 
                (bill.transactionType === 'SALE' ? 'SALES' : 
                 bill.transactionType === 'PURCHASE' ? 'PURCHASE' : 
                 bill.transactionType) : 'PURCHASE';  // Default to PURCHASE for PRS
            
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
        
        // Check if user has firm access
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }
        
        const stock = db.prepare('SELECT * FROM stocks WHERE id = ? AND firm_id = ?').get(id, req.user.firm_id);
        if (!stock) {
            return res.status(404).json({ error: 'Stock not found or does not belong to your firm' });
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

// Get next available bill number information for the current firm (non-consuming)
// Returns info about next number without incrementing sequence
exports.getNextBillNumber = (req, res) => {
    try {
        // VALIDATION: Check firm access
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }
        
        const firmId = req.user.firm_id;
        const financialYear = getCurrentFinancialYear();
        
        // Use preview function to get next number without incrementing
        const nextBillNo = getNextBillNumberPreview(firmId, financialYear);
        
        // Also get sequence info separately
        const seqInfo = getCurrentSequence(firmId, financialYear);
        
        console.log(`[GET_NEXT_BILL_INFO] Next available for Firm ${firmId}: ${nextBillNo}`);
        
        res.json({ 
            nextBillNo: nextBillNo,
            nextSequence: seqInfo.next_sequence,
            financialYear: financialYear,
            currentSequence: seqInfo.current_sequence,
            format: 'F{FIRM_ID}-{SEQUENCE:4d}/{FINANCIAL_YEAR}',
            note: 'This is for display only, actual number generated when bill is saved'
        });
    } catch (error) {
        console.error('[GET_NEXT_BILL_INFO] Error:', error.message);
        res.status(500).json({ error: `Failed to get bill number info: ${error.message}` });
    }
};

// ... existing imports

// Update an existing bill
exports.updateBill = async (req, res) => {
    // Expects: { meta: {}, party: {}, cart: [], otherCharges: [], user: '' }
    const { meta, party, cart, otherCharges } = req.body;
    const { id } = req.params;

    const actorUsername = getActorUsername(req);
    if (!actorUsername) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has firm access
    if (!req.user || !req.user.firm_id) {
        return res.status(403).json({ error: 'User is not associated with any firm' });
    }

    if (!cart || cart.length === 0) {
        return res.status(400).json({ error: "Cart cannot be empty" });
    }

    // Check GST status to determine if tax calculations should be performed
    // First check for firm-specific GST setting
    const firmGstSetting = db.prepare(
        'SELECT setting_value FROM firm_settings WHERE firm_id = ? AND setting_key = ?'
    ).get(req.user.firm_id, 'gst_enabled');
    
    let gstEnabled;
    if (firmGstSetting) {
        // Use firm-specific setting
        gstEnabled = firmGstSetting.setting_value === 'true';
    } else {
        // Fall back to global setting if no firm-specific setting exists
        const gstSetting = db.prepare('SELECT setting_value FROM settings WHERE setting_key = ?').get('gst_enabled');
        gstEnabled = gstSetting ? gstSetting.setting_value === 'true' : true; // Default to true if not found
    }

    // 1. Calculate Header Totals
    let gtot = 0; // Taxable Total (items + other charges)
    let totalTax = 0; // Tax on items only

    cart.forEach(item => {
        const lineVal = item.qty * item.rate * (1 - (item.disc || 0)/100);
        if (gstEnabled) {
            const lineTax = lineVal * (item.grate / 100);
            totalTax += lineTax;
        }
        gtot += lineVal;
    });

    // Calculate other charges total and their GST
    let otherChargesTotal = 0;
    let otherChargesGstTotal = 0;
    
    if (otherCharges && otherCharges.length > 0) {
        otherCharges.forEach(charge => {
            const chargeAmount = parseFloat(charge.amount) || 0;
            otherChargesTotal += chargeAmount;
            
            if (gstEnabled) {
                const chargeGstRate = parseFloat(charge.gstRate) || 0;
                const chargeGstAmount = (chargeAmount * chargeGstRate) / 100;
                otherChargesGstTotal += chargeGstAmount;
            }
        });
    }
    
    // According to Indian GST Standards (when GST is enabled):
    // gtot = taxable value of items + other charges (total taxable amount)
    gtot = gtot + otherChargesTotal;
    
    // Calculate tax amounts for CGST/SGST or IGST based on supply type (only when GST is enabled)
    let cgst = 0, sgst = 0, igst = 0;
    
    if (gstEnabled && meta.billType === 'intra-state') {
        cgst = (totalTax / 2) + (otherChargesGstTotal / 2); // CGST on items + other charges
        sgst = (totalTax / 2) + (otherChargesGstTotal / 2); // SGST on items + other charges
    } else if (gstEnabled) {
        igst = totalTax + otherChargesGstTotal; // IGST on items + other charges
    }
    
    // For reverse charge, tax is calculated but not added to ntot (grand total)
    // The tax liability shifts to the recipient
    // When GST is disabled, tax values are 0, so ntot = gtot only
    let ntot = gtot + (meta.reverseCharge ? 0 : totalTax + otherChargesGstTotal); // Grand Total
    const roundedNtot = Math.round(ntot);
    const rof = (roundedNtot - ntot).toFixed(2);
    ntot = roundedNtot;
    const supplyState = party.state || 'Local';

    // 2. Get the existing bill to restore stock quantities
    const existingBill = db.prepare('SELECT * FROM bills WHERE id = ? AND firm_id = ?').get(id, req.user.firm_id);
    if (!existingBill) {
        return res.status(404).json({ error: 'Bill not found or does not belong to your firm' });
    }
    
    // STRICT: Prevent bill number changes (security & consistency)
    if (meta.billNo && meta.billNo !== existingBill.bno) {
        console.warn(`[SECURITY] Attempt to change bill number from ${existingBill.bno} to ${meta.billNo} by user ${actorUsername}`);
        return res.status(403).json({ error: 'Bill number cannot be changed. A bill is identified by its unique number.' });
    }
    
    // Use the existing bill number (ignore any provided value)
    meta.billNo = existingBill.bno;

    // 3. Get existing bill items to restore stock quantities
    const existingItems = db.prepare('SELECT * FROM stock_reg WHERE bill_id = ? AND firm_id = ?').all(id, req.user.firm_id);

    // 4. Perform Transaction (Restore Old Quantities -> Update Bill -> Update Items -> Deduct New Quantities)
    const transaction = db.transaction(() => {
        // A. Restore Original Quantities to Stock
        // For each existing item, add back the quantity to the respective batch
        existingItems.forEach(existingItem => {
            const stockRecord = db.prepare('SELECT * FROM stocks WHERE id = ? AND firm_id = ?').get(existingItem.stock_id, req.user.firm_id);
            if (!stockRecord) {
                throw new Error(`Stock record not found for ID: ${existingItem.stock_id} or does not belong to your firm`);
            }
            
            // Parse existing batches
            let batches = stockRecord.batches ? JSON.parse(stockRecord.batches) : [];
            
            // Find the specific batch to add quantity to
            // Handle case where batch might be null/undefined
            let batchIndex = -1;
            if (existingItem.batch === null || existingItem.batch === undefined || existingItem.batch === '') {
                // Look for a batch with null/undefined/empty string value
                batchIndex = batches.findIndex(b => b.batch === null || b.batch === undefined || b.batch === '');
            } else {
                batchIndex = batches.findIndex(b => b.batch === existingItem.batch);
            }
            
            if (batchIndex !== -1) {
                // Add back the original quantity to this batch
                batches[batchIndex].qty += existingItem.qty;
                
                // Calculate new total quantity
                const newTotalQty = batches.reduce((sum, b) => sum + b.qty, 0);
                
                // Update the stock record with new batches and total quantity
                const updateStockBatchesStmt = db.prepare(`
                    UPDATE stocks 
                    SET qty = @qty, batches = @batches, user = @user, updated_at = @updated_at
                    WHERE id = @id AND firm_id = @firm_id
                `);
                
                updateStockBatchesStmt.run({
                    id: existingItem.stock_id,
                    qty: newTotalQty,
                    batches: JSON.stringify(batches),
                    user: actorUsername,
                    updated_at: now(),
                    firm_id: req.user.firm_id
                });
            }
        });
        
        // B. Update Bill Header
        const updateBill = db.prepare(`
            UPDATE bills SET 
                bno = @bno, bdate = @bdate, supply = @supply, addr = @addr, gstin = @gstin, state = @state,
                gtot = @gtot, ntot = @ntot, btype = @btype, usern = @usern, firm = @firm,
                party_id = @party_id, oth_chg_json = @oth_chg_json, order_no = @order_no, vehicle_no = @vehicle_no, 
                dispatch_through = @dispatch_through, narration = @narration, updated_at = @updated_at, 
                reverse_charge = @reverse_charge, cgst = @cgst, sgst = @sgst, igst = @igst
            WHERE id = @id AND firm_id = @firm_id
        `);

        updateBill.run({
            id: id,
            bno: meta.billNo,
            bdate: meta.billDate,
            supply: supplyState,
            addr: party.addr || '',
            gstin: party.gstin || 'UNREGISTERED',
            state: party.state || '',
            gtot: gtot,
            ntot: ntot,
            btype: meta.billType ? meta.billType.toUpperCase() : 'PURCHASE',
            usern: actorUsername,
            firm: party.firm,
            party_id: party.id || null,
            oth_chg_json: otherCharges && otherCharges.length > 0 ? JSON.stringify(otherCharges) : null,
            order_no: meta.referenceNo || null,
            vehicle_no: meta.vehicleNo || null,
            dispatch_through: meta.dispatchThrough || null,
            narration: meta.narration || null,
            updated_at: now(),
            reverse_charge: meta.reverseCharge || 0, // Store reverse charge flag in database
            cgst: cgst,
            sgst: sgst,
            igst: igst,
            firm_id: req.user.firm_id
        });

        // C. Delete existing bill items from stock_reg
        db.prepare('DELETE FROM stock_reg WHERE bill_id = ? AND firm_id = ?').run(id, req.user.firm_id);

        // D. Prepare Statements for New Line Items
        const insertReg = db.prepare(`
            INSERT INTO stock_reg (
                type, bno, bdate, supply, item, item_narration, batch, hsn, 
                qty, uom, rate, grate, disc, total, 
                stock_id, bill_id, user, firm, created_at, updated_at, qtyh, firm_id
            ) VALUES (
                'PURCHASE', @bno, @bdate, @supply, @item, @item_narration, @batch, @hsn,
                @qty, @uom, @rate, @grate, @disc, @total,
                @stock_id, @bill_id, @user, @firm, @created_at, @updated_at, 0, @firm_id
            )
        `);

        // E. Process New Items - Deduct from stock
        cart.forEach(item => {
            const lineTotal = item.qty * item.rate * (1 - (item.disc || 0)/100);

            // Get the stock record to update the specific batch
            const stockRecord = db.prepare('SELECT * FROM stocks WHERE id = ? AND firm_id = ?').get(item.stockId, req.user.firm_id);
            if (!stockRecord) {
                throw new Error(`Stock record not found for ID: ${item.stockId} or does not belong to your firm`);
            }
            
            // Parse existing batches
            let batches = stockRecord.batches ? JSON.parse(stockRecord.batches) : [];
            
            // Find the specific batch to deduct from
            let batchIndex = -1;
            if (item.batch === null || item.batch === undefined || item.batch === '') {
                // Look for a batch with null/undefined/empty string value
                batchIndex = batches.findIndex(b => b.batch === null || b.batch === undefined || b.batch === '');
            } else {
                batchIndex = batches.findIndex(b => b.batch === item.batch);
            }
            
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
                WHERE id = @id AND firm_id = @firm_id
            `);
            
            updateStockBatchesStmt.run({
                id: item.stockId,
                qty: newTotalQty,
                batches: JSON.stringify(batches),
                user: actorUsername,
                updated_at: now(),
                firm_id: req.user.firm_id
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
                bill_id: id,
                user: actorUsername,
                firm: party.firm,
                created_at: now(),
                updated_at: now(),
                firm_id: req.user.firm_id
            });
        });

        // F. Ledger Postings
        // First, delete existing ledger entries for this bill
        db.prepare('DELETE FROM ledger WHERE voucher_id = ? AND voucher_type = ? AND firm_id = ?').run(id, 'SALES', req.user.firm_id);

        const insertLedger = db.prepare(`
            INSERT INTO ledger (
                voucher_id, voucher_type, voucher_no, account_head, account_type,
                debit_amount, credit_amount, narration, bill_id, party_id,
                tax_type, tax_rate, transaction_date, created_by, firm_id,
                created_at, updated_at
            ) VALUES (
                @voucher_id, @voucher_type, @voucher_no, @account_head, @account_type,
                @debit_amount, @credit_amount, @narration, @bill_id, @party_id,
                @tax_type, @tax_rate, @transaction_date, @created_by, @firm_id,
                @created_at, @updated_at
            )
        `);

        const ledgerBase = {
            voucher_id: id,
            voucher_type: 'SALES',
            voucher_no: meta.billNo,
            bill_id: id,
            transaction_date: meta.billDate,
            created_by: actorUsername,
            firm_id: req.user.firm_id,
            created_at: now(),
            updated_at: now()
        };

        // 1. Party DR Post
        insertLedger.run({
            ...ledgerBase,
            account_head: party.firm,
            account_type: 'DEBTOR',
            debit_amount: ntot,
            credit_amount: 0,
            narration: `Sales Bill No: ${meta.billNo} (Updated)`,
            party_id: party.id || null,
            tax_type: null,
            tax_rate: null
        });

        // 2. GST Posts
        if (cgst > 0) {
            insertLedger.run({
                ...ledgerBase,
                account_head: 'CGST',
                account_type: 'TAX',
                debit_amount: 0,
                credit_amount: cgst,
                narration: `CGST on Bill No: ${meta.billNo} (Updated)`,
                party_id: null,
                tax_type: 'CGST',
                tax_rate: null
            });
        }
        if (sgst > 0) {
            insertLedger.run({
                ...ledgerBase,
                account_head: 'SGST',
                account_type: 'TAX',
                debit_amount: 0,
                credit_amount: sgst,
                narration: `SGST on Bill No: ${meta.billNo} (Updated)`,
                party_id: null,
                tax_type: 'SGST',
                tax_rate: null
            });
        }
        if (igst > 0) {
            insertLedger.run({
                ...ledgerBase,
                account_head: 'IGST',
                account_type: 'TAX',
                debit_amount: 0,
                credit_amount: igst,
                narration: `IGST on Bill No: ${meta.billNo} (Updated)`,
                party_id: null,
                tax_type: 'IGST',
                tax_rate: null
            });
        }

        // 3. Round Off Post
        if (Math.abs(parseFloat(rof)) > 0) {
            const rofVal = parseFloat(rof);
            insertLedger.run({
                ...ledgerBase,
                account_head: 'Round Off',
                account_type: 'INDIRECT EXPENSE',
                debit_amount: rofVal < 0 ? Math.abs(rofVal) : 0,
                credit_amount: rofVal > 0 ? rofVal : 0,
                narration: `Round off on Bill No: ${meta.billNo} (Updated)`,
                party_id: null,
                tax_type: null,
                tax_rate: null
            });
        }

        // 4. Other Charges Post (Dynamic)
        if (otherCharges && otherCharges.length > 0) {
            otherCharges.forEach(charge => {
                const chargeAmount = parseFloat(charge.amount) || 0;
                if (chargeAmount > 0) {
                    insertLedger.run({
                        ...ledgerBase,
                        account_head: charge.name || charge.type || 'Other Charges',
                        account_type: 'INCOME',
                        debit_amount: 0,
                        credit_amount: chargeAmount,
                        narration: `${charge.name || charge.type || 'Other Charges'} on Bill No: ${meta.billNo} (Updated)`,
                        party_id: null,
                        tax_type: null,
                        tax_rate: null
                    });
                }
            });
        }

        // 5. Sales Account Post (To balance the ledger)
        const taxableItemsTotal = cart.reduce((sum, item) => sum + (item.qty * item.rate * (1 - (item.disc || 0)/100)), 0);
        insertLedger.run({
            ...ledgerBase,
            account_head: 'Sales',
            account_type: 'INCOME',
            debit_amount: 0,
            credit_amount: taxableItemsTotal,
            narration: `Sales on Bill No: ${meta.billNo} (Updated)`,
            party_id: null,
            tax_type: null,
            tax_rate: null
        });

        return id;
    });

    try {
        const billId = transaction(); // Execute Transaction
        res.json({ message: "Bill updated successfully", billId });
    } catch (err) {
        console.error("Transaction Error:", err);
        res.status(500).json({ error: "Failed to update bill: " + err.message });
    }
}

exports.lookupGST = async (req, res) => {
    const { gstin } = req.query;

    if (!gstin) {
        return res.status(400).json({ error: 'GSTIN is required' });
    }

    // RAPID API CONFIG (Keep your secrets on the server!)
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
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

// Render stock movements page
exports.renderStockMovementsPage = (req, res) => {
    // Fetch firm name for the logged-in user
    let firmName = '';
    if (req.user && req.user.firm_id) {
        const firmStmt = db.prepare('SELECT name FROM firms WHERE id = ?');
        const firm = firmStmt.get(req.user.firm_id);
        firmName = firm ? firm.name : '';
    }
    
    // You can pass the logged-in user here if available in req.user
    res.render('inventory/stock-movements', { 
        title: 'Stock Movement Tracking', 
        user: { 
            ...req.user, 
            firm_name: firmName 
        } || { username: 'Guest', firm_name: '' } 
    });
};

// Get all stock movements with filtering options
exports.getStockMovements = (req, res) => {
    try {
        // Check if user has firm access
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Get query parameters for filtering
        const { 
            startDate, 
            endDate, 
            stockId, 
            type, 
            batch, 
            page = 1, 
            limit = 50,
            search 
        } = req.query;

        let query = `
            SELECT 
                sr.id,
                sr.type,
                sr.bno,
                sr.bdate,
                sr.item,
                sr.batch,
                sr.qty,
                sr.uom,
                sr.rate,
                sr.total,
                sr.user,
                sr.firm,
                sr.created_at,
                s.item as stock_item_name,
                b.bno as bill_number
            FROM stock_reg sr
            LEFT JOIN stocks s ON sr.stock_id = s.id
            LEFT JOIN bills b ON sr.bill_id = b.id
            WHERE sr.firm_id = ?
        `;
        const params = [req.user.firm_id];

        // Add filters based on query parameters
        if (startDate) {
            query += ` AND sr.created_at >= ?`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND sr.created_at <= ?`;
            params.push(endDate);
        }
        if (stockId) {
            query += ` AND sr.stock_id = ?`;
            params.push(stockId);
        }
        if (type) {
            query += ` AND sr.type = ?`;
            params.push(type);
        }
        if (batch) {
            query += ` AND sr.batch = ?`;
            params.push(batch);
        }
        if (search) {
            query += ` AND (sr.item LIKE ? OR s.item LIKE ? OR sr.bno LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ` ORDER BY sr.created_at DESC`;

        // Add pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const stmt = db.prepare(query);
        const movements = stmt.all(...params);

        // Get total count for pagination info
        let countQuery = `
            SELECT COUNT(*) as count
            FROM stock_reg sr
            LEFT JOIN stocks s ON sr.stock_id = s.id
            LEFT JOIN bills b ON sr.bill_id = b.id
            WHERE sr.firm_id = ?
        `;
        const countParams = [req.user.firm_id];

        if (startDate) {
            countQuery += ` AND sr.created_at >= ?`;
            countParams.push(startDate);
        }
        if (endDate) {
            countQuery += ` AND sr.created_at <= ?`;
            countParams.push(endDate);
        }
        if (stockId) {
            countQuery += ` AND sr.stock_id = ?`;
            countParams.push(stockId);
        }
        if (type) {
            countQuery += ` AND sr.type = ?`;
            countParams.push(type);
        }
        if (batch) {
            countQuery += ` AND sr.batch = ?`;
            countParams.push(batch);
        }
        if (search) {
            countQuery += ` AND (sr.item LIKE ? OR s.item LIKE ? OR sr.bno LIKE ?)`;
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }

        const countStmt = db.prepare(countQuery);
        const totalCount = countStmt.get(...countParams).count;

        res.json({
            movements,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount,
                pages: Math.ceil(totalCount / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('Error fetching stock movements:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get stock movements for a specific stock item
// API endpoint to get current user's firm name
exports.getCurrentUserFirmName = (req, res) => {
    try {
        // Check if user has firm access
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }
        
        const firmStmt = db.prepare('SELECT name, address, contact_info FROM firms WHERE id = ?');
        const firm = firmStmt.get(req.user.firm_id);
        
        if (!firm) {
            return res.status(404).json({ error: 'Firm not found' });
        }
        
        res.json({ 
            firmName: firm.name,
            address: firm.address || '',
            contact_info: firm.contact_info || ''
        });
    } catch (err) {
        console.error('Error fetching firm name:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getStockMovementsByStock = (req, res) => {
    try {
        const { id } = req.params;

        // Check if user has firm access
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Verify the stock belongs to the user's firm
        const stockCheck = db.prepare('SELECT id FROM stocks WHERE id = ? AND firm_id = ?').get(id, req.user.firm_id);
        if (!stockCheck) {
            return res.status(404).json({ error: 'Stock not found or does not belong to your firm' });
        }

        const { startDate, endDate, type, batch, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT 
                sr.id,
                sr.type,
                sr.bno,
                sr.bdate,
                sr.item,
                sr.batch,
                sr.qty,
                sr.uom,
                sr.rate,
                sr.total,
                sr.user,
                sr.firm,
                sr.created_at,
                b.bno as bill_number
            FROM stock_reg sr
            LEFT JOIN bills b ON sr.bill_id = b.id
            WHERE sr.stock_id = ? AND sr.firm_id = ?
        `;
        const params = [id, req.user.firm_id];

        // Add filters based on query parameters
        if (startDate) {
            query += ` AND sr.created_at >= ?`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND sr.created_at <= ?`;
            params.push(endDate);
        }
        if (type) {
            query += ` AND sr.type = ?`;
            params.push(type);
        }
        if (batch) {
            query += ` AND sr.batch = ?`;
            params.push(batch);
        }

        query += ` ORDER BY sr.created_at DESC`;

        // Add pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const stmt = db.prepare(query);
        const movements = stmt.all(...params);

        // Get total count for pagination info
        let countQuery = `
            SELECT COUNT(*) as count
            FROM stock_reg sr
            LEFT JOIN bills b ON sr.bill_id = b.id
            WHERE sr.stock_id = ? AND sr.firm_id = ? 
        `;
        const countParams = [id, req.user.firm_id];

        if (startDate) {
            countQuery += ` AND sr.created_at >= ?`;
            countParams.push(startDate);
        }
        if (endDate) {
            countQuery += ` AND sr.created_at <= ?`;
            countParams.push(endDate);
        }
        if (type) {
            countQuery += ` AND sr.type = ?`;
            countParams.push(type);
        }
        if (batch) {
            countQuery += ` AND sr.batch = ?`;
            countParams.push(batch);
        }

        const countStmt = db.prepare(countQuery);
        const totalCount = countStmt.get(...countParams).count;

        res.json({
            movements,
            stockId: id,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount,
                pages: Math.ceil(totalCount / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('Error fetching stock movements by stock:', err);
        res.status(500).json({ error: err.message });
    }
};

// Create a manual stock movement (receipt, transfer, adjustment)
exports.createStockMovement = async (req, res) => {
    try {
        const { type, stockId, batch, qty, uom, rate, total, description, referenceNumber } = req.body;

        // Validate required fields
        if (!type || !stockId || !qty || !uom) {
            return res.status(400).json({ error: 'Type, stockId, qty, and uom are required' });
        }

        const validTypes = ['RECEIPT', 'TRANSFER', 'ADJUSTMENT', 'OPENING'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid movement type. Must be one of: RECEIPT, TRANSFER, ADJUSTMENT, OPENING' });
        }

        const actorUsername = getActorUsername(req);
        if (!actorUsername) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if user has firm access
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Verify the stock belongs to the user's firm
        const stock = db.prepare('SELECT * FROM stocks WHERE id = ? AND firm_id = ?').get(stockId, req.user.firm_id);
        if (!stock) {
            return res.status(404).json({ error: 'Stock not found or does not belong to your firm' });
        }

        // Calculate total if not provided
        const calculatedTotal = total || (qty * (rate || 0));

        // Perform transaction to update stock and record movement
        const transaction = db.transaction(() => {
            // Insert the stock movement record
            const insertMovement = db.prepare(`
                INSERT INTO stock_reg (
                    type, bno, bdate, supply, item, item_narration, batch, hsn, 
                    qty, uom, rate, grate, disc, total, 
                    stock_id, bill_id, user, firm, created_at, updated_at, qtyh, firm_id
                ) VALUES (
                    @type, @bno, @bdate, @supply, @item, @item_narration, @batch, @hsn,
                    @qty, @uom, @rate, @grate, @disc, @total,
                    @stock_id, @bill_id, @user, @firm, @created_at, @updated_at, @qtyh, @firm_id
                )
            `);

            const movementResult = insertMovement.run({
                type,
                bno: referenceNumber || null, // Use reference number as bno for manual movements
                bdate: new Date().toISOString().split('T')[0], // Today's date
                supply: 'INTERNAL', // Internal movement
                item: stock.item,
                item_narration: description || null,
                batch: batch || null,
                hsn: stock.hsn,
                qty: Math.abs(qty), // Always store as positive value, sign handled by context
                uom: uom,
                rate: rate || 0,
                grate: stock.grate || 0,
                disc: 0, // No discount for manual movements
                total: calculatedTotal,
                stock_id: stockId,
                bill_id: null, // Not linked to a bill
                user: actorUsername,
                firm: stock.firm || 'Internal',
                created_at: now(),
                updated_at: now(),
                qtyh: 0, // Not used
                firm_id: req.user.firm_id
            });

            // Update the stock quantity based on movement type
            // For RECEIPT and OPENING, add to stock; for ADJUSTMENT, handle based on sign
            // For now, we'll add to stock quantity
            let newQty = stock.qty + Math.abs(qty);
            
            if (type === 'PURCHASE') {
                newQty = stock.qty - Math.abs(qty); // This shouldn't happen for manual movements
            }

            const updateStock = db.prepare(`
                UPDATE stocks 
                SET qty = @qty, user = @user, updated_at = @updated_at
                WHERE id = @id AND firm_id = @firm_id
            `);

            updateStock.run({
                id: stockId,
                qty: newQty,
                user: actorUsername,
                updated_at: now(),
                firm_id: req.user.firm_id
            });

            return movementResult.lastInsertRowid;
        });

        const movementId = transaction();

        res.json({ 
            message: 'Stock movement recorded successfully', 
            movementId,
            newQuantity: db.prepare('SELECT qty FROM stocks WHERE id = ?').get(stockId).qty
        });
    } catch (err) {
        console.error('Error creating stock movement:', err);
        res.status(500).json({ error: 'Failed to record stock movement: ' + err.message });
    }
};

// Cancel or Delete a bill
exports.cancelBill = (req, res) => {
    const { id } = req.params;
    const { cancellation_reason, action } = req.body; // action: 'cancel' or 'delete'
    const status = action === 'delete' ? 'DELETED' : 'CANCELLED';

    const actorUsername = getActorUsername(req);
    if (!actorUsername) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has firm access
    if (!req.user || !req.user.firm_id) {
        return res.status(403).json({ error: 'User is not associated with any firm' });
    }

    const transaction = db.transaction(() => {
        // 1. Get the bill header
        const bill = db.prepare('SELECT * FROM bills WHERE id = ? AND firm_id = ?').get(id, req.user.firm_id);
        if (!bill) {
            throw new Error('Bill not found or does not belong to your firm');
        }

        if (bill.status !== 'ACTIVE') {
            throw new Error(`Bill is already ${bill.status}`);
        }

        // 2. Restore Stock Quantities
        // Get bill items from stock_reg
        const items = db.prepare('SELECT * FROM stock_reg WHERE bill_id = ? AND firm_id = ?').all(id, req.user.firm_id);

        items.forEach(item => {
            const stockRecord = db.prepare('SELECT * FROM stocks WHERE id = ? AND firm_id = ?').get(item.stock_id, req.user.firm_id);
            if (!stockRecord) {
                console.warn(`Stock record not found for item ${item.item} (ID: ${item.stock_id}) during cancellation. Skipping stock restoration for this item.`);
                return;
            }

            // Parse batches
            let batches = stockRecord.batches ? JSON.parse(stockRecord.batches) : [];
            
            // Find the specific batch to restore to
            let batchIndex = -1;
            if (item.batch === null || item.batch === undefined || item.batch === '') {
                batchIndex = batches.findIndex(b => b.batch === null || b.batch === undefined || b.batch === '');
            } else {
                batchIndex = batches.findIndex(b => b.batch === item.batch);
            }

            if (batchIndex !== -1) {
                // Add back the quantity
                batches[batchIndex].qty += item.qty;
                
                // Calculate new total quantity
                const newTotalQty = batches.reduce((sum, b) => sum + b.qty, 0);
                
                // Update stock record
                db.prepare(`
                    UPDATE stocks 
                    SET qty = @qty, batches = @batches, user = @user, updated_at = @updated_at
                    WHERE id = @id AND firm_id = @firm_id
                `).run({
                    id: item.stock_id,
                    qty: newTotalQty,
                    batches: JSON.stringify(batches),
                    user: actorUsername,
                    updated_at: now(),
                    firm_id: req.user.firm_id
                });
            }
        });

        // 3. Remove Ledger Entries
        db.prepare('DELETE FROM ledger WHERE voucher_id = ? AND voucher_type = ? AND firm_id = ?').run(id, 'SALES', req.user.firm_id);

        // 4. Update Bill Status
        db.prepare(`
            UPDATE bills SET 
                status = @status, 
                cancellation_reason = @reason, 
                cancelled_at = @at, 
                cancelled_by = @by,
                updated_at = @updated_at
            WHERE id = @id AND firm_id = @firm_id
        `).run({
            status: status,
            reason: cancellation_reason || `Bill ${status.toLowerCase()} by user`,
            at: now(),
            by: req.user.id,
            updated_at: now(),
            id: id,
            firm_id: req.user.firm_id
        });

        return id;
    });

    try {
        transaction();
        res.json({ message: `Bill ${status.toLowerCase()} successfully` });
    } catch (err) {
        console.error("Cancellation Error:", err.message);
        res.status(500).json({ error: "Failed to cancel bill: " + err.message });
    }
};

// Get party balance
exports.getPartyBalance = (req, res) => {
    try {
        const { partyId } = req.params;
        
        // Check if user has firm access
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }
        
        // Get party details
        const partyStmt = db.prepare('SELECT * FROM parties WHERE id = ? AND firm_id = ?');
        const party = partyStmt.get(partyId, req.user.firm_id);
        
        if (!party) {
            return res.status(404).json({ error: 'Party not found or does not belong to your firm' });
        }
        
        // Calculate party balance from ledger
        // Debit amount represents money owed TO the party (negative balance)
        // Credit amount represents money owed BY the party (positive balance)
        const balanceQuery = `
            SELECT 
                SUM(debit_amount) as total_debit,
                SUM(credit_amount) as total_credit,
                (SUM(credit_amount) - SUM(debit_amount)) as balance
            FROM ledger 
            WHERE firm_id = ? AND account_head = ?
        `;
        
        const balanceStmt = db.prepare(balanceQuery);
        const balanceResult = balanceStmt.get(req.user.firm_id, party.firm);
        
        const balance = balanceResult.balance || 0;
        
        res.json({
            partyId: party.id,
            partyName: party.firm,
            balance: balance,
            balanceFormatted: new Intl.NumberFormat('en-IN', { 
                style: 'currency', 
                currency: 'INR' 
            }).format(Math.abs(balance)),
            balanceType: balance >= 0 ? 'Credit' : 'Debit'
        });
    } catch (err) {
        console.error('Error fetching party balance:', err);
        res.status(500).json({ error: err.message });
    }
};