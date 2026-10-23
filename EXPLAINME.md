# MiniLedger Interview Prep & Code Walkthrough (EXPLAINME.md) 🎓

This document is your secret weapon for explaining MiniLedger line-by-line during technical interviews. It covers the architecture, every source file's purpose, detailed end-to-end request flows, design rationale, and 18 high-probability interview questions with concise answers.

---

## 🏗 Architecture Overview

MiniLedger is designed with a **clean separation of concerns**:
- **Backend**: Express + TypeScript in Strict Mode with raw PostgreSQL (via `pg` Pool). No heavy ORM (like Prisma or TypeORM) is used so that you can explain every single SQL query, index, and constraint clearly.
- **Mobile**: React Native with Expo, TypeScript, React Navigation Native Stack, and pure React Context (`AuthContext`) without Redux bloat.
- **Authentication**: Passwordless phone login with short-lived cryptographically secure OTPs (6-digit, 5-minute TTL, SHA-256 hashed in DB). Verified sessions issue standard 7-day JWT tokens stored encrypted via `expo-secure-store`.
- **Data Isolation**: Multi-tenant database design where every loan and summary query strictly filters on `WHERE user_id = $1` extracted from the authenticated JWT.

---

## 📂 File-by-File Walkthrough

### Backend

| File | Purpose & Why It Exists |
|---|---|
| `src/config/env.ts` | Uses **Zod** to validate all environment variables (`DATABASE_URL`, `JWT_SECRET`, etc.) at server boot. Fails fast with clear error messages rather than causing silent runtime crashes later. |
| `src/config/db.ts` | Manages the shared PostgreSQL connection pool (`pg.Pool`). Exposes a typed `query<T>()` helper that enforces parameterized queries to prevent SQL injection. In tests, automatically connects to `miniledger_test`. |
| `src/db/migrations/001_create_users.sql` | Schema for the `users` table with UUID primary key and E.164 phone constraint. |
| `src/db/migrations/002_create_otps.sql` | Schema for the `otps` table. Stores `code_hash` (SHA-256), `expires_at`, `attempts` counter (locks at 5), and `consumed_at`. Includes index on `phone`. |
| `src/db/migrations/003_create_loans.sql` | Schema for `loans`. Uses `NUMERIC(12,2)` for financial precision and a composite index on `(user_id, status, due_date)`. "Overdue" is intentionally omitted from the schema. |
| `src/db/migrate.ts` | Lightweight migration runner that reads and applies numbered `.sql` files in sorted alphabetical order. |
| `src/utils/AppError.ts` | Custom error subclass extending `Error`. Attaches an HTTP `statusCode`, machine-readable `code`, and optional `details` array. |
| `src/utils/asyncHandler.ts` | Higher-order function that wraps async Express route handlers and catches rejected promises, forwarding them to `next(err)`. Eliminates repetitive `try/catch` blocks in controllers. |
| `src/utils/phone.ts` | Normalizes 10-digit Indian numbers and `+91` formats into standard E.164 (`+91XXXXXXXXXX`). |
| `src/utils/money.ts` | Safe boundary conversion helper: converts Postgres `NUMERIC` strings to JavaScript two-decimal floats. (All math stays in PostgreSQL). |
| `src/middleware/auth.ts` | Verifies incoming `Authorization: Bearer <token>` headers, extracts the JWT subject (`userId`), and attaches `req.userId`. |
| `src/middleware/validate.ts` | Reusable middleware factory that validates `req.body` against a Zod schema and returns unified 400 validation error responses. |
| `src/middleware/rateLimit.ts` | Applies IP-based rate limiting to prevent brute-forcing. Bypassed automatically during automated test suites. |
| `src/middleware/upload.ts` | Configures `multer` for receipt uploads with randomized 16-byte hex filenames, JPEG/PNG/WebP MIME checks, and a 5 MB file size limit. |
| `src/middleware/errorHandler.ts` | The single centralized error middleware in Express. Catches `AppError`, `MulterError` (413 Payload Too Large), and unhandled errors, ensuring no stack traces leak in production. |
| `src/modules/auth/*` | Contains Zod schemas, service logic (randomInt OTP generation, SHA-256 hashing, timing-safe compare, user upsert), and controllers for auth. |
| `src/modules/loans/*` | Service and controllers for creating loans, dynamic overdue calculation, multi-tier sorting, atomic repayments, and receipt attachment. |
| `src/modules/summary/*` | Service computing `totalLent`, `totalRepaid`, `totalPending`, `overdueAmount`, and counts in a single SQL query using `SUM(...) FILTER (...)`. |
| `src/app.ts` | Express application instance with security middleware (`helmet`, `cors`), static `/uploads` serving, and route mounting. Exported for tests. |
| `src/server.ts` | Production entry point that binds `app.listen()` and handles graceful shutdown signals (`SIGINT`, `SIGTERM`). |

