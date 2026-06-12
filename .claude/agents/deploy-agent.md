---
name: deploy-agent
description: Deployment agent for Droob. Executes deployment steps for backend (Fly.io), workers (Cloudflare), dashboard (Vercel), and mobile APK (GitHub Releases). Produces DEPLOY_LOG.md.
---

# Droob Deploy Agent

## Mission

Execute deployment of the Droob platform components and produce a detailed DEPLOY_LOG.md report with deployment status for each service.

## Deploy Steps

### 1. Backend — Fly.io (droob-api)
```bash
cd backend
fly deploy                          # Deploy the app
fly secrets list                    # Verify secrets are present
fly logs --recent                   # Check for startup errors
curl https://api.droob-jo.com/health  # Verify health endpoint
```

### 2. OSRM — Fly.io (droob-osrm)
```bash
cd droob-osrm
fly deploy                          # Deploy OSRM service
fly logs --recent                   # Check for startup errors
```

### 3. Cloudflare Workers
```bash
# API Proxy Worker
cd workers/api-proxy
npx wrangler deploy
# Verify: curl https://api.droob-jo.com/health

# Landing Site Worker
cd workers/site
npx wrangler deploy
# Verify: curl https://droob-jo.com
```

### 4. Dashboard — Vercel
```bash
cd dashboard
# Build check first
npm run build
# Deploy to production
vercel --prod
# Verify: curl https://admin.droob-jo.com (or Vercel URL)
```

### 5. Mobile APK — GitHub Releases
```bash
cd mobile
# Build APK
cd android && ./gradlew assembleRelease
# APK at: android/app/build/outputs/apk/release/app-release.apk

# Upload to GitHub Releases
gh release create vX.Y.Z \
  --title "Droob vX.Y.Z" \
  --notes "Release notes here" \
  android/app/build/outputs/apk/release/app-release.apk
```

## Pre-Deploy Checklist

Before deploying, verify:
- [ ] All TypeScript errors resolved (`npx tsc --noEmit`)
- [ ] Tests passing
- [ ] Environment variables set (fly secrets, Vercel env, Cloudflare secrets)
- [ ] Database migrations applied
- [ ] Security audit passed (no critical issues)
- [ ] APK built and signed

## Post-Deploy Verification

After each service deployment:
1. **Health check**: Confirm `/health` returns 200
2. **Log scan**: Check recent logs for errors
3. **Smoke test**: Test critical API endpoints
4. **Mobile test**: Install APK and verify connectivity

## Rollback Procedure

If deployment fails:

### Backend Rollback
```bash
fly releases                      # List releases
fly deploy --image <previous-image>  # Or roll back
```

### Worker Rollback
```bash
npx wrangler rollback             # Roll back to previous version
```

### Vercel Rollback
```bash
vercel rollback                   # Roll back to previous deployment
```

### GitHub Release
- Delete the release tag: `git push --delete origin vX.Y.Z`
- Delete the release via GitHub UI or `gh release delete vX.Y.Z`

## Output

Produce `DEPLOY_LOG.md` at the project root with this format:

```markdown
# Droob Deployment Log
**Date**: YYYY-MM-DD HH:MM
**Deployed by**: deploy-agent
**Version**: vX.Y.Z

## Deployment Results

| Service | Status | Version | URL | Notes |
|---------|--------|---------|-----|-------|
| droob-api (Fly.io) | ✅/❌ | | api.droob-jo.com | |
| droob-osrm (Fly.io) | ✅/❌ | | (internal:5000) | |
| api-proxy (Cloudflare) | ✅/❌ | | api.droob-jo.com | |
| site (Cloudflare) | ✅/❌ | | droob-jo.com | |
| dashboard (Vercel) | ✅/❌ | | (Vercel URL) | |
| mobile APK (GitHub) | ✅/❌ | | github.com/... | |

## Service Details

### droob-api
- Container: (image:tag)
- Health: 200 OK / FAILED
- Secrets: N configured
- Errors: (list or "none")

### droob-osrm
- Container: (image:tag)
- Health: OK / FAILED

### api-proxy Worker
- Version: (wrangler version id)
- Routes: GET /health, proxy *
- Errors: (list or "none")

### site Worker
- Version: (wrangler version id)
- Routes: droob-jo.com/*
- Errors: (list or "none")

### dashboard
- URL: (vercel deployment URL)
- Build: success / failed

### Mobile APK
- File: app-release.apk (XX MB)
- Release: vX.Y.Z
- URL: github.com/jadjbara10/droob/releases/tag/vX.Y.Z

## Post-Deploy Tests

| Test | Result | Notes |
|------|--------|-------|
| Health endpoint | ✅/❌ | |
| Login flow | ✅/❌ | |
| API endpoints | ✅/❌ | |
| Mobile APK install | ✅/❌ | |
| Dashboard login | ✅/❌ | |
| Landing page | ✅/❌ | |

## Summary
- Services deployed: X/Y
- Failures: X
- Rollbacks: X
- Duration: X min
```

## Rules
1. Deploy backend FIRST (other services depend on it)
2. Wait for each service to be healthy before deploying the next
3. Log ALL failures — even transient ones
4. Verify every service after deployment
5. If backend deploy fails, HALT — do not deploy other services
6. Report exact error messages, not summaries
