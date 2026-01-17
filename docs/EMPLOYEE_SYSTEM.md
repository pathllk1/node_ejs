# Employee (Masterrolls) System

## Overview

Employee management is implemented in the **Masterrolls** module.

- Mounted at `/masterrolls`
- Protected by JWT at mount (`app.js` uses `verifyToken`)
- UI is an EJS page with client-side JS that calls JSON APIs.

## UI implementation

- View template: `views/masterrolls/masterrolls.ejs`
- Client JS: `public/javascripts/masterrolls/masterrolls.js`

The page implements:

- Client-side table rendering + pagination
- Details modal (`#employeeModal`)
- Create/Edit form modal (`#employeeFormModal`)
- Delete confirmation modal (`#deleteConfirmModal`)

## API endpoints

The UI fetches employees from:

- `GET /masterrolls/api/masterrolls`

And performs CRUD:

- `POST /masterrolls/api/masterrolls`
- `PUT /masterrolls/api/masterrolls/:id`
- `DELETE /masterrolls/api/masterrolls/:id`

(See `routes/masterrolls.js` and the masterrolls controller for authoritative behavior.)

## Data storage model (mixed SQLite + Mongo)

- Firms and users live in SQLite.
- Masterrolls employees live in MongoDB via Prisma Mongo (`config/prisma_mongo.js`, env `MONGODB_URI`).
- The controller maps SQLite firm → Mongo firm by **firm name**.

## Important gotchas

- Prisma Mongo client is disconnected after requests (`mongoPrisma.$disconnect()`), which can impact performance under load.
- Firm mapping by name can create duplicates if firm names change.

## Known bug fixed: Edit button opening Add modal

Symptom:

- In the employee details modal, clicking **Edit** opened the form modal in "Add New Employee" mode with a blank form.

Root cause:

- The click handler closed the details modal **before** opening the edit form.
- `closeModal()` resets the shared state `currentEmployee = null`.
- Then `openFormModal(currentEmployee)` received `null`, triggering "Add" mode.

Fix:

- Capture the employee in a local variable before calling `closeModal()` and pass that to `openFormModal()`.
