// test-mongo-user.js
// Script to test MongoDB user creation

const mongoPrisma = require('./config/prisma_mongo.js');

async function testMongoUser() {
  console.log("🔍 Attempting to create a user in MongoDB...");

  try {
    // Create a new user record as per the schema
    const newUser = await mongoPrisma.users.create({
      data: {
        fullname: 'John Doe',
        username: 'johndoe',
        email: 'john.doe@example.com',
        password: '$2b$10$hashedpasswordexample', // This would normally be a hashed password
        firm_id: null, // Optional field
        role: 1, // Optional field
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    });

    console.log(`✅ Success! Created user with ID: ${newUser.id}`);
    console.log('User details:', JSON.stringify(newUser, null, 2));

    // Also fetch the user to verify it was created
    const fetchedUser = await mongoPrisma.users.findUnique({
      where: {
        id: newUser.id
      }
    });

    console.log('Fetched user:', JSON.stringify(fetchedUser, null, 2));

  } catch (error) {
    console.error("❌ Error creating user:", error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error("Make sure MongoDB is running at the specified URI");
    }
  } finally {
    await mongoPrisma.$disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the test
testMongoUser();