---

### Mobile (React Native + Expo)

| File | Purpose |
|---|---|
| `src/config.ts` | Configurable API base URL, supporting Android Emulator (`10.0.2.2`), iOS Simulator (`localhost`), and physical devices via local Wi-Fi IP. |
| `src/api/client.ts` | Shared Axios instance with request interceptor for JWT Bearer tokens and response interceptor for automatic 401 logout. |
| `src/context/AuthContext.tsx` | React Context managing `token`, `user`, and `isLoading`. Persists session credentials securely in `expo-secure-store`. |
| `src/components/SummaryCard.tsx` | Pinned dashboard card displaying Total Lent, Total Repaid, Pending, and Overdue (highlighted in red) with INR formatting. |
| `src/components/LoanItem.tsx` | Individual loan card with red border highlight for overdue items, "Overdue by N days" tag, receipt thumbnail, and "Mark Repaid" confirmation dialog. |
| `src/screens/LoginScreen.tsx` | Two-step single screen: Phone number entry -> 6-digit OTP verification with 30s resend timer and dev-mode console hint. |
| `src/screens/LoansListScreen.tsx` | Main screen with SummaryCard header, status filter chips (All/Pending/Overdue/Repaid), pull-to-refresh, empty state, and full-screen receipt preview modal. |
| `src/screens/AddLoanScreen.tsx` | Form for new loans: friend name, amount, native date picker (defaults to +7 days), and optional camera/gallery receipt attachment with preview. |

---

## 🔄 End-to-End Request Flows

### 1. Phone + OTP Login Flow
```
User Enters Phone
       │
       ▼
[Mobile] POST /api/auth/request-otp { phone: "9876543210" }
       │
       ▼
[Backend] 
  1. normalizePhone() -> "+919876543210"
  2. Check if OTP requested < 30s ago -> (throw 429 if too soon)
  3. Invalidate older unconsumed OTPs for this phone
  4. crypto.randomInt(100000, 999999) -> "491777"
  5. SHA-256 hash OTP code -> store in DB with 5-minute expiry
  6. Print to backend console: [MOCK OTP] +919876543210 -> 491777
  7. Return 200 { message, expiresInSeconds: 300 } (OTP never sent in body)
       │
       ▼
User Copies OTP from Console & Submits
       │
       ▼
[Mobile] POST /api/auth/verify-otp { phone: "+919876543210", otp: "491777" }
       │
       ▼
[Backend]
  1. Fetch latest unconsumed, unexpired OTP row for phone
  2. If attempts >= 5 -> throw 400 OTP_LOCKED
  3. Compare SHA-256 hashes using crypto.timingSafeEqual
     - If mismatch -> attempts++ -> throw 400 INVALID_OTP
  4. Mark OTP consumed_at = now()
  5. Upsert user: INSERT INTO users ... ON CONFLICT (phone) DO UPDATE
  6. Sign JWT with payload { sub: user.id }, 7d expiry
  7. Return 200 { token, user: { id, phone } }
       │
       ▼
[Mobile] Save token to SecureStore -> Update AuthContext -> Navigate to LoansListScreen
```

---

