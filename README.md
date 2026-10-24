# MiniLedger

A small app for keeping track of money you've lent to friends.

You know how it goes: you cover someone's dinner, spot a colleague some cash for a cab, and three weeks later neither of you remembers the amount. MiniLedger keeps a simple record of who owes you what and when they said they'd pay it back. It tells you when something is overdue and even writes a polite reminder for you.

It's a full-stack project: a **React Native (Expo)** app talking to a **Node.js + Express + PostgreSQL** API, all in TypeScript.

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/01-login.png" width="230" alt="Login screen"/><br/><sub>Sign in with your phone</sub></td>
    <td align="center"><img src="docs/screenshots/02-otp.png" width="230" alt="OTP screen"/><br/><sub>One-time code, no passwords</sub></td>
    <td align="center"><img src="docs/screenshots/03-dashboard.png" width="230" alt="Dashboard"/><br/><sub>Everything owed, at a glance</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/04-loan-details.png" width="230" alt="Loan details"/><br/><sub>Timeline, receipt and actions</sub></td>
    <td align="center"><img src="docs/screenshots/05-add-loan.png" width="230" alt="Add a loan"/><br/><sub>Logging a loan takes seconds</sub></td>
    <td align="center"><img src="docs/screenshots/06-repaid-filter.png" width="230" alt="Repaid loans"/><br/><sub>Filter by status</sub></td>
  </tr>
</table>

🎬 **[Watch the 2½-minute demo video](docs/demo/MiniLedger-demo.mp4)**: login, adding a loan with a receipt, chasing an overdue loan, marking it repaid, and the backend's API calls as they happen.

---

## What it does

- **Phone + OTP login.** No passwords to remember. In development the "SMS" is printed in the backend terminal.
- **A dashboard that answers the real question:** how much is still out there? You see the outstanding amount, how much has been recovered so far, and what's overdue.
- **Overdue loans stand out.** They're sorted to the top, marked in red, and show exactly how many days late they are.
- **Quick entry.** Tap an amount chip, type a name, pick "2 weeks" and you're done. Past dates are allowed, because people usually log loans after the fact.
- **Receipts.** Attach a photo (camera or gallery) when you add a loan, or later from the loan's detail page.
- **Friendly reminders.** One tap opens your share sheet (WhatsApp, SMS, …) with a polite, pre-written message. The wording changes depending on whether the loan is coming up or already late. Nothing is ever sent without you.
- **Loan details.** Each loan has a timeline (added → due → repaid), its receipt, and actions to mark it repaid or delete it.
- **Search and filters** by name and status (all, pending, overdue, repaid), with live counts.

---

## Tech stack

| | |
|---|---|
| **Mobile** | React Native with Expo, TypeScript, React Navigation, React Context, `expo-secure-store`, `expo-image-picker`, axios |
| **Backend** | Node.js, Express, TypeScript (strict), PostgreSQL via `pg` with plain SQL (no ORM), Zod, JWT, Multer, Helmet, express-rate-limit, Pino |
| **Testing** | Jest + Supertest integration tests against a real test database |
| **Infra** | `docker-compose.yml` for PostgreSQL 16 |

I deliberately skipped an ORM. Every query is plain SQL, so it's easy to see exactly what hits the database and why.

---

## Running it locally

You'll need **Node.js 20+**, and either **Docker** or a local **PostgreSQL 16+** on port 5432.

### 1. Start the database

```bash
docker compose up -d
```

This starts Postgres and creates two databases: `miniledger` for the app and `miniledger_test` for the tests.

> Using your own Postgres instead? Create a `miniledger` user (password `miniledger`) and both databases yourself. `init-db.sh` shows what's needed.

### 2. Start the backend

```bash
cd backend
cp .env.example .env      # then set a real JWT_SECRET
npm install
npm run migrate
npm run dev
```

The API runs on `http://localhost:3000`. `curl http://localhost:3000/health` should return `{"status":"ok",...}`.

