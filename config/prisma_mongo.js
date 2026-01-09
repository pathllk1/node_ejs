// config/prisma_mongo.js
// MongoDB-specific Prisma client configuration

const { PrismaClient } = require('../generated/prisma_mongo/client.js');

// Initialize Prisma client for MongoDB
const mongoPrisma = new PrismaClient({
  datasources: {
    mongodb: {
      url: process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database_name'
    }
  }
});

module.exports = mongoPrisma;