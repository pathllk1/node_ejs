# Ledger System

## Overview

Ledger functionality is mounted under `/ledger` and is protected by JWT at the router mount (`app.js` uses `verifyToken`).

The ledger module includes:

- A ledger page (EJS view)
- JSON APIs for accounts and account details
- PDF export endpoints (pdfmake)

## Firm scoping

Ledger routes use `verifyFirmAccess` middleware.

- Ensures `req.user.firm_id` is loaded from SQLite (`users.firm_id`).
- Queries are always filtered by `firm_id`.

## Routes

From `routes/ledger.js` (prefix `/ledger`):

- `GET /` (view) — `ledgerController.renderLedgerPage`

- `GET /api/accounts` — list ledger accounts
- `GET /api/details/:account_head` — account transaction details

### PDF exports

Ledger PDFs are generated with pdfmake (not puppeteer) via `controllers/ledger/pdfMakeController.js`.

- `GET /api/export-pdf/:account_head` — account ledger PDF
- `GET /api/export-general-ledger` — general ledger PDF
- `GET /api/export-trial-balance` — trial balance PDF
- `POST /api/export-account-type-pdf` — account-type detail PDF (expects request body)

### PDF gotchas

- Requires `public/fonts/DejaVuSans*.ttf`.
- Uses firm metadata from `firms` table.
- Running balance is computed in-memory during generation.

## Data model (SQLite)

Ledger uses `ledger` table created/migrated in `config/db.js`.

Common fields:

- `firm_id`
- `account_head`
- `account_type`
- `transaction_date`
- `debit_amount`
- `credit_amount`
- `voucher_no`, `voucher_type`, `narration`

## Common failure modes

- **404 no records found**: PDF export endpoints return 404 if there are no rows for the account/date range.
- **403 firm not associated**: user missing firm association.
- **PDF output issues**: fonts missing, invalid date strings.
