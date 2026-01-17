// controllers/masterrollsController.js
// Controller for managing masterrolls (employee) data

const mongoPrisma = require('../../../config/prisma_mongo.js');
const turso = require('../../../config/turso.js');


/**
 * Helper to get the MongoDB firmId for the current user
 * It maps the SQLite firm_id to MongoDB firmId using the firm name
 * If the firm doesn't exist in MongoDB, it creates a mapping entry
 */
async function getMongoFirmId(req) {
    if (!req.user || !req.user.firm_id) {
        throw new Error('User is not associated with any firm');
    }

    // 1. Get firm name from Turso
    const sqliteFirmResult = await turso.execute({
        sql: 'SELECT name FROM firms WHERE id = ?',
        args: [req.user.firm_id]
    });
    const sqliteFirm = sqliteFirmResult.rows[0];
    if (!sqliteFirm) {
        throw new Error('Firm not found in database');
    }

    // 2. Try to get firm ID from MongoDB by matching name
    let mongoFirm = await mongoPrisma.firms.findFirst({
        where: { name: sqliteFirm.name }
    });

    // 3. If firm doesn't exist in MongoDB, create it
    if (!mongoFirm) {
        console.log(`Creating firm "${sqliteFirm.name}" in MongoDB for mapping...`);
        
        // Generate a unique code based on the firm name
        const firmCode = sqliteFirm.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20).toUpperCase();
        
        mongoFirm = await mongoPrisma.firms.create({
            data: {
                name: sqliteFirm.name,
                address: "", // Could be populated from SQLite if available
                businessType: null,
                code: firmCode,
                contactNo: null,
                contactPerson: null,
                createdAt: new Date(),
                description: null,
                email: "",
                gstNo: null,
                hasMultipleGSTs: false,
                phone: null,
                state: null,
                status: null,
                updatedAt: new Date(),
                additionalGSTs: [],
                v: 1 // MongoDB version field
            }
        });
        
        console.log(`Created firm "${sqliteFirm.name}" in MongoDB with ID: ${mongoFirm.id}`);
    }

    return mongoFirm.id;
}

/**
 * Get all masterrolls with pagination and search
 */
exports.getAllMasterRolls = async (req, res) => {
    try {
        const firmId = await getMongoFirmId(req);
        const searchTerm = req.query.search || '';

        // Build search filters
        const whereClause = {
            firmId: firmId
        };

        if (searchTerm) {
            whereClause.OR = [
                { employeeName: { contains: searchTerm, mode: 'insensitive' } },
                { aadhar: { contains: searchTerm, mode: 'insensitive' } },
                { phoneNo: { contains: searchTerm, mode: 'insensitive' } },
                { fatherHusbandName: { contains: searchTerm, mode: 'insensitive' } },
                { category: { contains: searchTerm, mode: 'insensitive' } }
            ];
        }

        const masterRolls = await mongoPrisma.masterrolls.findMany({
            where: whereClause,
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({
            success: true,
            data: masterRolls
        });
    } catch (error) {
        console.error('Error fetching masterrolls:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({ 
            success: false,
            error: 'Failed to fetch masterrolls data',
            message: error.message
        });
    } finally {
        await mongoPrisma.$disconnect();
    }
};

/**
 * Get a single masterroll by ID
 */
exports.getMasterRollById = async (req, res) => {
    try {
        const firmId = await getMongoFirmId(req);
        const { id } = req.params;

        const masterRoll = await mongoPrisma.masterrolls.findFirst({
            where: {
                id: id,
                firmId: firmId
            }
        });

        if (!masterRoll) {
            return res.status(404).json({ 
                success: false,
                error: 'Master roll record not found or access denied' 
            });
        }

        res.json({
            success: true,
            data: masterRoll
        });
    } catch (error) {
        console.error('Error fetching masterroll by ID:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch masterroll data',
            message: error.message
        });
    } finally {
        await mongoPrisma.$disconnect();
    }
};

/**
 * Create a new masterroll
 */