### 3. Start the app

```bash
cd mobile
npm install
npm run start
```

Scan the QR code with **Expo Go**. If you're on a real phone, first point `mobile/src/config.ts` at your computer's LAN IP (for example `http://192.168.1.15:3000`). The Android emulator (`10.0.2.2`) and the iOS simulator (`localhost`) work out of the box.

**No phone handy?** Run `npm run web` and open `http://localhost:8081`. The app works in the browser too. On a desktop it's shown inside a phone-sized frame.

### 4. Log in

Enter any 10-digit Indian mobile number. Then look at the terminal running the backend for a line like this:

```text
[MOCK OTP] +919876543210 -> 491777 (valid for 5 minutes)
```

Type that code into the app. The code is never included in the API response; it only appears in the server log.

---

## Configuration

Everything lives in `backend/.env` (copy it from `.env.example`). The real `.env` is git-ignored.

| Variable | Default | What it's for |
|---|---|---|
| `PORT` | `3000` | API port |
| `DATABASE_URL` | `postgresql://miniledger:miniledger@localhost:5432/miniledger` | Main database. Tests automatically use `miniledger_test`. |
| `JWT_SECRET` | `change-me-to-a-random-string` | Signs login tokens. Use a long random value (16+ characters). |
| `OTP_TTL_SECONDS` | `300` | How long a login code stays valid |
| `UPLOAD_DIR` | `uploads` | Where receipt images are stored |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | Used to build receipt image URLs |

A quick way to generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Tests

```bash
cd backend
npm test
```

There are 26 integration tests. They make real HTTP requests to the real database, with nothing mocked. They cover:

- **Auth:** invalid numbers, the 30-second resend cooldown, expired codes, codes that can't be reused, lockout after 5 wrong attempts, and token issuing.
- **Loans:** validation (empty names, zero or negative amounts, bad dates), past due dates, mark-as-repaid (including a second attempt returning `409`), and delete.
- **Isolation:** one user can never see, repay or delete another user's loans. They get a `404`, so they can't even tell the loan exists.
- **Summary:** totals checked against a known set of repaid, pending and overdue loans.
- **Receipts:** valid uploads, non-images rejected (`400`), and files over 5 MB rejected (`413`).

---

## API

All endpoints except the auth ones need an `Authorization: Bearer <token>` header.

| Method | Endpoint | What it does |
|---|---|---|
| `POST` | `/api/auth/request-otp` | Sends a login code to `{ phone }` |
| `POST` | `/api/auth/verify-otp` | Swaps `{ phone, otp }` for a JWT |
| `GET` | `/api/summary` | Totals: lent, repaid, pending, overdue, plus counts |
| `GET` | `/api/loans?status=all\|pending\|overdue\|repaid` | Lists loans: overdue first, then by due date |
| `POST` | `/api/loans` | Creates a loan from `{ friendName, amount, dueDate }` |
| `GET` | `/api/loans/:id` | Returns one loan |
| `PATCH` | `/api/loans/:id/repay` | Marks it repaid |
| `POST` | `/api/loans/:id/receipt` | Uploads a receipt (`multipart/form-data`, field `receipt`) |
| `DELETE` | `/api/loans/:id` | Deletes a loan logged by mistake |

A typical loan looks like this:

```json
{
  "id": "c1f6b8a2-2b6d-4950-84c4-f2a8932fa5a2",
  "friendName": "Rohan Sharma",
  "amount": 2500,
  "dueDate": "2026-11-20",
  "status": "pending",
  "isOverdue": false,
  "daysOverdue": 0,
  "repaidAt": null,
  "receiptUrl": null,
  "createdAt": "2026-10-23T17:00:00.000Z"
}
```

Errors always have the same shape, so the app can show them without special-casing:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Friend name is required", "details": [] } }
```

<details>
<summary>Example requests with curl</summary>

```bash
# 1. Ask for a code (then read it from the backend terminal)
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" -d '{"phone": "9876543210"}'

