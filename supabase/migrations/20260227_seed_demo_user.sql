-- Seed demo user for quick product walkthroughs
-- Email: test@te.st
-- Password: test

INSERT INTO users (
  email,
  name,
  password_hash,
  provider,
  email_verified,
  role,
  session_version
)
VALUES (
  'test@te.st',
  'Demo User',
  '$argon2id$v=19$m=19456,t=2,p=1$M6olpxwvXveawkd6rgoVaw$MWqZicHa6ON/I7oWrYO3gJ88Wefbwr5Wu7ruw86tUjo',
  'email',
  true,
  'user',
  0
)
ON CONFLICT (email) DO UPDATE
SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  provider = EXCLUDED.provider,
  email_verified = EXCLUDED.email_verified,
  role = EXCLUDED.role;
