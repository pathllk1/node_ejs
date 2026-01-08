const db = require('./config/db');

/**
 * Script to set the admin role (256591) for existing users
 * This script should be run once to grant admin privileges to existing users
 */
const setAdminRole = async () => {
    console.log('Setting admin role (256591) for all existing users...');
    
    try {
        // Update all existing users to have the admin role value
        const result = db.prepare(`
            UPDATE users 
            SET role = 256591
            WHERE role IS NULL OR role != 256591
        `).run();
        
        console.log(`Updated ${result.changes} users with admin role (256591)`);
        
        // Verify the update
        const updatedUsers = db.prepare('SELECT id, username, role FROM users').all();
        console.log('Users after update:');
        updatedUsers.forEach(user => {
            console.log(`  - User ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
        });
        
        console.log('Admin role assignment completed successfully!');
        
    } catch (error) {
        console.error('Error during admin role assignment:', error);
        throw error;
    }
};

// Run the script if this file is executed directly
if (require.main === module) {
    setAdminRole()
        .then(() => {
            console.log('Admin role script completed.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Admin role script failed:', error);
            process.exit(1);
        });
}

module.exports = { setAdminRole };