# Operations

## Process model

- **Production**: run Node only with `npm start` (executes `node ./bin/www`).
- **Development**: `npm run dev` starts multiple watchers (Tailwind watch, Nodemon, Python uvicorn reload). Do not use this on small servers.

## Required directories

- `config/` holds SQLite database files:
  - `config/app.db`
  - `config/app.db-wal`
  - `config/app.db-shm`
- Admin DB restore uses multer destination `uploads/`.
- Admin DB backups are written into `backups/`.

Make sure `uploads/` and `backups/` are writable by the service user.

## Environment variables

### Node.js server

- `PORT` (optional): HTTP port, default `3000`.
- `ACCESS_TOKEN_SECRET` (required): minimum 32 characters; server exits if missing/weak.
- `REFRESH_TOKEN_SECRET` (required): minimum 32 characters; server exits if missing/weak.
- `ADMIN_ROLE_VALUE` (required for admin features): numeric role value.
- `MONGODB_URI` (optional): Mongo connection string for masterrolls.
- `RAPIDAPI_KEY` (optional but required for GST lookup in inventory modules).

### Python AI service

- `OPENROUTER_API_KEY` for OpenRouter.
- `DB_PATH` optional (defaults in Python service docs).

## Auth tokens in production

- Login returns tokens in JSON fields:
  - `access_token`
  - `refresh_token`
- Subsequent API calls send:
  - `Authorization: Bearer <access_token>`
  - `X-Refresh-Token: <refresh_token>`
- When the server refreshes tokens, it sets response headers:
  - `X-New-Access-Token`
  - `X-New-Refresh-Token`
- The server also sets cookies (`access_token`, `refresh_token`) with `sameSite=Strict` for browser refresh fallback.

## SQLite operational notes

- WAL mode is enabled in `config/db.js`. Expect `.db-wal` and `.db-shm` files.
- DB backup should include the `.db` plus `.db-wal` and `.db-shm` when present.

## PDF generation operational notes

- pdfmake-based controllers require font files in `public/fonts/DejaVuSans*.ttf`.
- Puppeteer-based controllers spawn Chromium.
  - Ensure adequate RAM/CPU.
  - Prefer running Node under a process manager that correctly reaps children.

## Common deployment patterns (recommended)

- Run Node behind a reverse proxy (nginx) with HTTPS termination.
- Run Python service as a separate systemd service and keep it on localhost only.
- Use a process manager (systemd/pm2) for Node with conservative restart policy to avoid restart storms.

