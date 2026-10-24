# MiniLedger 📒

A full-stack mobile application to track money lent to friends and colleagues. Built with **Node.js, Express, TypeScript, PostgreSQL (raw SQL), and React Native (Expo)**.

---

## 📑 Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Step-by-Step Setup](#step-by-step-setup)
- [Where to Find the Mock OTP](#where-to-find-the-mock-otp)
- [Environment Variables](#environment-variables)
- [Running Automated Tests](#running-automated-tests)
- [API Reference (with cURL examples)](#api-reference)
- [Design Decisions & Assumptions](#design-decisions--assumptions)
- [Known Limitations & Future Improvements](#known-limitations--future-improvements)

---

## 🏛 Overview & Architecture

MiniLedger follows a clean, layered architecture without heavy ORM magic so that every line of SQL and business logic is clear and interview-ready:

```
miniledger/
├── backend/
│   ├── src/
│   │   ├── config/          # Zod env validation, pg connection pool
│   │   ├── db/migrations/   # Raw SQL schema migrations (001, 002, 003)
│   │   ├── middleware/      # JWT auth, Zod validation, error handler, Multer, rate limit
│   │   ├── modules/
│   │   │   ├── auth/        # OTP generation/verification & JWT issuing
│   │   │   ├── loans/       # Loan CRUD, atomic repay, computed overdue logic
│   │   │   └── summary/     # Single-query financial aggregation (SUM FILTER)
│   │   ├── utils/           # Custom AppError, asyncHandler, Indian phone normalizer
│   │   ├── app.ts           # Express app definition (exported for supertest)
│   │   └── server.ts        # Server listener and graceful shutdown
│   └── tests/               # Integration tests (auth, loans, summary, receipts)
└── mobile/
    ├── src/
    │   ├── api/             # Axios client, auth/loans/summary endpoints
    │   ├── context/         # AuthContext with expo-secure-store persistence
    │   ├── components/      # SummaryCard, LoanItem, PrimaryButton, EmptyState, ErrorBanner
    │   ├── screens/         # LoginScreen, LoansListScreen, AddLoanScreen
    │   ├── utils/           # Indian Rupee formatCurrency (₹), date helpers
    │   └── config.ts        # Configurable API base URL (10.0.2.2 vs localhost vs LAN IP)
    └── App.tsx              # React Navigation native stack
```

---

## 🛠 Tech Stack

### Backend
- **Runtime & Language**: Node.js 20+, TypeScript (strict mode, zero `any`)
- **HTTP Server**: Express.js
- **Database**: PostgreSQL 16 via native `pg` driver (no ORM, pure SQL migrations)
- **Validation**: `zod`
- **Authentication**: JWT (`jsonwebtoken`) with SHA-256 OTP hashing & constant-time comparison
- **File Uploads**: `multer` with random hex filenames, MIME whitelist, and 5 MB limit
- **Security & Utilities**: `helmet`, `cors`, `express-rate-limit`, `pino`
- **Testing**: Jest, Supertest, ts-jest (100% integration tests against test database)

### Mobile App
- **Framework**: React Native with Expo (TypeScript template)
- **Navigation**: React Navigation (Native Stack)
- **State Management**: React Context + Hooks (`AuthContext`)
- **Storage**: `expo-secure-store` (encrypted on-device token storage)
- **Networking**: `axios` with request/response interceptors for Bearer auth & automatic 401 handling
- **Native Modules**: `expo-image-picker` (camera & gallery) and `@react-native-community/datetimepicker`

### Infrastructure
- `docker-compose.yml` for PostgreSQL 16 with persistent volume and automatic test DB provisioning.

---

## 📋 Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Docker & Docker Compose**: (or local PostgreSQL 16+ on port 5432)
- **Expo Go App**: on your physical iOS/Android phone (or Android Studio emulator / iOS Simulator)

---

## 🚀 Step-by-Step Setup

### 1. Start the Database with Docker

```bash
cd miniledger
docker compose up -d
```
*This starts PostgreSQL 16 and automatically creates both `miniledger` and `miniledger_test` databases.*

### 2. Configure & Run Backend

```bash
cd backend

# Copy environment variables
cp .env.example .env

# Install backend dependencies
npm install

# Run database migrations
npm run migrate

# Start backend in development mode (with hot reloading via tsx)
npm run dev
```

The API will start on `http://localhost:3000`. You can test it by visiting:
```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"2026-10-23T..."}
```

### 3. Configure & Run Mobile App

Open `mobile/src/config.ts` and set your API URL based on how you are running the app:
- **Android Emulator**: `http://10.0.2.2:3000` (default)
- **iOS Simulator / Web**: `http://localhost:3000`
- **Physical Device (Expo Go)**: `http://<YOUR_COMPUTER_LOCAL_IP>:3000` (e.g., `http://192.168.1.15:3000`)

Then run:

```bash
cd ../mobile
npm install
npm run start
```
Scan the QR code displayed in your terminal using the **Expo Go** app on Android or the iOS Camera app.

### 4. (Optional) Run the App in a Browser

No phone or emulator handy? The app also runs on the web, shown inside a phone-sized frame:

```bash
cd mobile
npm run web
```

Open `http://localhost:8081`. On web, the session is kept in `localStorage` (instead of SecureStore) and the date picker and receipt upload use the browser's native inputs.

---

## 🔑 Where to Find the Mock OTP

MiniLedger uses a simulated SMS service for development. When you request an OTP from the app or cURL:

1. Look at the **terminal window running `npm run dev` in `backend`**.
2. You will see a clearly formatted banner:
```text
==================================================
[MOCK OTP] +919876543210 -> 491777 (valid for 5 minutes)
==================================================
```
3. Enter this 6-digit code on the mobile app's verification screen.
4. The OTP is **never** leaked in the HTTP response.

---

## ⚙️ Environment Variables

Located in `backend/.env`:

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `3000` | Port for the Express HTTP server |
| `DATABASE_URL` | `postgresql://miniledger:miniledger@localhost:5432/miniledger` | Main PostgreSQL connection string |
| `JWT_SECRET` | `change-me-to-a-random-string` | Secret key used to sign and verify JWT tokens (min 16 chars) |
| `OTP_TTL_SECONDS` | `300` | Lifetime of an OTP code before expiry (5 minutes) |
| `UPLOAD_DIR` | `uploads` | Directory for stored receipt images |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | Base URL used to construct absolute `receiptUrl` links |

---

## 🧪 Running Automated Tests

Tests run against the isolated `miniledger_test` database and cover auth, validation, rate limiting, atomic repay, isolation, and file upload edge cases:

```bash
cd backend
npm test
```

### What the test suite covers:
- **Auth**: Request OTP, invalid phone rejection, 30s per-phone cooldown, SHA-256 hash comparison, expired OTP rejection, anti-replay, 5-attempt lockout, user upsert, and JWT token issuance.
- **Loans**: Creation validation, positive amount check, ISO date validation, past-date allowance, atomic repay, 409 already-repaid conflict, 404 non-existent loan, delete (204, cross-user 404, malformed id 400).
- **Summary**: Exact mathematical validation against seeded known loans (repaid, pending, overdue) using `SUM FILTER` and `COALESCE`.
- **Authorization Isolation**: User A is strictly forbidden from viewing, listing, or repaying User B's loans.
- **Receipts**: Valid image uploads, non-image rejection (400), and >5MB file rejection (413).

---

## 📡 API Reference

All requests and responses use JSON (except `/receipt` upload). Errors strictly follow:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Friend name is required",
    "details": []
  }
}
```

### 1. Request OTP
- **Endpoint**: `POST /api/auth/request-otp`
- **cURL**:
```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210"}'
```
- **Response** `(200 OK)`:
```json
{
  "message": "OTP sent successfully (check server console)",
  "expiresInSeconds": 300
}
```

### 2. Verify OTP & Log In
- **Endpoint**: `POST /api/auth/verify-otp`
- **cURL**:
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210", "otp": "123456"}'
```
- **Response** `(200 OK)`:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "e8d975a2-9b2f-48d6-953e-5f994fbc6811",
    "phone": "+919876543210"
  }
}
```

### 3. Get Financial Summary
- **Endpoint**: `GET /api/summary`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **cURL**:
```bash
curl -X GET http://localhost:3000/api/summary \
  -H "Authorization: Bearer <TOKEN>"
```
- **Response** `(200 OK)`:
```json
{
  "totalLent": 7000,
  "totalRepaid": 2000,
  "totalPending": 5000,
  "overdueAmount": 1500,
  "counts": {
    "total": 3,
    "repaid": 1,
    "pending": 2,
    "overdue": 1
  }
}
```

### 4. Create Loan
- **Endpoint**: `POST /api/loans`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **cURL**:
```bash
curl -X POST http://localhost:3000/api/loans \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "friendName": "Rohan Sharma",
    "amount": 2500,
    "dueDate": "2026-11-20"
  }'
```
- **Response** `(201 Created)`:
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

### 5. List Loans
- **Endpoint**: `GET /api/loans?status=all|pending|overdue|repaid`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **cURL**:
```bash
curl -X GET "http://localhost:3000/api/loans?status=all" \
  -H "Authorization: Bearer <TOKEN>"
```

### 6. Atomic Mark as Repaid
- **Endpoint**: `PATCH /api/loans/:id/repay`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **cURL**:
```bash
curl -X PATCH http://localhost:3000/api/loans/c1f6b8a2-2b6d-4950-84c4-f2a8932fa5a2/repay \
  -H "Authorization: Bearer <TOKEN>"
```

### 7. Upload Receipt Image
- **Endpoint**: `POST /api/loans/:id/receipt`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Body**: `multipart/form-data` with field name `receipt`
- **cURL**:
```bash
curl -X POST http://localhost:3000/api/loans/c1f6b8a2-2b6d-4950-84c4-f2a8932fa5a2/receipt \
  -H "Authorization: Bearer <TOKEN>" \
  -F "receipt=@/path/to/receipt.jpg"
```

### 8. Delete Loan
- **Endpoint**: `DELETE /api/loans/:id`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response**: `204 No Content`. Scoped to the owner in a single `DELETE ... WHERE id = $1 AND user_id = $2`, so another user's loan returns `404`. The stored receipt file is removed best-effort.
- **cURL**:
```bash
curl -X DELETE http://localhost:3000/api/loans/c1f6b8a2-2b6d-4950-84c4-f2a8932fa5a2   -H "Authorization: Bearer <TOKEN>"
```

---

## 📱 Mobile App Features

- **Dashboard**: balance card with outstanding amount, recovery progress bar, and lent / repaid / overdue totals; name search; filter tabs with live counts; skeleton loading and animated cards.
- **Loan details**: tap any loan for a timeline (added → due → repaid), receipt preview or attach-later, mark repaid, and delete.
- **Friendly reminders**: one tap opens the share sheet (WhatsApp, SMS, …) with a polite, pre-written message. The tone adapts to whether the loan is upcoming or overdue. Nothing is sent automatically.
- **Fast entry**: quick-pick amounts and due dates, live "Save ₹1,800 to Rahul" button.
- **Feedback**: toast confirmations for save, repay, delete and receipt upload.

---

## 💡 Design Decisions & Assumptions

1. **Why "Overdue" is computed dynamically and NOT stored in a database column**:
   - An overdue status depends on the passage of time: a loan that is not overdue at 11:59 PM becomes overdue at 12:00 AM.
   - If stored as a column, you would need a daily cron job or trigger to update millions of rows, introducing state synchronization bugs.
   - By computing it on the fly in SQL (`status = 'pending' AND due_date < (now() AT TIME ZONE 'Asia/Kolkata')::date`), it is **guaranteed to always be 100% accurate** with zero cron jobs.
2. **Indian Standard Time (Asia/Kolkata)**:
   - Due dates in Indian accounting expire at midnight IST. We enforce `(now() AT TIME ZONE 'Asia/Kolkata')::date` in PostgreSQL queries so overdue transitions happen precisely at Indian midnight regardless of the server's local hardware time or UTC offset.
3. **Money Handling**:
   - Stored in PostgreSQL as `NUMERIC(12, 2)` (arbitrary precision decimal).
   - Aggregations (`SUM`, `FILTER`) happen strictly in PostgreSQL.
   - Never use JavaScript floating-point arithmetic for financial sums (avoids `0.1 + 0.2 = 0.30000000000000004`).
4. **Single Atomic Query for Repay**:
   - Instead of a `SELECT` followed by an `UPDATE` (which can cause race conditions if two requests hit at the same millisecond), we use a single query:
     `UPDATE loans SET status='repaid', repaid_at=now() WHERE id=$1 AND user_id=$2 AND status='pending' RETURNING *`
   - If no row is returned, we check whether it was already repaid (409) or doesn't exist (404).
5. **SHA-256 for OTPs with Constant-Time Comparison**:
   - Storing plain-text OTPs is dangerous if database logs or snapshots leak. We hash the 6-digit code with SHA-256.
   - We compare using `crypto.timingSafeEqual` to eliminate timing attack vectors.
6. **Past Due Dates Allowed**:
   - Users frequently lend money in cash and log it into their tracker days or weeks later. Disallowing past dates would prevent logging existing overdue debts.

---

## 🔮 Known Limitations & Future Improvements

If this were going to enterprise production:
1. **Real SMS Gateway**: Replace the console mock with Twilio, AWS SNS, or Gupshup with webhook verification.
2. **Refresh Tokens**: Implement short-lived access tokens (15 minutes) and rotating HTTP-only refresh tokens.
3. **Cloud Storage (S3 / Cloud Storage)**: Store uploaded receipts in an encrypted S3 bucket using pre-signed upload URLs instead of the local filesystem.
4. **Pagination**: Implement cursor-based pagination (`limit`, `cursor`) on `/api/loans` for users with thousands of entries.
5. **Partial Repayments**: Support installment repayments and partial settlements instead of binary pending/repaid.
6. **Multi-currency Support**: Allow tracking loans in USD/EUR with exchange rate snapshots.
