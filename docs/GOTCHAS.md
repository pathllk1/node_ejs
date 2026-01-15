# Gotchas

This document lists small but important implementation details that can surprise you during development or deployment.

## Route paths vs documentation

- Authentication endpoints are implemented under `/users`, not `/api/auth`.
  - `POST /users/login`
  - `POST /users/signup`
  - `GET /users/api/profile`

## Token delivery is hybrid (headers + cookies)

- Client JS (`public/javascripts/api.js`) primarily uses localStorage and sends tokens via headers.
- `middleware/authMiddleware.js` also falls back to cookies for browser refresh cases.
- Cookies set by the server are **not httpOnly**, which improves refresh UX but increases XSS impact if XSS exists.

## Token refresh response headers

- Refresh flow uses `X-New-Access-Token` and `X-New-Refresh-Token`.
- Any client implementation must read these headers and update stored tokens.

## Admin permissions are environment-driven

- Admin controllers require `ADMIN_ROLE_VALUE` to be set.
- Admin permission is checked by comparing `users.role` to `ADMIN_ROLE_VALUE`.

## Firm scoping is enforced by middleware

- Inventory and ledger APIs rely on `verifyFirmAccess` to attach `req.user.firm_id` from SQLite.
- If `req.user` has no `firm_id`, many endpoints return 403.

## SQLite WAL files

- WAL mode produces `app.db-wal` and `app.db-shm`. Backups/restores should consider all three files.

## Uploads / backups directories

- Admin restore uses multer destination `uploads/`.
- Admin backups write to `backups/`.
- If these directories do not exist or are not writable, admin actions will fail.

## Masterrolls uses MongoDB + mapping logic

- Masterrolls module uses Prisma Mongo (`config/prisma_mongo.js`).
- It maps SQLite firms to Mongo firms by firm name and may create missing firms/users in Mongo.
- It disconnects Prisma after each request (`mongoPrisma.$disconnect()`), which can impact performance under load.

## Inventory GST lookup uses RapidAPI

- Inventory controllers refer to `process.env.RAPIDAPI_KEY`.
- Missing key will cause GST lookup failures.

