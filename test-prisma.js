// test-prisma.js

// 1. Import your configured instance
const prisma = require('./config/prisma');

async function main() {
  console.log("🔍 Attempting to fetch users...");

  try {
    // 2. Fetch all users from the database
    const allUsers = await prisma.users.findMany();

    // 3. Log the results
    if (allUsers.length > 0) {
      console.log(`✅ Success! Found ${allUsers.length} user(s):`);
      console.dir(allUsers, { depth: null, colors: true });
    } else {
      console.log("⚠️ Connection successful, but the 'users' table is empty.");
    }

  } catch (error) {
    console.error("❌ Error fetching data:", error);
  }
}

// 4. Run the function
main();