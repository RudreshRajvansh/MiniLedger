-- Users table: one row per phone number that has verified an OTP.
-- Using UUID primary keys so IDs aren't guessable sequential integers.

CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT UNIQUE NOT NULL,  -- E.164 format, e.g. +919876543210
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
