-- Auth session model (final)
-- Consolidated from temporary local migrations (not deployed)

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'persistent';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
