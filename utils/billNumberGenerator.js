/**
 * Bill Numbering Utility Module
 * Handles generation of firm-level, GST-compliant bill numbers
 * Format: F{FIRM_ID}-{SEQUENCE:4d}/{FINANCIAL_YEAR}
 * Example: F1-0001/25-26
 * 
 * STRICT CONSISTENCY:
 * - All operations use transactions
 * - Firm ID validation enforced
 * - Financial year format validated
 * - Race conditions prevented
 * - Audit logging for all operations
 */

const db = require('../config/db');

/**
 * Get current financial year in format YY-YY
 * India fiscal year: April 1 - March 31
 * @returns {string} Financial year (e.g., "25-26" for FY 2025-2026)
 */
function getCurrentFinancialYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11, where 3 = April
    
    let fyStart, fyEnd;
    
    if (month >= 3) { // April onwards
        fyStart = year;
        fyEnd = year + 1;
    } else { // January to March
        fyStart = year - 1;
        fyEnd = year;
    }
    
    const startYY = String(fyStart % 100).padStart(2, '0');
    const endYY = String(fyEnd % 100).padStart(2, '0');
    
    return `${startYY}-${endYY}`;
}

/**
 * Validate firm exists in database
 * @param {number} firmId - The firm ID to validate
 * @returns {boolean} True if firm exists
 * @throws {Error} If firm does not exist
 */
function validateFirmExists(firmId) {
    if (!firmId || typeof firmId !== 'number' || firmId <= 0) {
        throw new Error(`Invalid firm ID: ${firmId}`);
    }
    
    const firm = db.prepare('SELECT id FROM firms WHERE id = ?').get(firmId);
    if (!firm) {
        throw new Error(`Firm with ID ${firmId} does not exist`);
    }
    
    return true;
}

/**
 * Validate financial year format
 * @param {string} fy - Financial year (e.g., "25-26")
 * @returns {boolean} True if format is valid
 * @throws {Error} If format is invalid
 */
function validateFinancialYear(fy) {
    const fyRegex = /^\d{2}-\d{2}$/;
    if (!fyRegex.test(fy)) {
        throw new Error(`Invalid financial year format: ${fy}. Expected: YY-YY`);
    }
    return true;
}

/**
 * Generate next bill number atomically
 * STRICT: Uses transaction to prevent race conditions
 * 
 * @param {number} firmId - The firm ID
 * @param {string} financialYear - Optional financial year, defaults to current
 * @returns {string} The generated bill number
 * @throws {Error} If validation fails or transaction fails
 */