exports.createMasterRoll = async (req, res) => {
    try {
        const firmId = await getMongoFirmId(req);
        const userId = req.user.id; // User ID from SQLite

        // In a real scenario, you might also want to map SQLite user ID to MongoDB user ID
        // but for now we'll store the SQLite ID if it's acceptable or handle mapping if needed.
        // Looking at the schema, userId is String @mongodb.ObjectId. 
        // This is a challenge if we only have SQLite ID.
        
        // Let's try to find the MongoDB user ID by username
        let mongoUser = await mongoPrisma.users.findFirst({
            where: { username: req.user.username }
        });

        if (!mongoUser) {
            console.log(`Creating user "${req.user.username}" in MongoDB for mapping...`);
            
            // Create the user in MongoDB since they don't exist
            mongoUser = await mongoPrisma.users.create({
                data: {
                    username: req.user.username,
                    email: "", // Get from SQLite if available
                    fullname: req.user.username, // Use username as fullname if no other info
                    password: "", // Won't be the actual password, just placeholder
                    role: "employee", // Default role
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    activeSessions: [],
                    failedLoginAttempts: 0,
                    status: 1,
                    v: 1 // MongoDB version field
                }
            });
            
            console.log(`Created user "${req.user.username}" in MongoDB with ID: ${mongoUser.id}`);
        }

        const masterRollData = {
            ...req.body,
            firmId: firmId,
            userId: mongoUser.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            pDayWage: parseInt(req.body.pDayWage) || 0,
            dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : new Date(),
            dateOfJoining: req.body.dateOfJoining ? new Date(req.body.dateOfJoining) : new Date(),
            dateOfExit: req.body.dateOfExit ? new Date(req.body.dateOfExit) : null,
            v: 1, // MongoDB version field
            branch: req.body.branch || "", // Add required branch field
            accountNo: req.body.accountNo || "",
            address: req.body.address || "",
            bank: req.body.bank || "",
            category: req.body.category || "General",
            ifsc: req.body.ifsc || "",
            phoneNo: req.body.phoneNo || "",
            status: req.body.status || "active"
        };

        // Remove ID if present in body to let MongoDB generate it
        delete masterRollData.id;

        const newMasterRoll = await mongoPrisma.masterrolls.create({
            data: masterRollData
        });

        res.status(201).json({
            success: true,
            message: 'Employee added successfully',
            data: newMasterRoll
        });
    } catch (error) {
        console.error('Error creating masterroll:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create masterroll',
            message: error.message
        });
    } finally {
        await mongoPrisma.$disconnect();
    }
};

/**
 * Update an existing masterroll
 */
exports.updateMasterRoll = async (req, res) => {
    try {
        const firmId = await getMongoFirmId(req);
        const { id } = req.params;

        // Check ownership first
        const existing = await mongoPrisma.masterrolls.findFirst({
            where: { id: id, firmId: firmId }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Record not found or access denied'
            });
        }

        const updateData = {
            ...req.body,
            updatedAt: new Date(),
            pDayWage: req.body.pDayWage ? parseInt(req.body.pDayWage) : existing.pDayWage,
            dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : existing.dateOfBirth,
            dateOfJoining: req.body.dateOfJoining ? new Date(req.body.dateOfJoining) : existing.dateOfJoining,
            dateOfExit: req.body.dateOfExit ? new Date(req.body.dateOfExit) : existing.dateOfExit,
            branch: req.body.branch !== undefined ? req.body.branch : existing.branch,
            accountNo: req.body.accountNo !== undefined ? req.body.accountNo : existing.accountNo,
            address: req.body.address !== undefined ? req.body.address : existing.address,
            bank: req.body.bank !== undefined ? req.body.bank : existing.bank,
            category: req.body.category !== undefined ? req.body.category : existing.category,
            ifsc: req.body.ifsc !== undefined ? req.body.ifsc : existing.ifsc,
            phoneNo: req.body.phoneNo !== undefined ? req.body.phoneNo : existing.phoneNo,
            status: req.body.status !== undefined ? req.body.status : existing.status
        };

        // Ensure we don't overwrite IDs or firmId
        delete updateData.id;
        delete updateData._id;
        delete updateData.firmId;
        delete updateData.userId;

        const updatedMasterRoll = await mongoPrisma.masterrolls.update({
            where: { id: id },
            data: updateData
        });

        res.json({
            success: true,
            message: 'Employee updated successfully',
            data: updatedMasterRoll
        });
    } catch (error) {
        console.error('Error updating masterroll:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update masterroll',
            message: error.message
        });
    } finally {
        await mongoPrisma.$disconnect();
    }
};

/**
 * Delete a masterroll
 */
exports.deleteMasterRoll = async (req, res) => {
    try {
        const firmId = await getMongoFirmId(req);
        const { id } = req.params;

        // Check ownership first
        const existing = await mongoPrisma.masterrolls.findFirst({
            where: { id: id, firmId: firmId }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Record not found or access denied'
            });
        }

        await mongoPrisma.masterrolls.delete({
            where: { id: id }
        });

        res.json({
            success: true,
            message: 'Employee deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting masterroll:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete masterroll',
            message: error.message
        });
    } finally {
        await mongoPrisma.$disconnect();
    }
};

/**
 * Render the masterrolls page
 */
exports.renderMasterRollsPage = async (req, res) => {
    try {
        // Fetch firm name for the logged-in user (similar to inventory controller)
        let firmName = '';
        if (req.user && req.user.firm_id) {
            const firmResult = await turso.execute({
                sql: 'SELECT name FROM firms WHERE id = ?',
                args: [req.user.firm_id]
            });
            const firm = firmResult.rows[0];
            firmName = firm ? firm.name : '';
        }

        res.render('masterrolls/masterrolls', {
            layout: 'layouts/main',
            title: 'Employee Management',
            user: {
                ...req.user,
                firm_name: firmName
            }
        });
    } catch (error) {
        console.error('Error rendering masterrolls page:', error);
        res.status(500).render('error', { 
            title: 'Error',
            message: 'Failed to load employee management page'
        });
    }
};