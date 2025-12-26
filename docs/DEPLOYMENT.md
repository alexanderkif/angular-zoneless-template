# Deployment & Environment Variables

## Vercel Environment Variables

### Problem
Vercel automatically overwrites certain environment variables:
- `NODE_ENV` → always set to `production` in production
- URL variables may not match your expectations

### Solution

#### 1. Use `VERCEL_ENV` instead of `NODE_ENV`

Vercel provides `VERCEL_ENV` which is **NOT overwritten**:
```typescript
// ❌ BAD - Vercel overwrites this
const isProduction = process.env.NODE_ENV === 'production';

// ✅ GOOD - Use VERCEL_ENV
const isProduction = process.env.VERCEL_ENV === 'production';
const isLocal = !process.env.VERCEL; // true when running locally
```

#### 2. Use Auto-Detection for URLs

Vercel provides these **automatic** variables:
- `VERCEL` - present when running on Vercel
- `VERCEL_ENV` - `development` | `preview` | `production`
- `VERCEL_URL` - current deployment URL (e.g., `your-app-xyz123.vercel.app`)
- `VERCEL_PROJECT_PRODUCTION_URL` - production URL (e.g., `your-app.vercel.app`)

```typescript
// ✅ BEST PRACTICE - Auto-detect environment
function getFrontendUrl(): string {
  if (!process.env.VERCEL) {
    return 'http://localhost:4200'; // Local development
  }
  
  // On Vercel: use manual override or fall back to auto URL
  return process.env.FRONTEND_URL 
    || `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
}
```

#### 3. Configure in Vercel Dashboard

**Recommended approach**: Don't set `FRONTEND_URL` and `API_URL` in Vercel Dashboard unless you have a custom domain.

If you need custom domains:

1. Go to: **Project Settings → Environment Variables**
2. For **Production** environment only:
   ```
   FRONTEND_URL=https://yourdomain.com
   API_URL=https://yourdomain.com
   ```
3. Leave **Development** and **Preview** empty (auto-detection works)

## Environment Detection Logic

```typescript
// Local development
!process.env.VERCEL
→ http://localhost:4200

// Vercel Preview (PR deployments)
process.env.VERCEL_ENV === 'preview'
→ https://your-app-git-branch-name.vercel.app

// Vercel Production
process.env.VERCEL_ENV === 'production'
→ process.env.FRONTEND_URL || https://your-app.vercel.app
```

## Testing Locally

To test Vercel environment locally:
```bash
# Install Vercel CLI
npm i -g vercel

# Link your project
vercel link

# Run with environment variables
vercel dev

# This will set VERCEL=1 and load env vars from Vercel
```

## References
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [System Environment Variables](https://vercel.com/docs/projects/environment-variables/system-environment-variables)
