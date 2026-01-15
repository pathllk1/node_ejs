# Architecture

## Runtime entrypoints

- Node.js HTTP server: `bin/www` creates an HTTP server from `app.js` and listens on `process.env.PORT` (default `3000`).
- Express application: `app.js` configures middleware, mounts routers, and renders EJS views.

## High-level components

### Node.js (Express) application

- **Web server + API gateway**
- **Authentication**: JWT access/refresh tokens via `controllers/authController.js` and `middleware/authMiddleware.js`
- **Security middleware**: CSP + security headers (`middleware/csp.js`), request sanitization (`middleware/sanitizer.js`)
- **Audit logging**: request log insert into SQLite (`middleware/requestLogger.js`)
- **Feature modules**:
  - Inventory (sales/purchase)
  - Ledger
  - Masterrolls (employee management)
  - Admin (logs/settings/firm management/db backup/restore)

### SQLite database (better-sqlite3)

- Primary persistence for users, firms, inventory, ledger, settings, request logs.
- Initialized and migrated at startup by `config/db.js`.
- WAL mode enabled: `db.pragma('journal_mode = WAL')`.

### PDF generation

Two strategies exist in the codebase:

- **pdfmake-based server-side PDF generation**
  - Inventory invoice PDFs: `controllers/inventory/pdfMakeController.js`
  - Ledger PDFs: `controllers/ledger/pdfMakeController.js`
  - Depends on font files in `public/fonts/` (DejaVu Sans).

- **Puppeteer-based PDF generation**
  - Some controllers use `puppeteer.launch()` to create Chromium and render HTML to PDF.
  - This spawns OS child processes (Chromium). On servers, ensure resources and proper process management.

### Python AI microservice (FastAPI)

- Runs separately on `http://127.0.0.1:5200`.
- Node server calls it via HTTP from `controllers/aiController.js`.
- See `docs/PYTHON_DOCUMENTATION.md`.

### Prisma usage

- Prisma for SQLite exists at `config/prisma.js` and uses a file URL pointing at `config/app.db`.
- Prisma for Mongo exists at `config/prisma_mongo.js` and uses `MONGODB_URI`.
- Masterrolls module uses Prisma Mongo and maps SQLite firm → Mongo firm by firm name.

## Express middleware order (as implemented)

From `app.js`:

1. `morgan` request logging (dev format)
2. JSON/body parsing
3. `cookie-parser`
4. Static assets `public/`
5. `csp` (CSP + security headers)
6. `sanitizer` (sanitizes `req.body`, `req.query`, `req.params`)
7. `optionalAuth` (best-effort JWT decode for logging)
8. `requestLogger` (inserts into SQLite `request_logs`)
9. Routers mounted

## Router mounts (prefixes)

From `app.js`:

- `/` → `routes/index.js`
- `/users` → `routes/users.js`
- `/ai` → `routes/ai_py_route.js` (protected by `verifyToken` at mount)
- `/admin` → `routes/admin.js` (protected by `verifyToken` at mount)
- `/inventory` → `routes/inventory/sls/inventory.js` (protected by `verifyToken` at mount)
- `/inventory/sls` → same as above
- `/inventory/prs` → `routes/inventory/prs/inventory.js` (protected by `verifyToken` at mount)
- `/ledger` → `routes/ledger.js` (protected by `verifyToken` at mount)
- `/masterrolls` → `routes/masterrolls.js` (protected by `verifyToken` at mount)

## Authorization model

- **Authentication**: `verifyToken` checks access token and refresh token.
- **Firm scoping**:
  - `middleware/firmMiddleware.js` provides `verifyFirmAccess` which reloads `firm_id` from SQLite and attaches it to `req.user.firm_id`.
  - Inventory and ledger APIs use `verifyFirmAccess` on API routes.
- **Admin role**:
  - Admin endpoints check `process.env.ADMIN_ROLE_VALUE` and compare it to `users.role` in SQLite.

