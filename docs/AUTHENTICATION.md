# Authentication & Session Management

## Overview

This project uses a secure, stateless authentication system based on JWTs (JSON Web Tokens) and HttpOnly cookies. It supports:
- Email/Password Login
- OAuth (GitHub, Google)
- Multi-device sessions (up to 5)
- Automatic token rotation
- Secure SSR compatibility

## Session Management

### Configuration

**Default:** Up to 5 concurrent sessions per user.

Change in [api/lib/session-manager.ts](../api/lib/session-manager.ts):
```typescript
const MAX_ACTIVE_SESSIONS = 5; // Modify this value
```

### Recommended Limits

| Use Case | Limit | Rationale |
|----------|-------|-----------|
| **Consumer Apps** | 5-10 | Multiple devices (phone, laptop, tablet, work PC) |
| **Enterprise Apps** | 1-3 | Higher security requirements |
| **Banking Apps** | 1 | Maximum security, single session only |
| **SaaS Apps** | 5-7 | Balance between UX and security |

### How It Works

#### On Login
1. Generate JWT tokens (15m access, 7d refresh)
2. Clean up expired tokens
3. Delete oldest session if limit exceeded
4. Store new refresh token in database
5. Set HttpOnly cookies

#### On Token Refresh
1. Verify old refresh token
2. Generate new tokens
3. Delete old token, insert new one
4. Return new tokens in cookies

#### On Logout
1. Delete refresh token (fire-and-forget)
2. Clear cookies immediately
3. Return success

## Security Features

✅ **HttpOnly Cookies** - XSS protection  
✅ **SameSite=Lax** - CSRF protection  
✅ **Token Rotation** - Refresh tokens rotated on every use  
✅ **Rate Limiting** - 5 login attempts per minute  
✅ **Argon2id** - Modern password hashing (OWASP 2024-2025)  
✅ **Auto Cleanup** - Expired tokens deleted automatically  
✅ **Device Limit** - Max 5 concurrent sessions  

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
A: ❌ NO! Always use HttpOnly cookies. localStorage is vulnerable to XSS.

## Database Schema

See: [supabase/migrations/20241222_initial_schema.sql](../supabase/migrations/20241222_initial_schema.sql)

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Argon2 RFC](https://www.rfc-editor.org/rfc/rfc9106.html)
