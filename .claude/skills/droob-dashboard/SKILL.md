---
name: droob-dashboard
description: Droob Admin Dashboard — Next.js 15 on Vercel with deck.gl maps. Admin panel for managing transit data, users, trips, and viewing analytics.
---

# Droob Dashboard Skill

## Architecture

- **Framework**: Next.js 15 (App Router)
- **Deployment**: Vercel (automatic from GitHub)
- **Maps**: deck.gl + OpenStreetMap base tiles
- **Authentication**: JWT-based admin login via API
- **Charts**: Recharts / Chart.js
- **Styling**: Tailwind CSS

## Directory Structure

```
dashboard/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx            # Root layout with auth provider
│   ├── page.tsx              # Dashboard home (stats overview)
│   ├── login/
│   │   └── page.tsx          # Admin login page
│   ├── routes/
│   │   └── page.tsx          # Transit routes management
│   ├── trips/
│   │   └── page.tsx          # Trip monitoring
│   ├── users/
│   │   └── page.tsx          # User management
│   ├── analytics/
│   │   └── page.tsx          # Analytics & charts
│   ├── map/
│   │   └── page.tsx          # Live transit map (deck.gl)
│   ├── fares/
│   │   └── page.tsx          # Fare management
│   ├── security/
│   │   └── page.tsx          # Security audit log
│   └── settings/
│       └── page.tsx          # System settings
├── components/
│   ├── AuthProvider.tsx       # Auth context provider
│   ├── Sidebar.tsx            # Admin sidebar navigation
│   ├── StatCard.tsx           # Dashboard stat card
│   ├── TransitMap.tsx         # deck.gl transit map
│   └── ProtectedRoute.tsx     # Route guard component
├── lib/
│   ├── api.ts                # API client
│   ├── auth.ts               # Auth helpers (httpOnly cookies)
│   └── types.ts              # TypeScript types
├── .env.local                # Local environment (gitignored)
├── next.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## Build & Run Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev                     # http://localhost:3000

# Build for production
npm run build

# Start production server
npm start
```

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `https://api.droob-jo.com` |
| `JWT_SECRET` | For server-side token verification | (same as backend) |

**IMPORTANT**: Only `NEXT_PUBLIC_*` variables are exposed to the browser. Secrets stay server-side.

## API Connection

- **Base URL**: `https://api.droob-jo.com`
- **Config file**: `dashboard/lib/api.ts`
- Admin login sends credentials to `POST /api/v1/auth/login`
- Admin token stored in **httpOnly cookie** (NOT localStorage)

## Authentication Flow

```
Admin → Login page (email + password)
     → POST https://api.droob-jo.com/api/v1/auth/login
     → Backend validates + returns JWT
     → Dashboard stores token in httpOnly, Secure, SameSite=Strict cookie
     → All API calls include cookie automatically
     → Protected routes check cookie server-side (middleware)
```

## Token Storage

**CRITICAL**: The admin JWT token MUST be stored in an httpOnly cookie, NEVER in localStorage.

```typescript
// ✅ CORRECT — httpOnly cookie (set by server)
// Cookie: droob_admin_token=xxx; HttpOnly; Secure; SameSite=Strict

// ❌ WRONG — localStorage (vulnerable to XSS)
// localStorage.setItem('token', token)
```

## Pages (11 total)

| Page | Route | Purpose |
|------|-------|---------|
| Login | /login | Admin authentication |
| Dashboard | / | Stats overview (users, trips, revenue) |
| Routes | /routes | Manage transit routes (405 routes) |
| Trips | /trips | Monitor active/completed trips |
| Users | /users | User management |
| Analytics | /analytics | Charts and reports |
| Live Map | /map | Real-time transit visualization |
| Fares | /fares | Fare configuration (4 records seeded) |
| Security | /security | Security audit logs |
| Settings | /settings | System configuration |

## Constraints & Warnings

1. **Vercel deployment** — Preview deployments on PR, production on main branch
2. **httpOnly cookies required** — Never use localStorage for tokens
3. **NEXT_PUBLIC_API_URL** — Must be set in Vercel environment variables
4. **Admin-only routes** — Protected by middleware, check `role === 'admin'`
5. **No Google Maps** — Use deck.gl with OpenStreetMap tiles
6. **API rate limits** — Respect the 100 req/min per IP limit

## Key Files Reference

| File | Purpose |
|------|---------|
| `dashboard/.env.local` | Local development variables |
| `dashboard/lib/api.ts` | API client configuration |
| `dashboard/lib/auth.ts` | Token storage and auth helpers |
| `dashboard/components/AuthProvider.tsx` | Auth context for the app |
| `dashboard/middleware.ts` | Route protection middleware |

## Verification Checklist

- [ ] `npm run build` succeeds with 0 errors
- [ ] `npm run dev` starts on port 3000
- [ ] Login with `jadjbara@live.com` / admin password works
- [ ] Dashboard home shows stats
- [ ] Routes page loads 405 routes from API
- [ ] Live Map shows transit data
- [ ] Token is stored in httpOnly cookie (check DevTools > Application > Cookies)
- [ ] Token is NOT in localStorage (check DevTools > Application > Local Storage)
- [ ] Protected routes redirect to login when unauthenticated
- [ ] API calls use the cookie-based auth automatically
