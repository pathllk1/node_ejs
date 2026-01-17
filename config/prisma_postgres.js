// config/prisma_postgres.js
// PostgreSQL-specific Prisma client configuration

const { PrismaClient } = require('../generated/prisma_postgres/client.js');

// Initialize Prisma client for PostgreSQL
const postgresPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_URL || 'postgresql://localhost:5432/postgres'  // Default to local PostgreSQL
    }
  }
});

module.exports = postgresPrisma;