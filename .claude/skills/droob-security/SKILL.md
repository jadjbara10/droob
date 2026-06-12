---
name: droob-security
description: Droob Security Rules — CORS, JWT, secrets management, authentication policies, and security hardening guidelines for the Droob smart transit platform.
---

# Droob Security Skill

## Core Security Principles

1. **Zero hardcoded secrets** — All credentials, keys, and passwords via environment variables or fly secrets
2. **Defense in depth** — Multiple security layers: CORS → JWT → Rate Limiting → Input Validation
3. **Least privilege** — Services and users get minimum required access
4. **Constant-time operations** — Login comparisons use timing-safe functions
5. **No secrets in logs** — Never log tokens, passwords, or PII

## Authentication Flow

```
User → POST /auth/login (email, password)
     → Server: bcrypt.compare (constant-time)
     → Returns: { accessToken (15min), refreshToken (7d) }
     → Client stores: SecureStore (mobile) / httpOnly cookie (dashboard)
     → Subsequent requests: Authorization: Bearer <accessToken>
     → Token refresh: POST /auth/refresh with refreshToken
```

## CORS Policy

Restricted to specific origins only:

```typescript
const ALLOWED_ORIGINS = [
  'https://droob-jo.com',
  'https://admin.droob-jo.com',
  'https://api.droob-jo.com',
  'exp://localhost:19000',   // Expo dev
  'http://localhost:3000',   // Local dev
];
```

**Rule**: Never use `Access-Control-Allow-Origin: *` in production.

## JWT Requirements

- **Algorithm**: HS256 minimum; prefer RS256
- **Access Token**: 15 minutes expiry
- **Refresh Token**: 7 days expiry, stored in httpOnly cookie
- **Secret**: Minimum 64 characters, generated via `openssl rand -base64 64`
- **Every protected route** MUST verify JWT via middleware
- **Admin routes** additionally check `role === 'admin'`

## WebSocket Security

- All WS connections require JWT token as query param: `?token=<jwt>`
- Server validates token on connection, rejects with 401 if invalid
- WS connections timeout after 5 minutes of inactivity
- No sensitive data broadcast without authentication

## Secrets Management (Production)

```
# Fly.io — ALL secrets must be here
fly secrets set DATABASE_URL=postgresql://...
fly secrets set JWT_SECRET=$(openssl rand -base64 64)
fly secrets set REDIS_URL=redis://:strongpass@...
fly secrets set SMTP_PASS=...
fly secrets set OSRM_URL=http://droob-osrm.internal:5000

# Cloudflare Workers — via wrangler
npx wrangler secret put JWT_SECRET
npx wrangler secret put API_UPSTREAM_URL
```

**Forbidden locations for secrets**:
- ❌ `fly.toml`
- ❌ `wrangler.toml`
- ❌ `backend/.env` (production credentials)
- ❌ `.git/` committed files
- ❌ Client-side code (mobile/dashboard)

## Password Policy

- Minimum 8 characters (users), 16 characters (admin)
- PostgreSQL database: minimum 32-character random password
- Redis: password-protected in production
- No default passwords — `droob_password` is BANNED

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| /auth/login | 5 | per minute per IP |
| /auth/register | 3 | per minute per IP |
| General API | 100 | per minute per IP |
| WebSocket | 10 | connections per minute |

Implemented in Cloudflare Worker (`droob-api-proxy`) and backend middleware.

## Dashboard Token Storage

- **Production**: httpOnly, Secure, SameSite=Strict cookies
- **NOT localStorage** — Vulnerable to XSS
- **NOT sessionStorage** — Survives only tab lifetime
- Token refresh handled server-side

## Mobile Token Storage

- **Production**: expo-secure-store (Keychain on iOS, Keystore on Android)
- **NOT AsyncStorage** — Plain text, readable by other apps
- Token refresh handled in API client interceptor

## Input Validation

- All inputs validated server-side (never trust client)
- SQL injection prevented by Drizzle ORM parameterized queries
- XSS prevented by output encoding in dashboard
- File uploads: size limit, type whitelist, virus scan

## Security Audit Checklist

Run before every deployment:

- [ ] `grep -r "password\|secret\|key\|token" --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".env.example"`
- [ ] CORS configuration is NOT `*`
- [ ] All secrets are in fly secrets / env vars, NOT in config files
- [ ] `fly secrets list` shows all required variables
- [ ] JWT secret is ≥ 64 characters
- [ ] PostgreSQL password is NOT `droob_password`
- [ ] Redis has AUTH enabled in production
- [ ] WebSocket validates JWT
- [ ] Rate limiting is active on API worker
- [ ] Dashboard uses httpOnly cookies, not localStorage
- [ ] Mobile uses SecureStore, not AsyncStorage
- [ ] No Gmail password in any config file
- [ ] No API keys in client-side code

## Emergency Response

If a secret is exposed:
1. Rotate the secret immediately (`fly secrets set`)
2. Invalidate all active tokens
3. Check access logs for unauthorized use
4. Update `.gitignore` if the leak was via git
5. Document in SECURITY_LOG.md
