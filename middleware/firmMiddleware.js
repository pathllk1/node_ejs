const db = require('../config/db');

// Middleware to verify that a user can only access records belonging to their firm
const verifyFirmAccess = (req, res, next) => {
    // Check if user is authenticated (should be handled by authMiddleware)
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the user's firm_id from the database
    try {
        const getUserStmt = db.prepare('SELECT firm_id FROM users WHERE id = ?');
        const user = getUserStmt.get(req.user.id);

        if (!user || !user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Store the firm_id in the request object for later use
        req.user.firm_id = user.firm_id;
        next();
    } catch (error) {
        console.error('Firm access verification error:', error);
        return res.status(500).json({ error: 'Server error during firm access verification' });
    }
};

// Middleware to verify firm ownership for specific records
const verifyFirmOwnership = (tableName, idParamName = 'id') => {
    return (req, res, next) => {
        // First verify firm access
        verifyFirmAccess(req, res, (err) => {
            if (err) return next(err);

            const recordId = req.params[idParamName];
            const firmId = req.user.firm_id;

            if (!recordId) {
                return res.status(400).json({ error: `Missing ${idParamName} parameter` });
            }

            try {
                // Check if the record belongs to the user's firm
                const checkOwnershipStmt = db.prepare(
                    `SELECT id FROM ${tableName} WHERE id = ? AND firm_id = ?`
                );
                const record = checkOwnershipStmt.get(recordId, firmId);

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
        });
    };
};

// Middleware to add firm_id to new records
const addFirmId = (req, res, next) => {
    verifyFirmAccess(req, res, (err) => {
        if (err) return next(err);

        // Add firm_id to the request body for create operations
        req.body.firm_id = req.user.firm_id;
        next();
    });
};

module.exports = {
    verifyFirmAccess,
    verifyFirmOwnership,
    addFirmId
};