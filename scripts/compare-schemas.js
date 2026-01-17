#!/usr/bin/env node

/**
 * Script to identify differences between SQLite and MongoDB Prisma schemas
 * This will help us understand what transformations are needed for data migration
 */

const fs = require('fs');
const path = require('path');

// Read both schema files
const sqliteSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const mongoSchemaPath = path.join(__dirname, '..', 'prisma', 'mongo-schema.prisma');

if (!fs.existsSync(sqliteSchemaPath) || !fs.existsSync(mongoSchemaPath)) {
    console.error('Schema files not found. Please ensure both schema files exist.');
    process.exit(1);
}

const sqliteSchema = fs.readFileSync(sqliteSchemaPath, 'utf8');
const mongoSchema = fs.readFileSync(mongoSchemaPath, 'utf8');

// Parse models from both schemas
function parseModels(schemaContent) {
    const models = {};
    
    // Extract model blocks
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/gs;
    let match;
    
    while ((match = modelRegex.exec(schemaContent)) !== null) {
        const modelName = match[1];
        const modelContent = match[2];
        
        // Parse fields within the model
        const fieldLines = modelContent.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('//') && !line.startsWith('@@'));
        
        const fields = {};
        fieldLines.forEach(fieldLine => {
            const parts = fieldLine.split(/\s+/);
            if (parts.length >= 2) {
                const fieldName = parts[0];
                const fieldType = parts.slice(1).join(' ').split('@')[0].trim();
                
                // Extract field attributes
                const attributesMatch = fieldLine.match(/@(.*)/);
                const attributes = attributesMatch ? attributesMatch[0] : '';
                
                fields[fieldName] = {
                    type: fieldType,
                    attributes: attributes
                };
            }
        });
        
        models[modelName] = {
            fields: fields,
            raw: match[0]
        };
    }
    
    return models;
}

function parseTypes(schemaContent) {
    const types = {};
    
    // Extract type blocks
    const typeRegex = /type\s+(\w+)\s*\{([^}]+)\}/gs;
    let match;
    
    while ((match = typeRegex.exec(schemaContent)) !== null) {
        const typeName = match[1];
        const typeContent = match[2];
        
        const fields = {};
        const fieldLines = typeContent.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('//'));
        
        fieldLines.forEach(fieldLine => {
            const parts = fieldLine.split(/\s+/);
            if (parts.length >= 2) {
                const fieldName = parts[0];
                const fieldType = parts.slice(1).join(' ').split('@')[0].trim();
                
                fields[fieldName] = {
                    type: fieldType
                };
            }
        });
        
        types[typeName] = {
            fields: fields,
            raw: match[0]
        };
    }
    
    return types;
}

console.log('='.repeat(80));
console.log('COMPARING PRISMA SCHEMAS');
console.log('='.repeat(80));

const sqliteModels = parseModels(sqliteSchema);
const mongoModels = parseModels(mongoSchema);

const sqliteTypes = parseTypes(sqliteSchema);
const mongoTypes = parseTypes(mongoSchema);

console.log('\n🔍 SQLITE MODELS FOUND:');
Object.keys(sqliteModels).forEach(modelName => {
    console.log(`  • ${modelName}: ${Object.keys(sqliteModels[modelName].fields).length} fields`);
});

console.log('\n🔍 MONGO MODELS FOUND:');
Object.keys(mongoModels).forEach(modelName => {
    console.log(`  • ${modelName}: ${Object.keys(mongoModels[modelName].fields).length} fields`);
});

console.log('\n🔍 SQLITE TYPES FOUND:');
Object.keys(sqliteTypes).forEach(typeName => {
    console.log(`  • ${typeName}: ${Object.keys(sqliteTypes[typeName].fields).length} fields`);
});

console.log('\n🔍 MONGO TYPES FOUND:');
Object.keys(mongoTypes).forEach(typeName => {
    console.log(`  • ${typeName}: ${Object.keys(mongoTypes[typeName].fields).length} fields`);
});

// Compare models
console.log('\n📋 SCHEMA DIFFERENCES:');
console.log('='.repeat(80));

// Models that exist in SQLite but not in Mongo
const sqliteOnlyModels = Object.keys(sqliteModels).filter(model => !mongoModels[model]);
console.log(`\n🟡 SQLite-only models (${sqliteOnlyModels.length}):`);
sqliteOnlyModels.forEach(model => {
    console.log(`  • ${model}`);
});

// Models that exist in Mongo but not in SQLite
const mongoOnlyModels = Object.keys(mongoModels).filter(model => !sqliteModels[model]);
console.log(`\n🟢 Mongo-only models (${mongoOnlyModels.length}):`);
mongoOnlyModels.forEach(model => {
    console.log(`  • ${model}`);
});

// Models that exist in both - compare fields
const commonModels = Object.keys(sqliteModels).filter(model => mongoModels[model]);
console.log(`\n🔵 Common models (${commonModels.length}):`);

