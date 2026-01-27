#!/usr/bin/env node
/**
 * Setup Script: Initialize Bill Numbering System
 * Run this once to set up the new bill numbering infrastructure
 * Usage: node setup-bill-numbering.js
 */

const { createBillSequencesTable } = require('./migrations/001-create-bill-sequences');
const { populateBillSequences } = require('./migrations/002-populate-bill-sequences');

const runSetup = async () => {
    console.log('🚀 Starting Bill Numbering System Setup...\n');
    
    try {
        // Step 1: Create table
        console.log('Step 1: Creating bill_sequences table');
        console.log('━'.repeat(50));
        createBillSequencesTable();
        console.log('');
        
        // Step 2: Populate from existing data
        console.log('\nStep 2: Populating sequences from existing bills');
        console.log('━'.repeat(50));
        const result = populateBillSequences();
        console.log('');
        
        console.log('\n✅ Setup completed successfully!');
        console.log('━'.repeat(50));
        console.log('Summary:');
        console.log(`  - Sequences processed: ${result.processed}`);
        console.log(`  - Errors: ${result.errors}`);
        console.log('\nNext steps:');
        console.log('1. Restart the application');
        console.log('2. Go to Sales page and create a new bill');
        console.log('3. Verify bill number format: F{FIRM_ID}-{SEQ}/{YEAR}');
        console.log('   Example: F1-0001/25-26\n');
        
    } catch (error) {
        console.error('\n❌ Setup failed:');
        console.error(error);
        process.exit(1);
    }
};

// Run if called directly
if (require.main === module) {
    runSetup();
}

module.exports = { runSetup };
