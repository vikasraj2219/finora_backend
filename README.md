# Personal Finance Management System — Backend

A standalone REST API (Node.js + Express + MongoDB) for the Personal Finance Management System.
This is an independent project — it does not share any code, models, or database with the
Loan & Interest Management System, but follows the same architecture and coding conventions.

## Tech Stack
- Node.js + Express
- MongoDB + Mongoose
- JWT auth (access + refresh tokens), bcryptjs
- express-validator for validation
- Multer for statement/receipt uploads
- csv-parse / xlsx / pdf-parse for statement imports
- exceljs / pdfkit for report exports

## Folder Structure
```
personal-finance-backend/
├── src/
│   ├── config/          # db.js — MongoDB connection
│   ├── controllers/     # request handlers
│   ├── middlewares/      # auth, validation, error handling, upload
│   ├── models/           # Mongoose schemas
│   ├── routes/           # Express routers
│   ├── services/         # business logic layer (balance updates, import parsing, etc.)
│   ├── utils/             # ApiError, ApiResponse, catchAsync, pagination, JWT helpers
│   ├── validators/       # express-validator rule sets
│   ├── jobs/              # scheduled/cron jobs (recurring transactions, insights)
│   ├── app.js             # Express app setup
│   └── server.js          # entry point
├── uploads/                # statement imports / receipts
└── package.json
```

## Getting Started
```
cd personal-finance-backend
npm install
cp .env.example .env   # edit MONGO_URI + JWT secrets
npm run dev
```
API runs at `http://localhost:5100/api/v1`.

## Build Phases

- **Phase 1 (this delivery): Foundation** — project scaffold, DB connection, global error handling,
  ApiError/ApiResponse/catchAsync/pagination utilities, JWT auth (register/login/refresh/me/change-password,
  first user becomes admin), role-based auth middleware, and base Mongoose models for the core domain
  (BankAccount, UpiAccount, Category, Merchant, Transaction) so later phases can build directly on top.
- **Phase 2 (next):** Bank & UPI account management (full CRUD), Category management, Cash tracking,
  account balance recalculation service.
- **Phase 3:** Transactions module — full CRUD, filters/search/pagination, transfers between accounts,
  soft delete, audit logging.
- **Phase 4:** Statement import (CSV/XLSX/PDF), duplicate detection, merchant mapping & auto-categorization.
- **Phase 5:** Dashboard & Analytics endpoints (income/expense/savings, category & merchant breakdowns,
  bank/UPI usage, trends).
- **Phase 6:** Reports (PDF/Excel/CSV export), Receipt management, Notifications, Settings, Audit logs.

Each phase is delivered complete and working before moving to the next, per your instructions.

## API Reference (Phase 1)

Base URL: `http://localhost:5100/api/v1`

| Method | Endpoint                | Access        | Description                              |
| ------ | ------------------------ | ------------- | ----------------------------------------- |
| POST   | `/auth/register`         | Public        | Register (first user in the system → admin) |
| POST   | `/auth/login`             | Public        | Login, returns access + refresh token     |
| POST   | `/auth/refresh`           | Public        | Get new access token from refresh token   |
| GET    | `/auth/me`                | Authenticated | Current user profile                      |
| PATCH  | `/auth/update-password`  | Authenticated | Change password                           |
| POST   | `/auth/logout`            | Authenticated | Clear refresh token                       |

All protected routes require header: `Authorization: Bearer <accessToken>`

## Quick Test
```
curl -X POST http://localhost:5100/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@test.com","password":"Admin@1234"}'

curl -X POST http://localhost:5100/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin@1234"}'

curl http://localhost:5100/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

## License
MIT
