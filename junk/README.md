# Junk Folder

This folder contains files that are **not essential** for the application's core functionality. These are mostly:

- One-time setup scripts
- Test scripts
- Utility scripts
- Documentation files
- Temporary files

## Files Moved Here

| File | Purpose | Safe to Delete? |
|------|---------|-----------------|
| `bills_schema.json` | Database schema reference | ✅ Yes |
| `BUG_FIX_REPORT.js` | Documentation of bug fixes | ✅ Yes |
| `check_db.js` | Database check utility | ✅ Yes |
| `check-schema.js` | Schema check utility | ✅ Yes |
| `temp_check_db.js` | Temporary DB check script | ✅ Yes |
| `test_api_response.js` | API test script | ✅ Yes |
| `test-mongo-user.js` | MongoDB test script | ✅ Yes |
| `test-postgres-data-insertion.js` | PostgreSQL test script | ✅ Yes |
| `test-prisma.js` | Prisma test script | ✅ Yes |
| `SECURITY_DOCUMENTATION.js` | Security documentation | ✅ Yes |
| `IMPLEMENTATION_SUMMARY.js` | Implementation summary | ✅ Yes |
| `misc.txt` | Miscellaneous notes/commands | ✅ Yes |
| `delete_bills.js` | ❌ DANGEROUS script to delete all bills | ⚠️ Keep for reference |
| `migrate-existing-data.js` | Data migration script (one-time use) | ✅ Yes |
| `set-admin-role.js` | Admin role assignment script (one-time use) | ✅ Yes |
| `setup-bill-numbering.js` | Setup script (one-time use) | ✅ Yes |
| `run_migrations.js` | Migration runner | ✅ Yes |
| `generate_prs.py` | Python script to generate purchase system | ✅ Yes |

## Notes

- ✅ **Safe to Delete**: Files marked with ✅ can be safely deleted if not needed
- ⚠️ **Keep for Reference**: Files marked with ⚠️ should be kept for documentation/reference
- ❌ **DANGEROUS**: The `delete_bills.js` script should never be run unless intentionally clearing all data

## When to Clean This Folder

You can delete the contents of this folder if:
1. You have no need for historical documentation
2. You don't plan to run the test scripts again
3. The setup/migration scripts have already been run successfully