commonModels.forEach(model => {
    const sqliteFields = sqliteModels[model].fields;
    const mongoFields = mongoModels[model].fields;
    
    const sqliteFieldNames = Object.keys(sqliteFields);
    const mongoFieldNames = Object.keys(mongoFields);
    
    const sqliteOnlyFields = sqliteFieldNames.filter(field => !mongoFields[field]);
    const mongoOnlyFields = mongoFieldNames.filter(field => !sqliteFields[field]);
    const commonFields = sqliteFieldNames.filter(field => mongoFields[field]);
    
    if (sqliteOnlyFields.length > 0 || mongoOnlyFields.length > 0 || commonFields.some(field => 
        sqliteFields[field].type !== mongoFields[field].type)) {
        
        console.log(`\n  📁 Model: ${model}`);
        
        if (sqliteOnlyFields.length > 0) {
            console.log(`    🟡 SQLite-only fields:`);
            sqliteOnlyFields.forEach(field => {
                console.log(`      - ${field}: ${sqliteFields[field].type}`);
            });
        }
        
        if (mongoOnlyFields.length > 0) {
            console.log(`    🟢 Mongo-only fields:`);
            mongoOnlyFields.forEach(field => {
                console.log(`      - ${field}: ${mongoFields[field].type}`);
            });
        }
        
        // Check type differences for common fields
        const typeDiffFields = commonFields.filter(field => 
            sqliteFields[field].type !== mongoFields[field].type);
        
        if (typeDiffFields.length > 0) {
            console.log(`    🔴 Type differences:`);
            typeDiffFields.forEach(field => {
                console.log(`      ~ ${field}: ${sqliteFields[field].type} → ${mongoFields[field].type}`);
            });
        }
    }
});

// Compare types
console.log('\n📋 TYPE DIFFERENCES:');
console.log('='.repeat(80));

const sqliteOnlyTypes = Object.keys(sqliteTypes).filter(type => !mongoTypes[type]);
const mongoOnlyTypes = Object.keys(mongoTypes).filter(type => !sqliteTypes[type]);
const commonTypes = Object.keys(sqliteTypes).filter(type => mongoTypes[type]);

console.log(`\n🟡 SQLite-only types (${sqliteOnlyTypes.length}):`);
sqliteOnlyTypes.forEach(type => {
    console.log(`  • ${type}`);
});

console.log(`\n🟢 Mongo-only types (${mongoOnlyTypes.length}):`);
mongoOnlyTypes.forEach(type => {
    console.log(`  • ${type}`);
});

console.log(`\n🔵 Common types (${commonTypes.length}):`);
commonTypes.forEach(type => {
    const sqliteFields = sqliteTypes[type].fields;
    const mongoFields = mongoTypes[type].fields;
    
    const sqliteFieldNames = Object.keys(sqliteFields);
    const mongoFieldNames = Object.keys(mongoFields);
    
    const sqliteOnlyFields = sqliteFieldNames.filter(field => !mongoFields[field]);
    const mongoOnlyFields = mongoFieldNames.filter(field => !sqliteFields[field]);
    const commonFields = sqliteFieldNames.filter(field => mongoFields[field]);
    
    if (sqliteOnlyFields.length > 0 || mongoOnlyFields.length > 0 || commonFields.some(field => 
        sqliteFields[field].type !== mongoFields[field].type)) {
        
        console.log(`\n  📁 Type: ${type}`);
        
        if (sqliteOnlyFields.length > 0) {
            console.log(`    🟡 SQLite-only fields:`);
            sqliteOnlyFields.forEach(field => {
                console.log(`      - ${field}: ${sqliteFields[field].type}`);
            });
        }
        
        if (mongoOnlyFields.length > 0) {
            console.log(`    🟢 Mongo-only fields:`);
            mongoOnlyFields.forEach(field => {
                console.log(`      - ${field}: ${mongoFields[field].type}`);
            });
        }
        
        // Check type differences for common fields
        const typeDiffFields = commonFields.filter(field => 
            sqliteFields[field].type !== mongoFields[field].type);
        
        if (typeDiffFields.length > 0) {
            console.log(`    🔴 Type differences:`);
            typeDiffFields.forEach(field => {
                console.log(`      ~ ${field}: ${sqliteFields[field].type} → ${mongoFields[field].type}`);
            });
        }
    }
});

// Summary
console.log('\n📊 SUMMARY:');
console.log('='.repeat(80));
console.log(`SQLite models: ${Object.keys(sqliteModels).length}`);
console.log(`Mongo models: ${Object.keys(mongoModels).length}`);
console.log(`Common models: ${commonModels.length}`);
console.log(`SQLite-only models: ${sqliteOnlyModels.length}`);
console.log(`Mongo-only models: ${mongoOnlyModels.length}`);

console.log(`\nSQLite types: ${Object.keys(sqliteTypes).length}`);
console.log(`Mongo types: ${Object.keys(mongoTypes).length}`);
console.log(`Common types: ${commonTypes.length}`);
console.log(`SQLite-only types: ${sqliteOnlyTypes.length}`);
console.log(`Mongo-only types: ${mongoOnlyTypes.length}`);

// Identify key transformation points
console.log('\n🔄 KEY TRANSFORMATION POINTS FOR DATA MIGRATION:');
console.log('='.repeat(80));

console.log('\nPrimary Key Transformations:');
console.log('• SQLite uses @id @default(autoincrement()) with Int type');
console.log('• MongoDB uses @id @default(auto()) @map("_id") @mongodb.ObjectId with String type');

console.log('\nDate/Time Transformations:');
console.log('• SQLite stores dates as String');
console.log('• MongoDB uses @mongodb.Date with DateTime type');

console.log('\nRelationship ID Transformations:');
console.log('• SQLite uses Int IDs for foreign keys');
console.log('• MongoDB uses @mongodb.ObjectId with String type for foreign keys');

console.log('\nArray Transformations:');
console.log('• Some fields that are arrays in MongoDB may be JSON strings in SQLite');