### 2. Add Loan + Receipt Flow
```
User fills form (Friend: "Deepak", Amount: 2500, DueDate: "2026-11-20", Receipt: photo.jpg)
       │
       ▼
[Mobile] Client-side Zod-mirrored validation passes
[Mobile] POST /api/loans { friendName, amount, dueDate }
       │
       ▼
[Backend]
  1. authenticate middleware verifies JWT -> sets req.userId
  2. validate middleware validates body schema
  3. INSERT INTO loans (user_id, friend_name, amount, due_date) VALUES ($1, $2, $3, $4)
  4. Return 201 Created with new Loan object (id: "c1f6b8a2...")
       │
       ▼
[Mobile] Receives loan ID -> uploads attached photo
[Mobile] POST /api/loans/c1f6b8a2.../receipt (multipart/form-data)
       │
       ▼
[Backend]
  1. Verify loan exists and belongs to req.userId
  2. Multer saves file with random hex name (e.g. 7f8a9b...jpg) to backend/uploads
  3. UPDATE loans SET receipt_path = $1 WHERE id = $2 AND user_id = $3
  4. Return 200 OK with updated loan including full receiptUrl
       │
       ▼
[Mobile] Navigate back to LoansListScreen -> Refresh list and SummaryCard automatically
```

---

## 🎯 18 Likely Interview Questions & Model Answers

### Architecture & Design
1. **"Why did you choose raw SQL with `pg` instead of an ORM like Prisma or TypeORM?"**
   > ORMs abstract away query generation, making it hard to explain the underlying SQL during an interview. With raw SQL and the `pg` driver, I write explicit parameterized queries, control database indexes directly, and can easily explain performance characteristics like atomic updates and aggregation filters.

2. **"Why is 'overdue' NOT stored as a boolean column in the loans table?"**
   > Overdue status depends on the passage of time, not an event. A loan due today becomes overdue at midnight without any user interaction. Storing `is_overdue` would require a scheduled cron job or trigger to update rows every midnight, creating synchronization lag and potential bugs. Computing it dynamically in SQL (`status = 'pending' AND due_date < (now() AT TIME ZONE 'Asia/Kolkata')::date`) is zero-maintenance and always 100% accurate.

3. **"Why do you cast time to 'Asia/Kolkata' in SQL?"**
   > Financial due dates in India expire at midnight Indian Standard Time (IST), not UTC. If a server is hosted in US-East (UTC-5) or Europe (UTC+0), calculating against UTC would declare loans overdue 5.5 hours too early or late. `(now() AT TIME ZONE 'Asia/Kolkata')::date` guarantees consistent date boundaries regardless of server locale.

4. **"Why use NUMERIC(12,2) instead of FLOAT in PostgreSQL?"**
   > Floating-point numbers use binary IEEE 754 representation, which cannot accurately represent decimal fractions like `0.1` or `0.01` (e.g., `0.1 + 0.2 = 0.30000000000000004`). In financial ledgers, rounding errors accumulate into discrepancy bugs. `NUMERIC` stores exact decimal digits.

---

### Security & Authentication
5. **"Why hash OTPs with SHA-256 instead of bcrypt or Argon2?"**
   > OTPs have a very short lifespan (5 minutes), low entropy (6 digits), and are strictly locked after 5 failed attempts. Bcrypt's slow work factor is designed for long-lived passwords with unknown complexity to resist offline dictionary attacks. For short-lived OTPs already defended by lockout counters, SHA-256 is cryptographically secure, fast, and does not exhaust server CPU under concurrent login load.

6. **"What is timingSafeEqual and why did you use it for OTP verification?"**
   > Standard string comparison (`===`) terminates as soon as the first mismatched character is detected. An attacker measuring microscopic response time variations can deduce how many leading characters of a hash were correct. `crypto.timingSafeEqual` always compares all bytes in constant time, eliminating timing side-channel attacks.

7. **"How do you enforce multi-tenant authorization isolation?"**
   > Every single loan query includes `WHERE user_id = $1`, where `$1` comes directly from the cryptographically verified JWT token (`req.userId`), never from request parameters. Even if User A guesses User B's UUID, the SQL query will match zero rows and safely return 404.

