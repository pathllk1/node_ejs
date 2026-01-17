// test-mongo-user.js
// Script to test MongoDB masterrolls data fetching

const mongoPrisma = require('./config/prisma_mongo.js');

async function testFetchMasterRolls() {
  console.log("🔍 Attempting to fetch all masterrolls data from MongoDB...");

  try {
    // Fetch all masterrolls records
    const allMasterRolls = await mongoPrisma.masterrolls.findMany({
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`✅ Success! Fetched ${allMasterRolls.length} masterrolls records from MongoDB.`);
    
    if (allMasterRolls.length > 0) {
      console.log('\n📋 Sample records:');
      // Display first 5 records as samples
      allMasterRolls.slice(0, 5).forEach((record, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log(`  ID: ${record.id}`);
        console.log(`  Employee Name: ${record.employeeName}`);
        console.log(`  Aadhar: ${record.aadhar}`);
        console.log(`  Phone: ${record.phoneNo}`);
        console.log(`  Category: ${record.category}`);
        console.log(`  Status: ${record.status}`);
        console.log(`  Firm ID: ${record.firmId}`);
        console.log(`  Created At: ${record.createdAt}`);
      });
      
      if (allMasterRolls.length > 5) {
        console.log(`\n... and ${allMasterRolls.length - 5} more records`);
      }
    } else {
      console.log('📭 No records found in masterrolls collection.');
    }

  } catch (error) {
    console.error("❌ Error fetching masterrolls data:", error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error("Make sure MongoDB is running at the specified URI");
    }
  } finally {
    await mongoPrisma.$disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the test
testFetchMasterRolls();