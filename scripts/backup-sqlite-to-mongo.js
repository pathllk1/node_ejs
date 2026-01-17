#!/usr/bin/env node

/**
 * Script to backup SQLite data to MongoDB using Prisma
 * This script maps SQLite models to MongoDB models based on the schema comparison
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Import SQLite database connection
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '..', 'config', 'app.db'));

// Import MongoDB Prisma client
const mongoPrisma = require('../config/prisma_mongo');

async function backupData() {
    console.log('🚀 Starting SQLite to MongoDB backup process...');
    
    try {
        // Test database connections
        console.log('🔌 Testing database connections...');
        
        // Test SQLite
        try {
            db.prepare("SELECT 1").get();
            console.log('✅ SQLite connection successful');
        } catch (err) {
            console.error('❌ SQLite connection failed:', err.message);
            throw err;
        }
        
        // Test MongoDB
        await mongoPrisma.$connect();
        console.log('✅ MongoDB connection successful');
        
        // Clear existing MongoDB data first
        console.log('🗑️  Clearing existing MongoDB collections...');
        await clearMongoDB();
        
        // Perform the backup for each compatible model
        await backupBillSequences();
        await backupFirms();
        await backupUsers();
        await backupSettings();
        await backupRequestLogs();
        await backupParties();
        await backupPartyGsts();
        await backupStocks();
        await backupBills();
        await backupLedger();
        await backupStockReg();
        await backupFirmSettings();
        
        console.log('✅ Backup process completed successfully!');
        
    } catch (error) {
        console.error('❌ Backup process failed:', error);
        process.exit(1);
    } finally {
        // Close connections
        await mongoPrisma.$disconnect();
        db.close();
        console.log('🔒 Connections closed');
    }
}

async function clearMongoDB() {
    try {
        await mongoPrisma.billSequences.deleteMany({});
        await mongoPrisma.firms.deleteMany({});
        await mongoPrisma.users.deleteMany({});
        await mongoPrisma.settings.deleteMany({});
        await mongoPrisma.requestLogs.deleteMany({});
        await mongoPrisma.parties.deleteMany({});
        await mongoPrisma.partyGsts.deleteMany({});
        await mongoPrisma.stocks.deleteMany({});
        await mongoPrisma.bills.deleteMany({});
        await mongoPrisma.ledger.deleteMany({});
        await mongoPrisma.stockReg.deleteMany({});
        await mongoPrisma.firmSettings.deleteMany({});
        
        console.log('✅ MongoDB collections cleared');
    } catch (error) {
        console.error('❌ Error clearing MongoDB:', error.message);
        throw error;
    }
}

async function backupBillSequences() {
    console.log('📦 Backing up bill_sequences...');
    
    const sqliteBillSeqs = db.prepare("SELECT * FROM bill_sequences").all();
    const count = sqliteBillSeqs.length;
    
    console.log(`   Found ${count} bill sequences in SQLite`);
    
    for (const seq of sqliteBillSeqs) {
        try {
            await mongoPrisma.billSequences.create({
                data: {
                    id: undefined, // Let MongoDB auto-generate ObjectId
                    firmId: seq.firm_id.toString(), // Convert Int to String for ObjectId
                    financialYear: seq.financial_year,
                    lastSequence: seq.last_sequence,
                    createdAt: new Date(seq.created_at),
                    updatedAt: new Date(seq.updated_at),
                }
            });
        } catch (createErr) {
            console.error(`   ❌ Error creating bill sequence ${seq.id}:`, createErr.message);
        }
    }
    
    console.log(`   ✅ ${sqliteBillSeqs.length} bill sequences backed up`);
}

async function backupFirms() {
    console.log('🏢 Backing up firms...');
    
    const sqliteFirms = db.prepare("SELECT * FROM firms").all();
    const count = sqliteFirms.length;
    
    console.log(`   Found ${count} firms in SQLite`);
    
    for (const firm of sqliteFirms) {
        try {
            await mongoPrisma.firms.create({
                data: {
                    id: undefined, // Let MongoDB auto-generate ObjectId
                    name: firm.name,
                    legalName: firm.legal_name,
                    address: firm.address,
                    city: firm.city,
                    state: firm.state,
                    country: firm.country || 'India',
                    pincode: firm.pincode,
                    phone: firm.phone_number,
                    secondaryPhone: firm.secondary_phone,
                    email: firm.email,
                    website: firm.website,
                    businessType: firm.business_type,
                    industryType: firm.industry_type,
                    establishmentYear: firm.establishment_year,
                    employeeCount: firm.employee_count,
                    registrationNumber: firm.registration_number,
                    registrationDate: firm.registration_date ? new Date(firm.registration_date) : undefined,
                    cinNumber: firm.cin_number,
                    panNumber: firm.pan_number,
                    gstNo: firm.gst_number,
                    taxId: firm.tax_id,
                    vatNumber: firm.vat_number,
                    bankAccountNumber: firm.bank_account_number,
                    bankName: firm.bank_name,
                    bankBranch: firm.bank_branch,
                    ifscCode: firm.ifsc_code,
                    paymentTerms: firm.payment_terms || 'Net 30',
                    licenseNumbers: firm.license_numbers,
                    insuranceDetails: firm.insurance_details,
                    currency: firm.currency || 'INR',
                    timezone: firm.timezone || 'Asia/Kolkata',
                    fiscalYearStart: firm.fiscal_year_start || 4,
                    invoicePrefix: firm.invoice_prefix || 'INV',
                    quotePrefix: firm.quote_prefix || 'QT',
                    poPrefix: firm.po_prefix || 'PO',
                    logoUrl: firm.logo_url,
                    invoiceTemplate: firm.invoice_template || 'standard',
                    enableEInvoice: firm.enable_e_invoice || 0,
                    createdAt: firm.created_at ? new Date(firm.created_at) : new Date(),
                    updatedAt: firm.updated_at ? new Date(firm.updated_at) : new Date(),
                    additionalGSTs: [], // Initialize empty array
                }
            });
        } catch (createErr) {
            console.error(`   ❌ Error creating firm ${firm.id}:`, createErr.message);
        }
    }
    
    console.log(`   ✅ ${sqliteFirms.length} firms backed up`);
}

async function backupUsers() {
    console.log('👤 Backing up users...');
    
    const sqliteUsers = db.prepare("SELECT * FROM users").all();
    const count = sqliteUsers.length;
    
    console.log(`   Found ${count} users in SQLite`);
    
    for (const user of sqliteUsers) {
        try {
            await mongoPrisma.users.create({
                data: {
                    id: undefined, // Let MongoDB auto-generate ObjectId
                    email: user.email,
                    fullName: user.fullname || user.fullname,
                    username: user.username,
                    password: user.password,
                    firmId: user.firm_id ? user.firm_id.toString() : null,
                    role: user.role ? user.role.toString() : 'USER', // Convert Int to String
                    createdAt: user.created_at ? new Date(user.created_at) : new Date(),
                    updatedAt: user.updated_at ? new Date(user.updated_at) : new Date(),
                    activeSessions: [],
                    passwordHistory: [],
                }
            });
        } catch (createErr) {
            console.error(`   ❌ Error creating user ${user.id}:`, createErr.message);
        }
    }
    
    console.log(`   ✅ ${sqliteUsers.length} users backed up`);
}

async function backupSettings() {
    console.log('⚙️  Backing up settings...');
    
    const sqliteSettings = db.prepare("SELECT * FROM settings").all();
    const count = sqliteSettings.length;
    
    console.log(`   Found ${count} settings in SQLite`);
    
    for (const setting of sqliteSettings) {
        try {
            await mongoPrisma.settings.create({
                data: {
                    id: undefined, // Let MongoDB auto-generate ObjectId
                    settingKey: setting.setting_key,
                    settingValue: setting.setting_value,
                    description: setting.description,
                    createdAt: setting.created_at ? new Date(setting.created_at) : new Date(),
                    updatedAt: setting.updated_at ? new Date(setting.updated_at) : new Date(),
                }
            });
        } catch (createErr) {
            console.error(`   ❌ Error creating setting ${setting.setting_key}:`, createErr.message);
        }
    }
    
    console.log(`   ✅ ${sqliteSettings.length} settings backed up`);
}

async function backupRequestLogs() {
    console.log('📝 Backing up request_logs...');
    
    const sqliteLogs = db.prepare("SELECT * FROM request_logs").all();
    const count = sqliteLogs.length;
    
    console.log(`   Found ${count} request logs in SQLite`);
    
    for (const log of sqliteLogs) {
        try {
            await mongoPrisma.requestLogs.create({
                data: {
                    id: undefined, // Let MongoDB auto-generate ObjectId
                    method: log.method,
                    url: log.url,
                    ip: log.ip,
                    username: log.username,
                    userAgent: log.user_agent,
                    timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
                }
            });
        } catch (createErr) {
            console.error(`   ❌ Error creating log ${log.id}:`, createErr.message);
        }
    }
    
    console.log(`   ✅ ${sqliteLogs.length} request logs backed up`);
}

async function backupParties() {
    console.log('👥 Backing up parties...');
    
    const sqliteParties = db.prepare("SELECT * FROM parties").all();
    const count = sqliteParties.length;
    
    console.log(`   Found ${count} parties in SQLite`);
    
    for (const party of sqliteParties) {
        try {
            await mongoPrisma.parties.create({
                data: {
                    id: undefined, // Let MongoDB auto-generate ObjectId
                    addr: party.addr || '',
                    contact: party.contact || '',
                    createdAt: party.created_at ? new Date(party.created_at) : new Date(),
                    firm: party.firm,
                    gstin: party.gstin || 'UNREGISTERED',
                    hasMultipleGSTs: party.has_multiple_gsts ? !!party.has_multiple_gsts : false,
                    pan: party.pan || '',
                    pin: party.pin || 0,
                    state: party.state || '',
                    stateCode: party.state_code || 0,
                    supply: party.supply,
                    updatedAt: party.updated_at ? new Date(party.updated_at) : new Date(),
                    usern: party.usern,
                    hasMultipleGsts: party.has_multiple_gsts || 0,
                    firmId: party.firm_id ? party.firm_id.toString() : null,
                    additionalGSTs: [], // Initialize empty array
                    billIds: [], // Initialize empty array
                }
            });
        } catch (createErr) {
            console.error(`   ❌ Error creating party ${party.id}:`, createErr.message);
        }
    }
    
    console.log(`   ✅ ${sqliteParties.length} parties backed up`);
}

async function backupPartyGsts() {
    console.log('🏷️  Backing up party_gsts...');
    
    const sqlitePartyGsts = db.prepare("SELECT * FROM party_gsts").all();
    const count = sqlitePartyGsts.length;
    
    console.log(`   Found ${count} party GSTs in SQLite`);
    
    for (const gsts of sqlitePartyGsts) {
        try {
            await mongoPrisma.partyGsts.create({
                data: {
                    id: undefined, // Let MongoDB auto-generate ObjectId
                    partyId: gsts.party_id.toString(), // Convert Int to String for ObjectId
                    gstNumber: gsts.gst_number,
                    state: gsts.state,
                    stateCode: gsts.state_code,
                    locationName: gsts.location_name,
                    address: gsts.address,
                    city: gsts.city,
                    pincode: gsts.pincode,
                    contactPerson: gsts.contact_person,
                    contactNumber: gsts.contact_number,
                    isActive: gsts.is_active,
                    isDefault: gsts.is_default,
                    registrationType: gsts.registration_type,
                    validFrom: new Date(gsts.valid_from),
                    validTo: gsts.valid_to ? new Date(gsts.valid_to) : null,
                    lastUsedDate: gsts.last_used_date ? new Date(gsts.last_used_date) : null,
                    transactionCount: gsts.transaction_count,
                }
            });
        } catch (createErr) {
            console.error(`   ❌ Error creating party GST ${gsts.id}:`, createErr.message);
        }
    }
    
    console.log(`   ✅ ${sqlitePartyGsts.length} party GSTs backed up`);
}

async function backupStocks() {
    console.log('📦 Backing up stocks...');
    
    const sqliteStocks = db.prepare("SELECT * FROM stocks").all();
    const count = sqliteStocks.length;
    
    console.log(`   Found ${count} stocks in SQLite`);
    
    for (const stock of sqliteStocks) {
        try {
            await mongoPrisma.stocks.create({
                data: {
                    id: undefined, // Let MongoDB auto-generate ObjectId
                    item: stock.item,
                    pno: stock.pno ? [stock.pno] : [], // Convert to array if exists
                    oem: stock.oem || '',
                    hsn: stock.hsn,
                    qty: Math.round(stock.qty), // Convert Float to Int
                    uom: stock.uom,
                    rate: Math.round(stock.rate), // Convert Float to Int
                    grate: Math.round(stock.grate), // Convert Float to Int
                    total: Math.round(stock.total), // Convert Float to Int
                    mrp: stock.mrp,
                    batches: stock.batches || '',
                    firm: stock.firm,
                    user: stock.user,
                    createdAt: stock.created_at ? new Date(stock.created_at) : new Date(),
                    updatedAt: stock.updated_at ? new Date(stock.updated_at) : new Date(),
                    firmId: stock.firm_id ? stock.firm_id.toString() : null,
                    batch: stock.batches ? [stock.batches] : null, // Convert to array
                }
            });
        } catch (createErr) {
            console.error(`   ❌ Error creating stock ${stock.id}:`, createErr.message);
        }
    }
    
    console.log(`   ✅ ${sqliteStocks.length} stocks backed up`);
}

async function backupBills() {
    console.log('📄 Backing up bills...');
    
    const sqliteBills = db.prepare("SELECT * FROM bills").all();
    const count = sqliteBills.length;
    
    console.log(`   Found ${count} bills in SQLite`);
    
    for (const bill of sqliteBills) {
        try {
            await mongoPrisma.bills.create({
                data: {
                    id: undefined, // Let MongoDB auto-generate ObjectId
                    addr: bill.addr || '',
                    attachmentFileId: bill.attachment_file_id,
                    attachmentUrl: bill.attachment_url,
                    bdate: new Date(bill.bdate), // Convert String to Date
                    bno: bill.bno,
                    btype: bill.btype,
                    cgst: bill.cgst ? { value: bill.cgst } : null, // Convert to JSON
                    consigneeAddress: bill.consignee_address,
                    consigneeGstin: bill.consignee_gstin,
                    consigneeName: bill.consignee_name,
                    consigneePin: bill.consignee_pin,
                    consigneeState: bill.consignee_state,
                    createdAt: bill.created_at ? new Date(bill.created_at) : new Date(),
                    disc: bill.disc ? Math.round(bill.disc) : null, // Convert Float to Int
                    dispatchThrough: bill.dispatch_through || '',
                    docketNo: bill.docket_no || '',
                    firm: bill.firm,
                    gstin: bill.gstin || 'UNREGISTERED',
                    gtot: bill.gtot ? { value: bill.gtot } : null, // Convert to JSON
                    igst: bill.igst ? { value: bill.igst } : null, // Convert to JSON
                    narration: bill.narration,
                    ntot: Math.round(bill.ntot), // Convert Float to Int
                    orderDate: bill.order_date ? new Date(bill.order_date) : null,
                    orderNo: bill.order_no || '',
                    oth_chg: [], // Initialize empty array
                    partyId: bill.party_id ? bill.party_id.toString() : null,
                    pin: bill.pin || 0,
                    rof: bill.rof,
                    sgst: bill.sgst ? { value: bill.sgst } : null, // Convert to JSON
                    state: bill.state,
                    status: bill.status || 'ACTIVE',
                    stockRegIds: [], // Initialize empty array
                    supply: bill.supply,
                    updatedAt: bill.updated_at ? new Date(bill.updated_at) : new Date(),
                    usern: bill.usern,
                    vehicleNo: bill.vehicle_no || '',
                    reverseCharge: bill.reverse_charge || 0,
                    stateCode: bill.state_code || null,
                    consigneeStateCode: bill.consignee_state_code || null,
                    cancellationReason: bill.cancellation_reason,
                    cancelledAt: bill.cancelled_at ? new Date(bill.cancelled_at) : null,
                    cancelledBy: bill.cancelled_by ? bill.cancelled_by.toString() : null,
                    othChgJson: bill.oth_chg_json,
                    gstSelectionJson: bill.gst_selection_json,
                    firmId: bill.firm_id ? bill.firm_id.toString() : null,
                }
            });
        } catch (createErr) {
            console.error(`   ❌ Error creating bill ${bill.id}:`, createErr.message);
        }
    }
    
    console.log(`   ✅ ${sqliteBills.length} bills backed up`);
}

async function backupLedger() {
    console.log('💰 Backing up ledger...');
    
    const sqliteLedger = db.prepare("SELECT * FROM ledger").all();
    const count = sqliteLedger.length;
    
    console.log(`   Found ${count} ledger entries in SQLite`);
    
    for (const ledgerEntry of sqliteLedger) {
        try {
            await mongoPrisma.ledger.create({
                data: {
                    id: undefined, // Let MongoDB auto-generate ObjectId
                    voucherId: ledgerEntry.voucher_id,
                    voucherType: ledgerEntry.voucher_type,
                    voucherNo: ledgerEntry.voucher_no,
                    accountHead: ledgerEntry.account_head,
                    accountType: ledgerEntry.account_type,
                    debitAmount: ledgerEntry.debit_amount,
                    creditAmount: ledgerEntry.credit_amount,
                    narration: ledgerEntry.narration,
                    billId: ledgerEntry.bill_id ? ledgerEntry.bill_id.toString() : null,
                    partyId: ledgerEntry.party_id ? ledgerEntry.party_id.toString() : null,
                    taxType: ledgerEntry.tax_type,
                    taxRate: ledgerEntry.tax_rate,
                    transactionDate: new Date(ledgerEntry.transaction_date), // Convert String to Date
                    createdBy: ledgerEntry.created_by,
                    firmId: ledgerEntry.firm_id.toString(), // Convert Int to String
                    createdAt: ledgerEntry.created_at ? new Date(ledgerEntry.created_at) : new Date(),
                    updatedAt: ledgerEntry.updated_at ? new Date(ledgerEntry.updated_at) : new Date(),
                }
            });
        } catch (createErr) {
            console.error(`   ❌ Error creating ledger entry ${ledgerEntry.id}:`, createErr.message);
        }
    }
    
    console.log(`   ✅ ${sqliteLedger.length} ledger entries backed up`);
}

async function backupStockReg() {
    console.log('📊 Backing up stock_reg...');
    
    const sqliteStockReg = db.prepare("SELECT * FROM stock_reg").all();
    const count = sqliteStockReg.length;
    
    console.log(`   Found ${count} stock register entries in SQLite`);
    
    for (const stockReg of sqliteStockReg) {
        try {
            await mongoPrisma.stockReg.create({
                data: {
                    id: undefined, // Let MongoDB auto-generate ObjectId
                    type: stockReg.type,
                    bno: stockReg.bno,
                    bdate: new Date(stockReg.bdate), // Convert String to Date
                    supply: stockReg.supply,
                    item: stockReg.item,
                    itemNarration: stockReg.item_narration,
                    pno: stockReg.pno,
                    batch: stockReg.batch,
                    oem: stockReg.oem,
                    hsn: stockReg.hsn,
                    qty: stockReg.qty,
                    qtyh: stockReg.qtyh,
                    uom: stockReg.uom,
                    rate: stockReg.rate,
                    grate: stockReg.grate,
                    cgst: stockReg.cgst,
                    sgst: stockReg.sgst,
                    igst: stockReg.igst,
                    disc: stockReg.disc,
                    discamt: stockReg.discamt,
                    total: stockReg.total,
                    mrp: stockReg.mrp,
                    expiryDate: stockReg.expiry_date ? new Date(stockReg.expiry_date) : null,
                    project: stockReg.project,
                    user: stockReg.user,
                    firm: stockReg.firm,
                    stockId: stockReg.stock_id ? stockReg.stock_id.toString() : null,
                    billId: stockReg.bill_id ? stockReg.bill_id.toString() : null,
                    createdAt: stockReg.created_at ? new Date(stockReg.created_at) : new Date(),
                    updatedAt: stockReg.updated_at ? new Date(stockReg.updated_at) : new Date(),
                    firmId: stockReg.firm_id ? stockReg.firm_id.toString() : null,
                }
            });
        } catch (createErr) {
            console.error(`   ❌ Error creating stock register entry ${stockReg.id}:`, createErr.message);
        }
    }
    
    console.log(`   ✅ ${sqliteStockReg.length} stock register entries backed up`);
}

async function backupFirmSettings() {
    console.log('🏢 Backing up firm_settings...');
    
    const sqliteFirmSettings = db.prepare("SELECT * FROM firm_settings").all();
    const count = sqliteFirmSettings.length;
    
    console.log(`   Found ${count} firm settings in SQLite`);
    
    for (const firmSetting of sqliteFirmSettings) {
        try {
            await mongoPrisma.firmSettings.create({
                data: {
                    id: undefined, // Let MongoDB auto-generate ObjectId
                    firmId: firmSetting.firm_id.toString(), // Convert Int to String
                    settingKey: firmSetting.setting_key,
                    settingValue: firmSetting.setting_value,
                    description: firmSetting.description,
                    createdAt: firmSetting.created_at ? new Date(firmSetting.created_at) : new Date(),
                    updatedAt: firmSetting.updated_at ? new Date(firmSetting.updated_at) : new Date(),
                }
            });
        } catch (createErr) {
            console.error(`   ❌ Error creating firm setting ${firmSetting.id}:`, createErr.message);
        }
    }
    
    console.log(`   ✅ ${sqliteFirmSettings.length} firm settings backed up`);
}

// Run the backup
backupData();