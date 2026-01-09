// config/prisma.js
const { PrismaClient } = require('../generated/prisma/client.js');
const path = require('path');

// For the official Prisma 6.x approach with absolute database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(__dirname, '..', 'config', 'app.db')}`
    }
  }
});

module.exports = prisma;