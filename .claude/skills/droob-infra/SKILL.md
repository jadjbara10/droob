---
name: droob-infra
description: Droob Infrastructure — Fly.io servers, Cloudflare Workers & Tunnels, GitHub deployments. Complete deployment topology for the Droob smart transit system.
---

# Droob Infrastructure Skill

## Deployment Topology

```
┌─────────────────────────────────────────────────────┐
│                    INTERNET                          │
│  droob-jo.com ──────► Cloudflare Workers             │
│  api.droob-jo.com ──► Cloudflare Workers (proxy)     │
└──────────────────┬──────────────────────────────────┘
                   │ Cloudflare Tunnel (droob-api)
                   │ ID: 39f963a3-7efb-40cf-80dc-b61b93c7d92b
                   ▼
┌─────────────────────────────────────────────────────┐
│                    Fly.io                            │
│  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │ droob-api :3000 │  │ droob-osrm :5000         │  │
│  │ Express backend │  │ Open Source Routing Mach. │  │
│  └─────────────────┘  └──────────────────────────┘  │
│  ┌─────────────────┐                               │
│  │ PostgreSQL 16   │  (Fly Postgres)                │
│  │ + PostGIS 3.4   │                               │
│  └─────────────────┘                               │
│  ┌─────────────────┐                               │
│  │ Redis 7         │  (Fly Redis / Upstash)         │
│  └─────────────────┘                               │
└─────────────────────────────────────────────────────┘
                   │
┌─────────────────────────────────────────────────────┐
│                    Vercel                            │
│  Dashboard (Next.js) — admin.droob-jo.com            │
└─────────────────────────────────────────────────────┘
```

## Services

### 1. Fly.io — droob-api
- **App**: `droob-api`
- **Port**: `3000` (internal), exposed via Cloudflare Tunnel
- **Config**: `backend/fly.toml`
- **Secrets**: Managed via `fly secrets set` (NOT in fly.toml)

### 2. Fly.io — droob-osrm
- **App**: `droob-osrm`
- **Port**: `5000` (internal)
- **Purpose**: Open Source Routing Machine for trip planning
- **Data**: Amman road network (OSM extract)

### 3. Cloudflare Workers
- **Account**: jadjbara10@gmail.com
- **Account ID**: `4453959f9bc91a6f47c5aed960dd67f1`
- **Zone ID**: `c1a602970981d8fda43ce70b5af80afe`

| Worker | Domain | Purpose |
|--------|--------|---------|
| droob-site | droob-jo.com | Landing page (6 sections, glass morphism) |
| droob-api-proxy | api.droob-jo.com | API reverse proxy with CORS + rate limiting |

### 4. Cloudflare Named Tunnel
- **Name**: `droob-api`
- **Tunnel ID**: `39f963a3-7efb-40cf-80dc-b61b93c7d92b`
- **Target**: `http://droob-api.internal:3000` (Fly.io internal)
- **Bridge URL**: `https://livecam-consumers-pastor-tribune.trycloudflare.com`

### 5. Vercel — Dashboard
- **Framework**: Next.js 15
- **Domain**: Deployed on Vercel (automatic SSL)
- **API URL**: `NEXT_PUBLIC_API_URL=https://api.droob-jo.com`

### 6. GitHub
- **Repo**: `jadjbara10/droob`
- **Releases**: APK builds at `github.com/jadjbara10/droob/releases`
- **Latest**: v6.0.0

## Deploy Commands

### Backend (Fly.io)
```bash
cd backend
fly deploy                          # Deploy droob-api
fly secrets set KEY=VALUE           # Set secrets
fly secrets list                    # Verify secrets
fly logs                            # View logs
fly ssh console                     # SSH into app
```

### OSRM (Fly.io)
```bash
cd droob-osrm
fly deploy
```

### Cloudflare Workers
```bash
# API Proxy
cd workers/api-proxy
npx wrangler deploy

# Landing Site
cd workers/site
npx wrangler deploy
```

### Dashboard (Vercel)
```bash
cd dashboard
vercel --prod
```

### Mobile APK
APK built locally, uploaded to GitHub Releases manually.

## Bridge API (Admin Control)

- **Port**: `9999`
- **Endpoint**: `POST /admin/execute`
- **Auth**: Header `x-admin-key: JBARA2026`
- **Format**:
```json
{
  "category": "system",
  "task": "direct",
  "args": { "command": "fly logs" }
}
```

## Constraints & Warnings

1. **Tunnel is critical** — If the Cloudflare Tunnel goes down, the API is unreachable
2. **fly.toml must NOT contain secrets** — Use `fly secrets set` exclusively
3. **OSRM data is large** — Amman OSM extract must be pre-processed
4. **PostGIS required** — Enable extension on Fly Postgres: `CREATE EXTENSION postgis;`
5. **Worker rate limits** — Free tier: 100K requests/day
6. **Fly.io free tier** — 3 shared-CPU VMs, 256MB each

## Verification Checklist

- [ ] `fly status` shows droob-api running
- [ ] `fly status` shows droob-osrm running
- [ ] `curl https://api.droob-jo.com/health` returns 200
- [ ] `curl https://droob-jo.com` returns landing page
- [ ] Cloudflare Tunnel `droob-api` is healthy
- [ ] `fly secrets list` shows all required secrets
- [ ] No secrets in fly.toml
- [ ] PostgreSQL has PostGIS extension enabled
- [ ] Redis is reachable from droob-api
