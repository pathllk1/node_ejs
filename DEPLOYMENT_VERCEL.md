# Vercel Deployment Guide

This application can be deployed to Vercel with minimal configuration changes.

## Prerequisites

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

## Environment Variables

Set these environment variables in your Vercel project settings:

```
# Database Configuration
TURSO_DATABASE_URL=your_turso_database_url
TURSO_AUTH_TOKEN=your_turso_auth_token
MONGODB_URI=your_mongodb_atlas_connection_string

# JWT Configuration  
JWT_SECRET=your_jwt_secret_key

# Application Settings
NODE_ENV=production
PORT=3000

# Optional - for detecting Vercel environment
VERCEL=1
```

## Deployment Steps

1. **Initial Setup**:
```bash
# Deploy to Vercel
vercel

# Or deploy and alias to production
vercel --prod
```

2. **Configure Environment Variables**:
After deploying, go to your Vercel dashboard and add the required environment variables.

3. **Database Migration**:
Run the bill numbering setup after deployment:
```bash
# SSH into your Vercel function or run locally
node setup-bill-numbering.js
```

## Critical Database Dependencies

### Both Databases Are Required:
This application uses a **hybrid database architecture** that requires both databases:

1. **Turso (Primary)** - Core business logic:
   - Bills, firms, users, inventory
   - Authentication and authorization
   - Financial transactions

2. **MongoDB (Essential)** - Advanced features:
   - **Master Rolls** (Employee management)
   - **AI Chat History** (`aihistories`)
   - **Analytics and Reporting**
   - **Document Storage**
   - **Admin Backup/Restore Operations**

### Why Both Are Needed:
- Master rolls functionality is stored in MongoDB
- AI chat features depend on MongoDB
- Admin database operations require MongoDB
- Removing either breaks core functionality

## Multi-Prisma Schema Strategy

Both Prisma schemas are generated during build:

### 1. Main Schema (`prisma/schema.prisma`) - **REQUIRED**
- **Purpose**: Core business logic
- **Database**: SQLite/Turso (production)
- **Usage**: Essential for all application features

### 2. MongoDB Schema (`prisma/mongo-schema.prisma`) - **REQUIRED** 
- **Purpose**: Advanced features and employee data
- **Database**: MongoDB Atlas
- **Usage**: Master rolls, AI chat, analytics
- **Vercel Requirement**: MongoDB Atlas connection

### 3. PostgreSQL Schema (`prisma/postgres-schema.prisma`) - **EXCLUDED**
- **Purpose**: Development/testing examples
- **Database**: PostgreSQL
- **Usage**: Development and testing only

## Important Notes

### File Upload Handling
- **Local Development**: Uses disk storage (multer with file system)
- **Vercel Deployment**: Uses memory storage with 5MB limit
- **Production Recommendation**: Integrate with cloud storage (AWS S3, Cloudinary, etc.)

### Database Considerations
- **Turso**: Serverless-friendly, connection pooling handled automatically
- **MongoDB**: Requires MongoDB Atlas for Vercel deployment
- **Prisma Clients**: Both generated during build process

### Custom Domain
Configure custom domains through Vercel dashboard after successful deployment.

## Troubleshooting

Common issues and solutions:

1. **Build Failures**: Check logs in Vercel dashboard
2. **Environment Variables**: Ensure all required vars are set
3. **Database Connection**: Verify both Turso and MongoDB credentials
4. **Static Assets**: Make sure public/ directory is properly configured
5. **Prisma Client**: Both schemas generated during build
6. **File Uploads**: Implement cloud storage for production use
7. **MongoDB Connection**: Ensure MongoDB Atlas cluster is configured

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Both Prisma clients are generated automatically during build
```

The application will be available at `http://localhost:3000`

## Removed Components for Vercel Deployment

- Python service (runs separately or needs migration)
- Development-only scripts and test files
- PostgreSQL schema (development/testing only)