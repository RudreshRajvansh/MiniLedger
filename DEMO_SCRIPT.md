# MiniLedger Demo Video Script & Recording Guide 🎥

**Target Duration**: 2 to 3 minutes  
**Goal**: Demonstrate all core requirements, edge cases (overdue highlighting, receipt upload, summary updates, atomic repay), and automated tests smoothly.

---

## 📋 Pre-Recording Checklist

Before you hit record:
- [ ] **Docker / PostgreSQL running**: Ensure database is accessible.
- [ ] **Backend running**: Open Terminal 1, run `npm run dev` in `miniledger/backend`. Keep this terminal window visible on one side of your screen.
- [ ] **Mobile app running**: Open Terminal 2, run `npm run start` in `miniledger/mobile` and have the Android Emulator, iOS Simulator, or phone screen mirroring open.
- [ ] **Clean database**: To start with a fresh slate for the recording:
  ```bash
  # In backend directory
  node -e "const { Client } = require('pg'); async function reset() { const c = new Client('postgresql://miniledger:miniledger@localhost:5432/miniledger'); await c.connect(); await c.query('TRUNCATE TABLE loans, otps, users CASCADE;'); await c.end(); console.log('Database reset clean!'); } reset();"
  ```
- [ ] **Sample receipt image ready**: Have an image in your emulator's gallery or on your phone ready to attach as a receipt.
- [ ] **Screen layout**: Place the mobile app simulator on the left half of your screen and the backend terminal on the right half so the viewer sees the mock OTP printed in real time!

---

## 🎬 Step-by-Step Recording Script

### Scene 1: App Launch & Request OTP (0:00 - 0:35)
1. **Show the Mobile Login Screen** on the left and the backend terminal on the right.
2. **Narration**: *"Hi! This is MiniLedger, a full-stack application built with React Native, Node.js, TypeScript, and PostgreSQL to track money lent to friends."*
3. **Action**:
   - Type your phone number: `9876543210`.
   - Tap **"Send OTP"**.
4. **Point to Terminal**:
   - Show the clearly formatted banner printed in the backend console:
     ```text
     ==================================================
     [MOCK OTP] +919876543210 -> 491777 (valid for 5 minutes)
     ==================================================
     ```
   - *Highlight: The server hashes this code using SHA-256 and never leaks the plain OTP in the API response.*

---

### Scene 2: Verify OTP & Empty State (0:35 - 0:50)
1. **Action**:
   - Type the 6-digit OTP code into the mobile app (`491777`).
   - Tap **"Verify & Log In"**.
2. **Result**:
   - The app verifies the OTP in constant time, upserts the user, securely stores the JWT in `expo-secure-store`, and navigates to the main screen.
   - Point out the **Empty State**: *"We land on an empty ledger showing zero balances and a clean prompt to log our first entry."*

---

### Scene 3: Add 3 Diverse Loans (0:50 - 1:40)
1. **Action**: Tap the floating **"+"** button to open `AddLoanScreen`.
2. **Loan 1 (Overdue Loan)**:
   - Friend Name: `Rohan Sharma`
   - Amount: `1500`
   - Due Date: Tap date and pick a **past date** (e.g., 2 weeks ago).
   - Tap **"Save Loan Entry"**.
   - *Narration: "Notice past dates are supported so users can retroactively log existing debts."*
3. **Loan 2 (Due Soon in Future)**:
   - Tap **"+"**.
   - Friend Name: `Priya Patel`
   - Amount: `3500`
   - Due Date: Keep default (+7 days from now).
   - Tap **"Save Loan Entry"**.
4. **Loan 3 (With Receipt Photo)**:
   - Tap **"+"**.
   - Friend Name: `Vikram Verma`
   - Amount: `2000`
   - Due Date: +14 days.
   - Tap **"Attach Receipt"** -> Select photo -> Preview appears.
   - Tap **"Save Loan Entry"**.
   - *Narration: "Receipt images are validated for MIME type and file size, stored with random unguessable filenames, and served via express.static."*

---

### Scene 4: Demonstrate Summary Card & Overdue Highlighting (1:40 - 2:05)
1. **Point to SummaryCard**:
   - Total Lent: `₹7,000`
   - Total Repaid: `₹0`
   - Pending: `₹7,000`
   - Overdue: `₹1,500` (highlighted in prominent **red text** with badge `1`).
   - *Narration: "All these financial aggregations are computed in a single SQL query using SUM FILTER and COALESCE—never in JavaScript float arithmetic."*
2. **Point to List Items**:
   - Rohan's loan has a **red left border**, light-red background, and a badge reading **"Overdue by 14 days"**.
   - Overdue status is computed dynamically in SQL against Asia/Kolkata midnight without fragile cron jobs.
3. **Show Filter Chips**:
   - Tap **"Overdue"** filter -> only Rohan appears.
   - Tap **"Pending"** filter -> future loans appear.
   - Tap **"All"** -> all 3 loans reappear.
4. **Show Receipt Preview**:
   - Tap the receipt thumbnail on Vikram's card -> full-screen modal opens -> tap **"✕ Close"**.

---

### Scene 5: Mark as Repaid (Atomic Update) (2:05 - 2:25)
1. **Action**:
   - On Rohan's card (or Vikram's card), tap **"Mark Repaid"**.
   - Native confirmation dialog pops up: *"Confirm that Rohan Sharma has repaid ₹1,500?"*
   - Tap **"Confirm Repayment"**.
2. **Observe Instant Live Update**:
   - Card transitions to green **"✓ Repaid"** badge and muted style.
   - The SummaryCard immediately reflects the change:
     - Total Repaid updates to `₹1,500`.
     - Pending updates to `₹5,500`.
     - Overdue drops to `₹0`!

---

### Scene 6: Automated Test Suite (2:25 - 2:45)
1. Switch to terminal and run:
   ```bash
   cd miniledger/backend
   npm test
   ```
2. **Show output**:
   - All 4 test suites pass (`auth.test.ts`, `loans.test.ts`, `summary.test.ts`, `receipt.test.ts`).
   - All 23 tests pass in ~8 seconds.
3. **Wrap up**: *"All tests pass cleanly against the isolated test database, covering the OTP lifecycle, rate limiting, atomic repayments, authorization isolation, and file upload limits. Thank you!"*
