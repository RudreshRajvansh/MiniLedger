-- OTP storage: hashed codes with expiry and attempt tracking.
-- We never store OTPs in plain text — even a 5-minute code could be exploited
-- if the database leaks.

CREATE TABLE IF NOT EXISTS otps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,          -- SHA-256 hash of the 6-digit code
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INT NOT NULL DEFAULT 0, -- track wrong guesses; lock after 5
  consumed_at TIMESTAMPTZ,            -- set when OTP is successfully verified
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for looking up the latest OTP for a phone number
CREATE INDEX IF NOT EXISTS idx_otps_phone ON otps (phone);
