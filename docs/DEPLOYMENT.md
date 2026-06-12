# 🚀 دروب Droob — خطة النشر الكاملة (محدّثة)

## 📋 حالة النشر الحالية — يونيو 2026

| العنصر | الحالة | المنصة |
|--------|--------|--------|
| 🌐 الدومين `droob-jo.com` | ✅ يعمل | Namecheap + Cloudflare |
| 🏠 الموقع الرئيسي `droob-jo.com` | ✅ يعمل 24/7 | Cloudflare Worker (`droob-site`) |
| 📥 تنزيل APK | ✅ يعمل | GitHub Release + Worker redirect |
| 🔒 سياسة الخصوصية | ✅ تعمل | `droob-jo.com/privacy` |
| 🔗 API السحابي `api.droob-jo.com` | ✅ يعمل 24/7 | Cloudflare Worker (`droob-api-proxy`) → Fly.io |
| 🖥️ Backend API | ✅ يعمل 24/7 | Fly.io (`droob-api`) — المنفذ 3000 |
| 🗺️ OSRM تخطيط الرحلات | ✅ يعمل 24/7 | Fly.io (`droob-osrm`) — خوارزمية CH |
| 🏪 حساب Google Play | ⏳ قيد المراجعة | — |
| 📱 نسخة التطبيق | ✅ جاهز | v1.0.0 — APK عبر الموقع |

---

## ✅ ما تم إنجازه بالكامل

### 1. البنية التحتية السحابية (تعمل بدون جهاز محلي)

التطبيق يعمل **كاملاً سحابياً** — لا يعتمد على تشغيل أي خدمة على الجهاز المحلي.

```
المستخدم (Android)
    │
    ▼
droob-jo.com ← Cloudflare Worker (droob-site)
    ├── /           → Landing Page
    ├── /download   → GitHub Release APK (تنزيل مباشر)
    └── /privacy    → سياسة الخصوصية
    │
api.droob-jo.com ← Cloudflare Worker (droob-api-proxy)
    │
    ▼
droob-api.fly.dev ← Fly.io (Backend API)
    │
    ▼
droob-osrm.fly.dev ← Fly.io (OSRM — تخطيط الرحلات)
```

### 2. تفاصيل المكونات المنشورة

#### Cloudflare Workers
| Worker | الدومين | الوظيفة |
|--------|---------|---------|
| `droob-site` | `droob-jo.com/*` | الموقع الرئيسي + تنزيل APK + سياسة الخصوصية |
| `droob-api-proxy` | `api.droob-jo.com/*` | Proxy للـ Backend على Fly.io مع CORS |

#### Fly.io Apps
| App | الوظيفة | المنفذ الداخلي |
|-----|---------|----------------|
| `droob-api` | Backend API (Fastify) | 3000 |
| `droob-osrm` | OSRM تخطيط الرحلات (CH) | 5000 |

#### Cloudflare DNS
| النوع | المضيف | القيمة |
|-------|--------|--------|
| CNAME | `droob-jo.com` | Worker `droob-site` |
| CNAME | `api` | Worker `droob-api-proxy` |

#### متغيرات البيئة على Fly.io
- `droob-api`: `OSRM_BASE_URL=https://droob-osrm.fly.dev` ✅
- `droob-api`: `PORT=3000` ✅

### 3. Docker (محلي — للتطوير فقط)
- تم تنظيف Docker: حُذف **4.1 GB** من الموارد غير المستخدمة
- OSRM محلي على المنفذ 5000 ببيانات `jordan-latest.osrm*` وخوارزمية CH
- Backend محلي عبر PM2 على المنفذ 3001 (للتطوير فقط)

---

## 🔧 المهام المتبقية

### الخطوة 1: تفعيل حساب Google Play
- [ ] إنشاء حساب مطور Google Play ($25 رسوم لمرة واحدة)
- [ ] رفع APK/AAB للمتجر
- [ ] إضافة لقطات الشاشة (8+ صور)
- [ ] وصف المتجر (عربي + إنجليزي)
- [ ] أيقونب التطبيق 1024×1024

### الخطوة 2: تحسينات اختيارية
- [ ] تفعيل SSL/TLS على Cloudflare (Full Strict)
- [ ] إضافة Monitoring (Uptime monitoring للـ API)
- [ ] إضافة CI/CD عبر GitHub Actions
- [ ] نشر لوحة التحكم (Dashboard) على Vercel

### الخطوة 3: تحسينات الإنتاج
- [ ] قاعدة بيانات سحابية (Supabase / Neon PostgreSQL)
- [ ] Redis سحابي (Upstash)
- [ ] تفعيل Firebase Auth للإنتاج
- [ ] إعداد Sentry لتتبع الأخطاء

---

## 💰 ملخص التكاليف الشهرية الحالية

| الخدمة | التكلفة |
|--------|---------|
| Fly.io (Backend + OSRM) | مجاني (Hobby Plan — 3 VMs) |
| Cloudflare Workers | مجاني (100K طلب/يوم) |
| Cloudflare DNS | مجاني |
| GitHub Release (APK) | مجاني |
| Namecheap (droob-jo.com) | ~$10/سنة |
| **المجموع الشهري** | **~$0.83/شهر** (الدومين فقط) |

---

## 🔑 بيانات الوصول المهمة

| الخدمة | التفاصيل |
|--------|----------|
| Fly.io App (Backend) | `droob-ap` — `droob-api.fly.dev` |
| Fly.io App (OSRM) | `droob-osrm` — `droob-osrm.fly.dev` |
| Cloudflare Account | `jadjbara10@gmail.com` |
| Cloudflare Account ID | `445395f9fbc91a6f47c5aed960dd67f1` |
| Cloudflare Zone (droob-jo.com) | `c1a602970981d8fda43ce70b5af80afe` |
| Named Tunnel | `droob-api` / ID: `39f963a3-7efb-40cf-80dc-b61b93c7d92b` |

---

## ⚐️ ملاحظات مهمة

1. **التطبيق يعمل كاملاً سحابياً*** — لا حاجة لتشغيل أي خدمة على الجهاز المحلي
2. **OSRM محلي لا يزال متاحاً** للتطوير عبر PM2 على المنفذ 5000
3. **الـ Named Tunnel `droob-api`** لا يُستخدم حالياً في الإنتاج (الإنتاج يعمل عبر Workers → Fly.io)
4. **R2 غير مفعّل** على Cloudflare — يُستخدم GitHub Release كبديل لاستضافة APK
5. **المسار المحلي** `D:\trans_app\droob\` يحتوي على كل ملفات المشروع
