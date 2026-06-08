#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# دروب Droob — Deployment Script
# ينشر صفحة الهبوط + سياسة الخصوصية على Cloudflare
# ═══════════════════════════════════════════════════════════════

set -e

CLOUDFLARE_API_TOKEN="cfat_szErdxjglsdJcnl72W1YzfCOxolxmgaMKKfdzYiFc5c38338"
CLOUDFLARE_ACCOUNT_ID="445395f9fbc91a6f47c5aed960dd67f1"

export CLOUDFLARE_API_TOKEN
export CLOUDFLARE_ACCOUNT_ID

echo "🚀 نشر موقع دروب..."

# Method 1: Deploy via Wrangler Pages
cd "$(dirname "$0")/deploy"

echo "📤 رفع الملفات إلى Cloudflare Pages..."
npx wrangler pages deploy . --project-name=droob-landing --branch=main

echo ""
echo "✅ تم النشر!"
echo "🌐 الموقع: https://droob-landing.pages.dev"
echo "🔒 سياسة الخصوصية: https://droob-landing.pages.dev/privacy"
echo ""
echo "⚠️  تأكد من تغيير nameservers في Namecheap إلى:"
echo "   kanye.ns.cloudflare.com"
echo "   lily.ns.cloudflare.com"
