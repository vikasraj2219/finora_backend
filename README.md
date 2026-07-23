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
- **Phase 4 (this delivery): Imports & Merchants** — full Merchant CRUD; a statement-import
  pipeline (`/imports/preview` → `/imports/confirm`) that parses CSV, XLSX, and PDF bank
  statements, normalizes varying column names across banks, flags likely duplicates
  (same account + amount + day), and suggests a merchant + category for each row via
  substring matching against known merchants/aliases — nothing is written to the database
  until the user reviews and confirms.
- **Phase 5 (this delivery): Dashboard & Analytics** — six `/dashboard/*` aggregation endpoints
  covering every stat and chart from the brief: an all-in-one summary (totals, monthly figures,
  today's spending, expense ratio, most-used bank/UPI, top category, largest expense/income),
  a monthly income/expense/cash-flow trend series, category breakdown, payment-method
  distribution, bank/UPI usage, and a 12-month yearly summary.
- **Phase 6 (this delivery, final): Reports, Receipts, Notifications, Settings** — transaction
  export as CSV/XLSX/PDF plus a one-page financial-summary PDF (`/reports/*`); receipt
  upload/removal on any transaction, served back from `/uploads`; a `Notification` model with
  automatic alerts (large expense recorded, bank account gone negative) and full read/unread
  management (`/notifications/*`); and a profile-update endpoint (`PATCH /auth/profile` for
  name/currency) alongside the existing password-change route.

All six phases from the original brief are now delivered.

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

### Merchants (Phase 4)
| Method | Endpoint        | Description                                     |
| ------ | ---------------- | -------------------------------------------------- |
| POST   | `/merchants`     | Create (optionally with a `defaultCategory`)      |
| GET    | `/merchants`     | List (`search` by name)                           |
| GET    | `/merchants/:id` | Get one                                           |
| PATCH  | `/merchants/:id` | Update (name, aliases, defaultCategory)           |
| DELETE | `/merchants/:id` | Soft delete                                       |

### Statement Import (Phase 4)
| Method | Endpoint          | Description                                                        |
| ------ | ------------------ | ---------------------------------------------------------------------- |
| POST   | `/imports/preview` | Multipart: `file` + `bankAccount`. Parses the statement and returns suggested category/merchant + duplicate flags — **writes nothing to the database** |
| POST   | `/imports/confirm` | JSON: `{ bankAccount, importBatchId, rows: [...] }`. Creates a real Transaction for every row with `include !== false` and a `category` set |

Supported formats: CSV and XLSX parse column names flexibly (Date/Txn Date, Description/Narration/Particulars,
Debit/Withdrawal, Credit/Deposit, or a single Amount + Type column all work). PDF parsing is best-effort —
it works for simple single-line-per-transaction statements; complex multi-column PDF layouts may not parse
cleanly, in which case exporting as CSV/XLSX from the bank's portal is recommended.

### Dashboard & Analytics (Phase 5)
| Method | Endpoint                              | Description                                                 |
| ------ | -------------------------------------- | --------------------------------------------------------------- |
| GET    | `/dashboard/summary`                  | Totals, monthly figures, today's spending, expense ratio, most-used bank/UPI, top category, largest expense/income |
| GET    | `/dashboard/trends?months=6`          | Monthly income/expense/net-flow series (1–24 months)         |
| GET    | `/dashboard/category-breakdown?type=expense` | Category-wise share of spend or income (`type=income\|expense`, optional `dateFrom`/`dateTo`) |
| GET    | `/dashboard/payment-method-distribution` | Total + count grouped by payment method                    |
| GET    | `/dashboard/account-usage`            | Transaction count + volume per bank account and per UPI app  |
| GET    | `/dashboard/yearly-summary?year=2026` | 12-month income/expense/saving breakdown for a calendar year |

### Reports (Phase 6)
| Method | Endpoint                                       | Description                                                    |
| ------ | ------------------------------------------------ | ------------------------------------------------------------------ |
| GET    | `/reports/transactions/export?format=csv\|xlsx\|pdf` | Downloads matching transactions (same filters as the list endpoint: `type`, `category`, `bankAccount`, `dateFrom`, `dateTo`) |
| GET    | `/reports/summary/export`                        | Downloads a one-page financial-summary PDF                     |

### Receipts (Phase 6)
| Method | Endpoint                        | Description                                       |
| ------ | ---------------------------------- | ----------------------------------------------------- |
| POST   | `/transactions/:id/receipt`       | Multipart `receipt` file — attaches/replaces the receipt |
| DELETE | `/transactions/:id/receipt`       | Removes the attached receipt                          |

Uploaded receipts are served back at `http://localhost:5100/uploads/<filename>` (the value returned in
`receiptUrl`).

### Notifications (Phase 6)
| Method | Endpoint                     | Description                                              |
| ------ | ------------------------------ | -------------------------------------------------------------- |
| GET    | `/notifications`               | List (paginated, `unreadOnly=true` filter), includes `unreadCount` |
| PATCH  | `/notifications/:id/read`      | Mark one notification as read                              |
| PATCH  | `/notifications/read-all`      | Mark all as read                                            |
| DELETE | `/notifications/:id`           | Delete a notification                                       |

Notifications are created automatically: a "Large expense recorded" alert (expenses ≥ 10,000) and
a "Bank account overdrawn" alert (balance goes negative) — both fire from `transaction.service.js`
whenever a transaction is created or edited.

### Profile (Phase 6)
| Method | Endpoint         | Description                              |
| ------ | ----------------- | -------------------------------------------- |
| PATCH  | `/auth/profile`   | Update `name` and/or `currency`             |

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
