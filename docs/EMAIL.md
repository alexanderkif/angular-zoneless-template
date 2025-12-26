# Email Setup & Workflow

## Development Workflow

### How Email Works in Development

When you register a new user in **development** (localhost):

1. User submits registration form
2. User is created in database
3. Verification token is generated
4. **Email is NOT sent** (mocked)
5. **Verification link is logged to console**

### Getting the Verification Link

After registration, check your **terminal/console** (where `npm run dev` is running):

```
[API] ✅ User created successfully: user@example.com
[API] 🔑 Verification token generated: abc123...
[API] 📧 Preparing to send verification email...

🔗 ====================================
📧 DEV MODE: Email not sent via SMTP
🔗 VERIFICATION LINK:
   http://localhost:4200/verify-email?token=abc123def456...
🔗 ====================================

✅ In development, copy the link above and open in browser
```

### Why Mock in Development?

Nodemailer + Gmail SMTP has issues on Windows with `vercel dev` (hanging connections). Mocking is faster and more reliable for local development.

## Production Setup (Gmail SMTP)

For production, or if you want to test real emails locally, follow these steps.

### 1. Enable 2-Factor Authentication on Gmail

1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification**

### 2. Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select app: **Mail**
3. Select device: **Other (Custom name)**
4. Name it: `Angular Zoneless Template`
5. Click **Generate**
6. Copy the 16-character password (no spaces)

⚠️ **Important:** The app password looks like: `abcd efgh ijkl mnop` but you need to save it **without spaces**: `abcdefghijklmnop`

### 3. Environment Variables

Add to your `.env.local` (or Vercel Environment Variables):

```bash
SMTP_USER="your-email@gmail.com"
SMTP_PASS="abcdefghijklmnop"  # 16-char app password WITHOUT spaces
```

## Production Best Practices (2025)

### 1. Use Email Queue (Recommended)

For production, **never send emails synchronously** in the request handler. Use a queue system like **BullMQ** + **Redis** or Vercel Cron.

### 2. Use Professional Email Service

For production, use dedicated email services instead of Gmail SMTP:

- **Resend** (recommended for modern apps) - https://resend.com
- **SendGrid** - https://sendgrid.com
- **AWS SES** - https://aws.amazon.com/ses/

**Example with Resend:**

```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({ ... });
```

## Troubleshooting

### "Invalid login credentials"
- Check if you are using App Password (not regular password).
- Check if App Password has spaces (remove them).
- Check if 2FA is enabled.

### "Connection timeout"
- Network/firewall blocking port 587.
- Increase timeouts in `nodemailer` config.

### "User not verified" error
- Check console for verification link.
- Copy the full URL (including token).

## References

- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- [Nodemailer Gmail Setup](https://nodemailer.com/usage/using-gmail/)
