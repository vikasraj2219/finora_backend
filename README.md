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

- **Phase 1: Foundation** — project scaffold, DB connection, global error handling,
  ApiError/ApiResponse/catchAsync/pagination utilities, JWT auth (register/login/refresh/me/change-password,
  first user becomes admin), role-based auth middleware, and base Mongoose models for the core domain
  (BankAccount, UpiAccount, Category, Merchant, Transaction) so later phases can build directly on top.
- **Phase 2: Accounts & Categories** — Bank account CRUD (create/list/update/soft-delete,
  toggle active, manual balance adjustment, recalculate-from-transactions), UPI account CRUD (with
  bank-linking + ownership validation), Category CRUD with default categories auto-seeded on registration,
  a per-user Cash ledger (view/adjust/recalculate), and the shared `balance.service.js` that both bank and
  cash balances build on.
- **Phase 3 (this delivery): Transactions** — full Transaction CRUD (income/expense/transfer),
  filtering (type, category, account, payment method, date range, amount range, note search),
  pagination + sorting, transfers between any combination of bank accounts and cash, automatic
  bank/cash balance updates on create/update/delete (reverse-then-reapply on edits so balances
  never drift), merchant usage stats on expense transactions, and an immutable `AuditLog` recording
  every create/update/delete with a before/after diff.
- **Phase 4 (next):** Statement import (CSV/XLSX/PDF), duplicate detection, merchant mapping & auto-categorization.
- **Phase 5:** Dashboard & Analytics endpoints (income/expense/savings, category & merchant breakdowns,
  bank/UPI usage, trends).
- **Phase 6:** Reports (PDF/Excel/CSV export), Receipt management, Notifications, Settings, Audit logs.

Each phase is delivered complete and working before moving to the next, per your instructions.

## API Reference

Base URL: `http://localhost:5100/api/v1`. All routes below (except register/login/refresh) require
header: `Authorization: Bearer <accessToken>`

### Auth (Phase 1)
| Method | Endpoint                | Description                                  |
| ------ | ------------------------ | --------------------------------------------- |
| POST   | `/auth/register`         | Register (first user → admin, seeds default categories + cash ledger) |
| POST   | `/auth/login`             | Login, returns access + refresh token         |
| POST   | `/auth/refresh`           | Get new access token from refresh token       |
| GET    | `/auth/me`                | Current user profile                          |
| PATCH  | `/auth/update-password`  | Change password                               |
| POST   | `/auth/logout`            | Clear refresh token                           |

### Bank Accounts (Phase 2)
| Method | Endpoint                              | Description                          |
| ------ | -------------------------------------- | ------------------------------------- |
| POST   | `/bank-accounts`                       | Create                                |
| GET    | `/bank-accounts`                       | List (paginated, `search`, `isActive`) |
| GET    | `/bank-accounts/:id`                   | Get one                               |
| PATCH  | `/bank-accounts/:id`                   | Update (name/type/nickname — not balance) |
| PATCH  | `/bank-accounts/:id/adjust-balance`    | Manually adjust balance (`{ amount, note }`) |
| POST   | `/bank-accounts/:id/recalculate`       | Recompute balance from transactions   |
| PATCH  | `/bank-accounts/:id/toggle-active`     | Toggle active/inactive                |
| DELETE | `/bank-accounts/:id`                   | Soft delete (blocked if UPI accounts are linked) |

### UPI Accounts (Phase 2)
| Method | Endpoint                        | Description                              |
| ------ | --------------------------------- | ----------------------------------------- |
| POST   | `/upi-accounts`                   | Create (optionally linked to a bank account) |
| GET    | `/upi-accounts`                   | List (paginated, `provider`, `isActive`)  |
| GET    | `/upi-accounts/:id`                | Get one                                   |
| PATCH  | `/upi-accounts/:id`                | Update                                    |
| PATCH  | `/upi-accounts/:id/toggle-active`  | Toggle active/inactive                    |
| DELETE | `/upi-accounts/:id`                | Soft delete                               |

### Categories (Phase 2)
| Method | Endpoint          | Description                          |
| ------ | ------------------ | -------------------------------------- |
| POST   | `/categories`      | Create                                 |
| GET    | `/categories`      | List (`type=income\|expense`)          |
| GET    | `/categories/:id`  | Get one                                |
| PATCH  | `/categories/:id`  | Update                                 |
| DELETE | `/categories/:id`  | Soft delete                            |

### Cash (Phase 2)
| Method | Endpoint          | Description                                   |
| ------ | ------------------ | ----------------------------------------------- |
| GET    | `/cash`             | Get the user's cash-in-hand balance             |
| PATCH  | `/cash/adjust`      | Adjust balance (`{ amount, note }`, negative to deduct) |
| POST   | `/cash/recalculate` | Recompute from cash transactions                |

### Transactions (Phase 3)
| Method | Endpoint            | Description                                                |
| ------ | -------------------- | ------------------------------------------------------------ |
| POST   | `/transactions`      | Create (income/expense/transfer — see body shapes below)   |
| GET    | `/transactions`      | List — filters: `type`, `category`, `bankAccount`, `upiAccount`, `paymentMethod`, `dateFrom`, `dateTo`, `minAmount`, `maxAmount`, `search`; paginated, sortable via `sortBy`/`sortDir` |
| GET    | `/transactions/:id`  | Get one                                                     |
| PATCH  | `/transactions/:id`  | Update (reverses old balance effect, applies the new one)   |
| DELETE | `/transactions/:id`  | Soft delete (reverses its balance effect)                   |

Income/expense body: `{ type, amount, date, category, paymentMethod, bankAccount?, upiAccount?, note? }`
Transfer body: `{ type: "transfer", amount, date, transferFrom: { type: "bank"|"cash", bankAccount? }, transferTo: {...} }`

### Audit Logs (Phase 3, read-only)
| Method | Endpoint       | Description                                          |
| ------ | --------------- | ------------------------------------------------------- |
| GET    | `/audit-logs`   | List the user's own audit trail (paginated, `entityType` filter) |

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

curl -X POST http://localhost:5100/api/v1/bank-accounts \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"bankName":"HDFC Bank","accountType":"savings","openingBalance":15000}'

curl http://localhost:5100/api/v1/categories?type=expense \
  -H "Authorization: Bearer <accessToken>"
```

## License
MIT
