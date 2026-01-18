const turso = require('../config/turso');

// Middleware to verify that a user can only access records belonging to their firm
const verifyFirmAccess = async (req, res, next) => {
    // Check if user is authenticated (should be handled by authMiddleware)
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const userResult = await turso.execute({
            sql: 'SELECT firm_id FROM users WHERE id = ?',
            args: [req.user.id]
        });
        
        const user = userResult.rows[0];

        if (!user || !user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Normalize firm_id to a positive integer for consistent downstream use
        let firmId = user.firm_id;
        if (firmId && typeof firmId === 'object') {
            if (Object.prototype.hasOwnProperty.call(firmId, 'value')) {
                firmId = firmId.value;
            } else if (Object.prototype.hasOwnProperty.call(firmId, 'data')) {
                firmId = firmId.data;
            } else {
                firmId = String(firmId);
            }
        }
        if (typeof firmId === 'bigint') {
            firmId = Number(firmId);
        } else if (typeof firmId === 'string') {
            firmId = Number(firmId.trim());
        } else if (typeof firmId !== 'number') {
            firmId = Number(firmId);
        }

        if (!Number.isFinite(firmId) || firmId <= 0) {
            console.error('[VERIFY_FIRM_ACCESS] Invalid firm_id on user record:', {
                userId: req.user.id,
                firm_id: user.firm_id,
                typeofFirmId: typeof user.firm_id
            });
            return res.status(400).json({ error: 'Invalid firm association' });
        }

        // Store the firm_id in the request object for later use
        req.user.firm_id = firmId;
        next();
    } catch (error) {
        console.error('Firm access verification error:', error);
        return res.status(500).json({ error: 'Server error during firm access verification' });
    }
};

// Middleware to verify firm ownership for specific records
const verifyFirmOwnership = (tableName, idParamName = 'id') => {
    return async (req, res, next) => {
        // First verify firm access
        try {
            await new Promise((resolve, reject) => {
                verifyFirmAccess(req, res, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (err) {
            return next(err);
        }

        const recordId = req.params[idParamName];
        const firmId = req.user.firm_id;

        if (!recordId) {
            return res.status(400).json({ error: `Missing ${idParamName} parameter` });
        }

        try {
            const recordResult = await turso.execute({
                sql: `SELECT id FROM ${tableName} WHERE id = ? AND firm_id = ?`,
                args: [recordId, firmId]
            });
            
            const record = recordResult.rows[0];

            if (!record) {
                return res.status(403).json({ 
                    error: `Record does not exist or does not belong to your firm` 
                });
            }

            next();
        } catch (error) {
            console.error('Firm ownership verification error:', error);
            return res.status(500).json({ error: 'Server error during firm ownership verification' });
        }
    };
};

// Middleware to add firm_id to new records
const addFirmId = async (req, res, next) => {
    try {
        await new Promise((resolve, reject) => {
            verifyFirmAccess(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Add firm_id to the request body for create operations
        req.body.firm_id = req.user.firm_id;
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = {
    verifyFirmAccess,
    verifyFirmOwnership,
    addFirmId
};