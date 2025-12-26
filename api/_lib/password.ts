import { hash, verify } from '@node-rs/argon2';

/**
 * Hash password using Argon2id (2025 best practice)
 * Argon2id won Password Hashing Competition (PHC) in 2015
 * and is recommended by OWASP in 2024-2025
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

/**
 * Verify password against hash
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await verify(hash, password);
  } catch {
    return false;
  }
}