8. **"Why generate random hex filenames for uploaded receipts?"**
   > Client-supplied file names cannot be trusted. They may contain path traversal attacks (e.g. `../../etc/passwd`) or special characters that cause filesystem errors. We generate a 16-byte cryptographically random hex string (`crypto.randomBytes(16).toString('hex')`) and only preserve the whitelisted extension.

---

### Database & Concurrency
9. **"How does the atomic repay endpoint prevent race conditions?"**
   > Instead of a two-step "check status then update" pattern (which suffers from check-then-act race conditions under concurrent requests), we execute a single atomic query:
   > `UPDATE loans SET status='repaid', repaid_at=now() WHERE id=$1 AND user_id=$2 AND status='pending' RETURNING *`
   > Postgres row-level locks ensure that even if two requests hit at the exact same millisecond, only one will find `status='pending'` and update; the second will affect 0 rows and return a 409 Conflict.

10. **"Why compute the financial summary in a single SQL query instead of JavaScript array `.reduce()`?"**
    > Pulling thousands of loan records over the network to sum them in Node.js wastes bandwidth, consumes memory, and is prone to JavaScript floating-point rounding errors. Using `SUM(amount) FILTER (WHERE ...)` in PostgreSQL calculates the exact aggregate in C-level database memory in a single database round-trip.

11. **"What index did you create on the loans table and why?"**
    > `CREATE INDEX idx_loans_user_status_due ON loans (user_id, status, due_date)`.
    > The most frequent queries in the app filter by `user_id` and `status` and order by `due_date`. A composite B-tree index allows Postgres to perform an index-only or index scan directly matching the query's WHERE and ORDER BY clauses without a sequential table scan.

---

### Mobile & React Native
12. **"Why use `expo-secure-store` instead of standard `AsyncStorage` for the JWT token?"**
    > `AsyncStorage` stores data in unencrypted plaintext on the device filesystem. On rooted or jailbroken devices, any app or ADB inspection can extract tokens. `expo-secure-store` encrypts values using the iOS Keychain or Android Keystore (backed by hardware security modules/TEE where available).

13. **"How does the mobile app handle token expiration or 401 Unauthorized errors?"**
    > We configure an Axios response interceptor in `api/client.ts`. If any request receives an HTTP 401 response, the interceptor immediately triggers a callback to `AuthContext.logout()`, which clears the token from `SecureStore` and redirects the user to `LoginScreen`.

14. **"Why use React Context + Hooks instead of Redux for this app?"**
    > For an application with straightforward global state (just authentication and current user session), Redux introduces unnecessary boilerplate (actions, reducers, dispatchers, store configuration). React Context with custom hooks provides clean, native state sharing without third-party runtime overhead.

15. **"Why is `10.0.2.2` used for the Android emulator API URL?"**
    > The Android emulator runs in an isolated virtual network behind a virtual router. Inside the emulator, `localhost` (127.0.0.1) refers to the emulator device itself, not the host computer development server. Android maps `10.0.2.2` as an alias to the host machine's loopback interface.

---

### Express & Node.js
16. **"What is the difference between `app.ts` and `server.ts`?"**
    > Separation of configuration from execution. `app.ts` sets up middleware and routes and exports the Express app instance. `server.ts` imports `app` and calls `app.listen(PORT)`. This allows our Jest test suite to import `app` directly and run Supertest against ephemeral in-memory ports without port conflicts or managing server lifecycle.

17. **"Why is `asyncHandler` needed in Express 4?"**
    > Express 4 does not automatically catch unhandled promise rejections from `async` route handlers. If an async function throws an error without a try/catch, the request hangs or crashes Node.js. `asyncHandler` wraps the async function and appends `.catch(next)`, passing any rejection straight to our centralized error middleware.

18. **"How does your error handling middleware guarantee consistent responses?"**
    > All application exceptions inherit from `AppError` with a standard `statusCode` and `code`. The centralized `errorHandler` checks `err instanceof AppError` and formats `{ error: { code, message, details } }`. It also catches Multer errors (e.g. 413 for large files) and hides unexpected internal stack traces from end users in production.