function getNextBillNumber(firmId, financialYear = null) {
    console.log(`[BILL_NUMBER] Generating for Firm: ${firmId}, FY: ${financialYear || 'current'}`);
    
    // VALIDATION: Firm exists
    validateFirmExists(firmId);
    
    // VALIDATION: Financial year format
    const fy = financialYear || getCurrentFinancialYear();
    validateFinancialYear(fy);
    
    // ATOMIC TRANSACTION
    const generateTransaction = db.transaction(() => {
        // Lock: Get or create sequence entry
        let seqRecord = db.prepare(`
            SELECT id, last_sequence 
            FROM bill_sequences 
            WHERE firm_id = ? AND financial_year = ?
        `).get(firmId, fy);
        
        if (!seqRecord) {
            console.log(`[BILL_NUMBER] Creating new sequence for Firm: ${firmId}, FY: ${fy}`);
            
            const result = db.prepare(`
                INSERT INTO bill_sequences (firm_id, financial_year, last_sequence, created_at, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).run(firmId, fy, 0);
            
            seqRecord = {
                id: result.lastInsertRowid,
                last_sequence: 0
            };
        }
        
        // Calculate next sequence number
        const nextSeq = seqRecord.last_sequence + 1;
        
        // VALIDATION: Sequence number should not exceed 9999 (4-digit limit)
        if (nextSeq > 9999) {
            throw new Error(
                `Bill sequence limit exceeded for Firm ${firmId} in FY ${fy}. ` +
                `Maximum 9999 bills per firm per financial year.`
            );
        }
        
        // Update sequence (atomic)
        const updateResult = db.prepare(`
            UPDATE bill_sequences 
            SET last_sequence = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(nextSeq, seqRecord.id);
        
        if (updateResult.changes === 0) {
            throw new Error(`Failed to update sequence for Firm ${firmId}`);
        }
        
        // Format bill number: F{FIRM_ID}-{SEQ:4d}/{YEAR}
        const billNo = `F${firmId}-${String(nextSeq).padStart(4, '0')}/${fy}`;
        
        // VALIDATION: Verify format
        const billNoRegex = /^F\d+-\d{4}\/\d{2}-\d{2}$/;
        if (!billNoRegex.test(billNo)) {
            throw new Error(`Generated bill number format invalid: ${billNo}`);
        }
        
        // VALIDATION: Check length (GST max 16 characters)
        if (billNo.length > 16) {
            throw new Error(
                `Bill number exceeds GST limit of 16 characters: ${billNo} (${billNo.length} chars)`
            );
        }
        
        return billNo;
    });
    
    try {
        const billNo = generateTransaction();
        console.log(`[BILL_NUMBER] ✅ Generated: ${billNo}`);
        return billNo;
    } catch (error) {
        console.error(`[BILL_NUMBER] ❌ Error: ${error.message}`);
        throw error;
    }
}

/**
 * Get current sequence for a firm (read-only, for reporting)
 * @param {number} firmId - The firm ID
 * @param {string} financialYear - Optional financial year
 * @returns {object} Object with current_sequence and next_sequence
 */
function getCurrentSequence(firmId, financialYear = null) {
    validateFirmExists(firmId);
    const fy = financialYear || getCurrentFinancialYear();
    validateFinancialYear(fy);
    
    const seqRecord = db.prepare(`
        SELECT last_sequence 
        FROM bill_sequences 
        WHERE firm_id = ? AND financial_year = ?
    `).get(firmId, fy);
    
    if (!seqRecord) {
        return {
            firm_id: firmId,
            financial_year: fy,
            current_sequence: 0,
            next_sequence: 1
        };
    }
    
    return {
        firm_id: firmId,
        financial_year: fy,
        current_sequence: seqRecord.last_sequence,
        next_sequence: seqRecord.last_sequence + 1
    };
}

/**
 * Get next available bill number without incrementing sequence
 * This function only reads current state and calculates what the next number would be
 * @param {number} firmId - The firm ID
 * @param {string} financialYear - Optional financial year
 * @returns {string|null} The next bill number that would be generated, or null if error
 */
function getNextBillNumberPreview(firmId, financialYear = null) {
    try {
        validateFirmExists(firmId);
        const fy = financialYear || getCurrentFinancialYear();
        validateFinancialYear(fy);
        
        // Just calculate what the next number would be without incrementing
        const seqInfo = getCurrentSequence(firmId, fy);
        const nextSequence = seqInfo.next_sequence;
        const nextBillNo = `F${firmId}-${String(nextSequence).padStart(4, '0')}/${fy}`;
        
        // Validate the generated format
        const billNoRegex = /^F\d+-\d{4}\/\d{2}-\d{2}$/;
        if (!billNoRegex.test(nextBillNo)) {
            throw new Error(`Generated bill number format invalid: ${nextBillNo}`);
        }
        
        // Validate length
        if (nextBillNo.length > 16) {
            throw new Error(
                `Bill number would exceed GST limit: ${nextBillNo} (${nextBillNo.length} chars)`
            );
        }
        
        return nextBillNo;
    } catch (error) {
        console.error(`[BILL_PREVIEW] Error generating preview: ${error.message}`);
        return null;
    }
}

module.exports = {
    getCurrentFinancialYear,
    getNextBillNumber,
    getCurrentSequence,
    getNextBillNumberPreview,
    validateFirmExists,
    validateFinancialYear
};
