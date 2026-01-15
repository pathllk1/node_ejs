# Inventory System

## Overview

Inventory is implemented as two parallel modules:

- **SLS (Sales)**: mounted under `/inventory/sls` (and also `/inventory` defaults to SLS for backward compatibility)
- **PRS (Purchase)**: mounted under `/inventory/prs`

Both modules expose:

- View pages (server-rendered EJS)
- JSON APIs under `*/api/*`
- PDF export endpoints for bills (invoice PDFs)

All inventory routes are protected by JWT at the router mount (`app.js` uses `verifyToken` for `/inventory*`).

## Firm scoping (critical)

Most API endpoints include `verifyFirmAccess` from `middleware/firmMiddleware.js`.

- It reloads `firm_id` from SQLite (`users.firm_id`) and attaches it to `req.user.firm_id`.
- If the user has no firm, endpoints return `403`.

## Route prefixes

- `/inventory` → **SLS router** (`routes/inventory/sls/inventory.js`)
- `/inventory/sls` → SLS router
- `/inventory/prs` → PRS router

## View routes (examples)

SLS (`/inventory/sls`):

- `GET /stocks`
- `GET /sales`
- `GET /bills`
- `GET /sales-report`
- `GET /stock-movements`

PRS (`/inventory/prs`):

- `GET /stocks`
- `GET /purchase`
- `GET /bills`
- `GET /sales-report`
- `GET /stock-movements`

## API routes (shared pattern)

Within each module prefix, common API endpoints include:

- **Stocks**
  - `GET /api/stocks` (firm scoped)
  - `POST /api/stocks` (firm scoped)
  - `PUT /api/stocks/:id` (firm scoped)
  - `DELETE /api/stocks/:id` (firm scoped)
  - `GET /api/stocks/:id/batches` (firm scoped)

- **Parties**
  - `GET /api/parties` (firm scoped)
  - `POST /api/parties` (firm scoped)
  - `GET /api/parties/:partyId/balance` (firm scoped)

- **Bills**
  - `GET /api/bills` (firm scoped)
  - `POST /api/bills` (firm scoped)
  - `PUT /api/bills/:id` (firm scoped)
  - `PATCH /api/bills/:id/cancel` (firm scoped)
  - `GET /api/bills/next-number` (firm scoped)
  - `GET /api/bills/:id` (firm scoped)

- **Stock movements**
  - `GET /api/stock-movements` (firm scoped)
  - `POST /api/stock-movements` (firm scoped)

## PDF endpoints

Bills have pdfmake-based PDF exports:

- `GET /api/bills/:id/pdf`
- `GET /api/bills/:id/pdfmake`

Implementation: `controllers/inventory/pdfMakeController.js`.

### PDF gotchas

- Depends on font files in `public/fonts/DejaVuSans*.ttf`.
- Seller and GST settings are pulled from SQLite settings/firm_settings.

## GST lookup integration (RapidAPI)

Inventory controllers implement GST lookup via RapidAPI.

- Env var: `RAPIDAPI_KEY`
- If missing, GST lookup requests will fail.

## Data model (SQLite)

Inventory uses multiple tables created in `config/db.js` (examples):

- `stocks`
- `stock_batches`
- `parties`
- `bills`
- `stock_reg` (line items / stock register)
- related settings tables: `settings`, `firm_settings`

## Common failure modes

- **403 firm not associated**: user has no `firm_id` in `users` table.
- **PDF failures**: missing fonts, malformed `oth_chg_json`, or missing firm metadata.
- **Backup/restore interactions**: restoring DB changes inventory state immediately.