# 2. Log in
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" -d '{"phone": "9876543210", "otp": "123456"}'

# 3. Add a loan
curl -X POST http://localhost:3000/api/loans \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"friendName": "Rohan Sharma", "amount": 2500, "dueDate": "2026-11-20"}'

# 4. Mark it repaid
curl -X PATCH http://localhost:3000/api/loans/<LOAN_ID>/repay -H "Authorization: Bearer <TOKEN>"

# 5. Attach a receipt
curl -X POST http://localhost:3000/api/loans/<LOAN_ID>/receipt \
  -H "Authorization: Bearer <TOKEN>" -F "receipt=@/path/to/receipt.jpg"
```

</details>

---

## Decisions worth explaining

**"Overdue" isn't stored, it's calculated.** Whether a loan is overdue depends on today's date, so storing it would mean running a nightly job to update rows, and the data would always be slightly stale. Instead, every query works it out on the spot (`status = 'pending' AND due_date < today`). It's always correct and there's nothing to keep in sync.

**Dates follow Indian time.** "Today" is calculated in `Asia/Kolkata`, so a loan becomes overdue at midnight IST, not at midnight wherever the server happens to be.

**Money never touches floating point.** Amounts are stored as `NUMERIC(12,2)` and summed inside Postgres. JavaScript's `0.1 + 0.2 = 0.30000000000000004` has no business near a ledger.

**Repaying is a single atomic query.** `UPDATE ... WHERE id = $1 AND user_id = $2 AND status = 'pending' RETURNING *`. If two taps arrive at the same moment, only one can succeed. If nothing was updated, a follow-up check returns `409` (already repaid) or `404` (not yours or doesn't exist).

**Login codes are hashed.** OTPs are stored as SHA-256 hashes and compared with `crypto.timingSafeEqual`, so a database leak doesn't hand out working codes and response timing gives nothing away.

**Past due dates are allowed.** People often log a loan days after it happened, sometimes when it's already late. Blocking past dates would make the app less useful.

**Reminders are drafted, never sent.** The app prepares the message and hands it to the system share sheet. You choose who gets it and whether it goes at all.

---

## Project structure

```
miniledger/
├── backend/
│   ├── src/
│   │   ├── config/          # env validation (Zod), Postgres pool
│   │   ├── db/migrations/   # plain SQL schema files
│   │   ├── middleware/      # auth, validation, errors, uploads, rate limiting
│   │   ├── modules/
│   │   │   ├── auth/        # OTP request/verify, JWT
│   │   │   ├── loans/       # create, list, repay, receipt, delete
│   │   │   └── summary/     # totals in a single SQL query
│   │   └── utils/
│   └── tests/               # integration tests
├── mobile/
│   ├── App.tsx              # navigation + providers
│   └── src/
│       ├── api/             # axios client and endpoint helpers
│       ├── components/      # SummaryCard, LoanItem, FilterTabs, Avatar, …
│       ├── context/         # auth session, toasts
│       ├── screens/         # Login, LoansList, AddLoan, LoanDetail
│       ├── utils/           # dates, currency, reminders, image picking
│       └── theme.ts         # colors, spacing, shadows
└── docs/screenshots/
```

---

## What I'd do next

This is a project, not a product, so a few things are intentionally simple:

- **Real SMS.** Replace the console "SMS" with a provider like Twilio or MSG91.
- **Better sessions.** Short-lived access tokens with refresh tokens, instead of one 7-day token.
- **Cloud storage for receipts.** Use S3 with signed upload URLs instead of the server's disk.
- **Partial repayments.** Let a friend pay back ₹1,000 of ₹2,500.
- **Pagination.** Fine for a personal ledger today, but needed if the list grows into the thousands.
- **Push notifications** on the due date, so you don't have to open the app to notice.
