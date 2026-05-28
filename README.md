<div dir="rtl">

# 🚌 دروب — Droob

**تطبيق النقل العام الشامل للأردن · Jordan Transit Super-App**

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)]()
[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-blue.svg)]()
[![React Native](https://img.shields.io/badge/React%20Native-0.74-61DAFB.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg)]()
[![Node.js](https://img.shields.io/badge/Node.js-22-339933.svg)]()

---

</div>

## 🇯🇴 What is Droob?

**دروب (Droob)** — meaning "paths/routes" in Arabic — is a comprehensive public transit navigation app built specifically for **Jordan's transport ecosystem**. It covers all four major transit modes in Jordan:

| Mode | Arabic | Color | Icon |
|------|--------|-------|------|
| **City Bus** | الباص الترددي | `#0066CC` 🔵 | 🚌 |
| **Bus Rapid Transit (BRT)** | الباص السريع | `#E60026` 🔴 | ⚡🚌 |
| **Serveece (Shared Taxi)** | سرفيس | `#FF8C00` 🟠 | 🚐 |
| **Inter-City Bus** | باصات بين المدن | `#6B21A8` 🟣 | 🚌 |

<div dir="rtl">

### الميزات الرئيسية

- 🗺️ **خرائط فائقة السرعة** — Mapbox GL JS بتقنية vector tiles  (تحميل أقل من 100ms)
- 📴 **يعمل بدون إنترنت** — وضع Offline-first مع شرائح خرائط محفوظة مسبقاً
- 🕌 **أوقات الصلاة** — تنبيهات الأذان وتعديل الجداول يوم الجمعة ورمضان
- 🚐 **دعم السرفيس** — نمذجة فريدة لنظام التاكسي المشترك الأردني
- 🔔 **تنبيهات حية** — تتبع مباشر للباصات عبر WebSocket
- 👥 **مساهمة مجتمعية** — إبلاغ عن التأخير والازدحام والمحطات المغلقة
- 📊 **لوحة تحكم شاملة** — لإدارة الأسطول والمسارات والتنبيهات والتحليلات

</div>

---

## 🏗️ Architecture

```
droob/
├── backend/           # Fastify + PostgreSQL + PostGIS + Redis
│   ├── src/
│   │   ├── routes/    # REST API endpoints
│   │   ├── services/  # Business logic
│   │   ├── db/        # Drizzle ORM schema + migrations
│   │   └── ws/        # Socket.io handlers
│   └── scripts/       # OSM import, GTFS sync, data validators
│
├── mobile/            # React Native + Expo (Android & iOS)
│   └── src/
│       ├── screens/   # Onboarding, Auth, Map, Trip Planner, Departures
│       ├── stores/    # Zustand state management
│       ├── components/# Reusable UI components
│       └── data/      # Seed data (routes, stops)
│
├── dashboard/         # Next.js 15 + shadcn/ui + mapbox-gl + deck.gl
│   └── src/
│       ├── app/       # App Router pages
│       └── components/# Dashboard UI components
│
├── docker-compose.yml # PostgreSQL + Redis + Backend
├── .github/workflows/ # CI/CD pipelines
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 22
- **Docker** + Docker Compose
- **Expo CLI** (`npm i -g expo-cli`)
- **Mapbox Access Token** ([Get one free](https://account.mapbox.com/))

### 1. Clone & Install

```bash
git clone <repo-url> droob
cd droob
cp .env.example .env
# Edit .env with your Mapbox token, DB creds, etc.
npm install
```

### 2. Start Infrastructure (PostgreSQL + PostGIS + Redis)

```bash
docker-compose up -d
```

### 3. Run Database Migrations

```bash
cd backend
npm run db:migrate
npm run db:seed        # Seed Jordan stops, routes, landmarks
```

### 4. Start Backend API

```bash
cd backend
npm run dev            # http://localhost:3001
```

### 5. Start Mobile App

```bash
cd mobile
npx expo start         # Scan QR with Expo Go
```

### 6. Start Admin Dashboard

```bash
cd dashboard
npm run dev            # http://localhost:3000
```

---

## 🗄️ Database Schema

Powered by **PostgreSQL 16 + PostGIS 3.4** for geospatial queries.

Core tables:
- `stops` — 3,000+ bus stops across Jordan with PostGIS geometry
- `routes` — All transit routes with GeoJSON polyline paths
- `trips` — Individual vehicle trips with headway/timetable
- `vehicles` — Fleet tracking with real-time positions
- `alerts` — Service disruptions and announcements
- `community_reports` — User-submitted delay/crowding reports
- `users` — Firebase-authenticated user profiles

---

## 🗺️ Map Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Initial map render | < 800ms | ✅ |
| Cached tile load | < 100ms | ✅ |
| Uncached tile load | < 500ms | ✅ |
| Route polyline render | < 50ms | ✅ |
| Vehicle marker animation | 60fps | ✅ |

---

## 📡 API Endpoints

### Stops
- `GET /api/stops` — List all stops (paginated, filterable)
- `GET /api/stops/nearby?lat=&lng=&radius=` — Nearby stops (PostGIS)
- `GET /api/stops/:id` — Stop detail with departures

### Routes
- `GET /api/routes` — All routes (filter by mode)
- `GET /api/routes/:id` — Route with stops + schedule

### Trip Planning
- `POST /api/trip/plan` — Multi-modal trip planner
- `GET /api/trip/:id` — Trip detail with legs

### Real-time
- `WS /ws/vehicles` — Live vehicle positions (Socket.io)
- `WS /ws/stop/:id` — Real-time departures from a stop

---

<div dir="rtl">

## 🎨 نظام الألوان

| الاستخدام | الكود | الوصف |
|-----------|-------|--------|
| `--city-bus` | `#0066CC` | الباص الترددي — أزرق |
| `--brt` | `#E60026` | الباص السريع — أحمر |
| `--serveece` | `#FF8C00` | سرفيس — برتقالي |
| `--intercity` | `#6B21A8` | بين المدن — بنفسجي |
| `--primary` | `#1A4F8A` | أزرق العلم الأردني |
| `--accent` | `#2E7D32` | أخضر العلم الأردني |

## 🕌 اعتبارات خاصة بالأردن

- **صلاة الجمعة**: انقطاع الخدمة 11:30 صباحاً – 1:30 ظهراً
- **رمضان**: جداول معدلة، ذروة مسائية بعد الإفطار
- **العملة**: الدينار الأردني (JOD) — 3 خانات عشرية
- **اللغة**: العربية أساسية، الإنجليزية ثانوية
- **التاريخ**: التقويم الهجري + الميلادي

</div>

---

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Mobile tests (Jest)
cd mobile && npm test

# E2E tests (Detox)
cd mobile && npm run e2e:android
cd mobile && npm run e2e:ios
```

---

## 🚢 Deployment

| Component | Platform | URL |
|-----------|----------|-----|
| Backend API | Railway | `api.droob.jo` |
| Admin Dashboard | Vercel | `admin.droob.jo` |
| Mobile App | Google Play / App Store | دروب |

### CI/CD (GitHub Actions)
- Lint + TypeCheck on every PR
- Unit tests on every push
- EAS Update for OTA mobile fixes
- Auto-deploy backend → Railway
- Auto-deploy dashboard → Vercel

---

## 🔐 Environment Variables

```bash
# Required (see .env.example)
MAPBOX_ACCESS_TOKEN=pk.eyJ1...
FIREBASE_PROJECT_ID=droob-jordan
POSTGRES_URL=postgresql://user:pass@localhost:5432/droob
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
SENTRY_DSN=https://...
GAM_GTFS_URL=https://gtfs.gam.gov.jo/feed.zip
```

---

## 📄 License

Proprietary — All rights reserved. Built for the Jordanian public transport ecosystem.

---

<div dir="rtl" style="text-align:center; margin-top: 48px;">

**🚌 دروب — طرقك في الأردن، أسهل وأذكى**

*Droob — Your paths in Jordan, smarter and easier.*

</div>