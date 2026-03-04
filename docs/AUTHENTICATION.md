# Authentication & Session Management (2026)

## Overview

This project uses JWT + HttpOnly cookies with server-side session control in PostgreSQL. It supports:

- Email/Password Login
- OAuth (GitHub, Google)
- Multi-device sessions (up to 5, configurable in api/\_lib/session-manager.ts)
- Refresh token rotation
- Session version invalidation on logout
- Secure SSR compatibility

## Demo Account

For product walkthroughs without registration:

- Email: `test@te.st`
- Password: `test`

Provisioned via `supabase/migrations/20260227_seed_demo_user.sql`.

## Session Management

### Configuration

**Default:** Up to 5 concurrent sessions per user (2025 best practice).

Change in [api/\_lib/session-manager.ts](../api/_lib/session-manager.ts):

```typescript
const MAX_ACTIVE_SESSIONS = 5; // Modify this value (see code for details)
```

### Recommended Limits

| Use Case            | Limit | Rationale                                         |
| ------------------- | ----- | ------------------------------------------------- |
| **Consumer Apps**   | 5-10  | Multiple devices (phone, laptop, tablet, work PC) |
| **Enterprise Apps** | 1-3   | Higher security requirements                      |
| **Banking Apps**    | 1     | Maximum security, single session only             |
| **SaaS Apps**       | 5-7   | Balance between UX and security                   |

### How It Works

#### On Login

1. Generate JWT access token (includes `sessionVersion` and `sessionType`)
2. Generate refresh token
3. Persist refresh session in DB with expiration based on `rememberMe`
4. Set HttpOnly cookies (`rememberMe=true` -> persistent cookie; `false` -> session cookie)
5. Clean up expired tokens (fire-and-forget)
6. Delete oldest session if limit exceeded
7. Store new refresh token in database
8. Set HttpOnly cookies (SameSite=Lax)

#### On Token Refresh

1. Verify refresh token JWT + DB session record
2. Check refresh expiration on server
3. Rotate refresh token (delete old / insert new)
4. Return updated cookies

#### On Logout

1. Resolve user from access/refresh token
2. Revoke all DB refresh sessions for user
3. Increment `users.session_version` (invalidates old access tokens)
4. Clear auth cookies

## Security Features

✅ **HttpOnly Cookies** - XSS protection
✅ **SameSite=Lax** - CSRF protection
✅ **Token Rotation** - Refresh tokens rotated on every use
✅ **Rate Limiting** - 5 login attempts per minute, 3 register/min
✅ **Argon2id** - Modern password hashing (OWASP 2025)
✅ **Auto Cleanup** - Expired refresh sessions deleted automatically
✅ **Device Limit** - Max 5 concurrent sessions (configurable)
✅ **Server Session Gate** - Protected APIs require active DB session + valid JWT
✅ **Session Versioning** - Immediate token invalidation after logout/security events

## Error Handling

### Normal 401 Errors on App Startup

When the application starts, you may see these 401 errors in the console:

```
POST http://localhost:3000/api/auth/refresh 401 (Unauthorized)
GET http://localhost:3000/api/user/me 401 (Unauthorized)
```

**This is completely normal** for a logged-out user!

### What Happens

1. **App Initialization** → `checkSession()` is called
2. **Check Current User** → `GET /api/user/me` → 401 (no valid access_token)
3. **Auto Refresh Attempt** → Token refresh interceptor tries `POST /api/auth/refresh` → 401 (no refresh_token)
4. **Session Invalid** → User remains logged out

### Silent Failure

The auth service and interceptors are configured to handle these 401 errors silently:

- ✅ **No console.error** for expected 401s
- ✅ **No Redux action** dispatch for missing tokens
- ✅ **Clean state** - user stays in logged-out state

## FAQ

**Q: Why 5 devices?**
A: Balances security and UX. Most users have 3-5 devices.

**Q: What happens to old sessions?**
A: When limit reached, oldest session is automatically deleted.

**Q: Are expired tokens deleted?**
A: Yes, automatically on every login (fire-and-forget cleanup).

**Q: Can I see my active sessions?**
A: Yes, use `GET /api/user/sessions` endpoint.

**Q: Can I logout from all devices?**
A: Use `revokeAllSessions(userId)` in code or logout from each device.

**Q: What if someone steals my token?**
A: Tokens expire in 7 days. Change password to revoke all tokens immediately.

**Q: Should I store tokens in localStorage?**
A: ❌ NO! Always use HttpOnly cookies. localStorage is vulnerable to XSS. This project never stores tokens in localStorage.

## Database Schema

See: [api/db/schema.ts](../api/db/schema.ts)

---

_Last updated: December 31, 2025 for Angular 21_

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Argon2 RFC](https://www.rfc-editor.org/rfc/rfc9106.html)
