# Remember Me (Current Behavior)

## Summary

The checkbox controls cookie persistence and server-side refresh session TTL.

- `rememberMe = true`:
  - Refresh cookie is persistent (`Max-Age` set)
  - Refresh session in DB uses longer expiration (currently 7 days)
- `rememberMe = false`:
  - Refresh cookie is a session cookie (no `Max-Age`)
  - Refresh session in DB uses shorter expiration (currently 24 hours)

In both modes, silent refresh is enabled while a valid refresh session exists.

## Why users can still be logged in after browser restart

With `rememberMe = false`, many modern browsers restore session cookies when session restore is enabled.
So users may still appear logged in after reopening the browser, until refresh/session validity expires.

This is expected web-platform behavior.

## Security model

- Access token is short-lived and stored in HttpOnly cookie.
- Refresh token is rotated on refresh.
- Protected APIs require:
  - valid access token,
  - active refresh session in DB,
  - matching `sessionVersion` in user record.
- Logout revokes all sessions and increments `sessionVersion`.

## Demo account

For quick testing:

- Email: `test@te.st`
- Password: `test`
