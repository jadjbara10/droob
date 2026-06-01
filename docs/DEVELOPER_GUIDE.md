# 👨‍💻 دليل مطوري دروب (Droob Developer Guide)

> **كل ما يحتاجه أي مطور للعمل على منصة دروب — من الصفر إلى الإنتاج**

---

## 📋 المحتويات

1. [هيكل المشروع](#1-هيكل-المشروع)
2. [نظرة عامة على البنية](#2-نظرة-عامة-على-البنية)
3. [إعداد بيئة التطوير](#3-إعداد-بيئة-التطوير)
4. [تطبيق الهاتف (Mobile)](#4-تطبيق-الهاتف-mobile)
5. [لوحة التحكم (Dashboard)](#5-لوحة-التحكم-dashboard)
6. [الخادم الخلفي (Backend)](#6-الخادم-الخلفي-backend)
7. [قاعدة البيانات](#7-قاعدة-البيانات)
8. [API Reference](#8-api-reference)
9. [أنواع البيانات (Types)](#9-أنواع-البيانات-types)
10. [نظام التصميم (Design Tokens)](#10-نظام-التصميم-design-tokens)
11. [الاختبارات](#11-الاختبارات)
12. [CI/CD](#12-cicd)
13. [النشر (Deployment)](#13-النشر-deployment)
14. [المساهمة في المشروع](#14-المساهمة-في-المشروع)

---

## 1. هيكل المشروع

```
droob/
├── mobile/                     # 📱 تطبيق React Native + Expo
│   ├── App.tsx                 #   نقطة الدخول الرئيسية
│   ├── app.json                #   إعدادات Expo (SDK 54)
│   ├── eas.json                #   إعدادات EAS Build
│   ├── babel.config.js         #   Babel + module-resolver + reanimated
│   ├── metro.config.js         #   Metro bundler
│   ├── tsconfig.json           #   TypeScript config
│   ├── jest.config.js          #   Jest config (70% coverage threshold)
│   ├── package.json            #   الحزم والمكتبات
│   ├── plugins/                #   Expo Config Plugins
│   │   └── withAndroidLint.js  #   تعطيل ExtraTranslation lint
│   ├── src/
│   │   ├── components/         #   12 مكوناً قابلاً لإعادة الاستخدام
│   │   ├── screens/            #   15 شاشة
│   │   ├── navigation/         #   React Navigation (Stack + Tabs)
│   │   ├── stores/             #   Zustand stores (transit, app, offline)
│   │   ├── services/           #   API client + functions + storage
│   │   ├── hooks/              #   React hooks (network, offline, websocket)
│   │   ├── theme/              #   Design tokens + theme index
│   │   ├── types/              #   TypeScript type definitions
│   │   ├── i18n/               #   Arabic translations
│   │   ├── config/             #   Transport configuration constants
│   │   └── data/               #   Static data (not currently used)
│   ├── assets/                 #   الصور والأيقونات والخطوط
│   │   ├── images/             #   أيقونات التطبيق والشاشات
│   │   └── locales/            #   ملفات الترجمة (ar.json, en.json)
│   ├── test/                   #   اختبارات Jest
│   │   ├── __mocks__/          #   Fixtures + mocks
│   │   ├── screens/            #   اختبارات الشاشات 🆕
│   │   ├── navigation/         #   اختبارات التنقل 🆕
│   │   ├── components/         #   اختبارات المكونات
│   │   ├── stores/             #   اختبارات المتاجر
│   │   ├── hooks/              #   اختبارات الخطافات
│   │   ├── services/           #   اختبارات الخدمات
│   │   └── config/             #   اختبارات الإعدادات
│   └── store-listing/          #   مواد متجر التطبيقات
│
├── dashboard/                  # 🖥️ Next.js 15 Dashboard
│   ├── next.config.ts          #   إعدادات Next.js
│   ├── tailwind.config.ts      #   إعدادات Tailwind (RTL, ألوان دروب)
│   ├── tsconfig.json           #   TypeScript config
│   ├── package.json            #   الحزم والمكتبات
│   ├── src/
│   │   ├── app/                #   App Router pages
│   │   │   ├── layout.tsx      #   Root layout (RTL, dark mode)
│   │   │   ├── page.tsx        #   Dashboard الرئيسية
│   │   │   ├── login/          #   صفحة تسجيل الدخول
│   │   │   ├── alerts/         #   إدارة التنبيهات
│   │   │   ├── analytics/      #   التحليلات
│   │   │   ├── fleet/          #   إدارة الأسطول
│   │   │   ├── reports/        #   التقارير
│   │   │   ├── routes/         #   إدارة الخطوط
│   │   │   ├── stops/          #   إدارة المحطات
│   │   │   ├── settings/       #   الإعدادات
│   │   │   ├── users/          #   إدارة المستخدمين 🆕
│   │   │   └── drivers/        #   إدارة السائقين 🆕
│   │   ├── components/         #   مكونات واجهة المستخدم
│   │   │   ├── DashboardShell  #   هيكل الصفحة الرئيسي
│   │   │   ├── Sidebar         #   القائمة الجانبية
│   │   │   ├── Header          #   شريط العنوان
│   │   │   ├── ui/             #   مكونات أساسية (Button, Input, etc.)
│   │   │   ├── maps/           #   مكونات الخرائط (deck.gl)
│   │   │   └── AuthProvider    #   مزود المصادقة
│   │   └── lib/
│   │       ├── api.ts          #   جميع دوال API
│   │       └── hooks.ts        #   React hooks للـ API
│   └── test/                   #   اختبارات Vitest
│       ├── components/         #   اختبارات المكونات
│       └── lib/                #   اختبارات API + hooks
│
├── backend/                    # 🗄️ Fastify API Server
│   ├── package.json            #   الحزم والمكتبات
│   ├── tsconfig.json           #   TypeScript config
│   ├── Dockerfile              #   Docker deployment
│   ├── drizzle/
│   │   ├── schema.ts           #   تعريف 20 جدول (Drizzle ORM)
│   │   ├── seed.ts             #   بيانات أولية (134 محطة)
│   │   └── migrations/         #   SQL migrations
│   └── src/
│       ├── server.ts           #   نقطة الدخول (Fastify)
│       ├── db/                 #   اتصال قاعدة البيانات
│       ├── redis/              #   Redis client + cache
│       ├── websocket/          #   Socket.io rooms
│       ├── plugins/            #   Fastify plugins (auth, etc.)
│       ├── routes/             #   10 مجموعات من الـ API routes
│       ├── services/           #   Payment + push notifications
│       ├── utils/              #   أدوات مساعدة
│       └── data/               #   ملفات بيانات ثابتة
│
├── .github/
│   └── workflows/
│       ├── ci.yml              #   CI pipeline (backend + dashboard + mobile)
│       ├── deploy.yml          #   Deploy pipeline (Railway + Vercel + EAS)
│       └── e2e.yml             #   Weekly E2E tests 🆕
│
├── docker/
│   ├── docker-compose.yml      #   تطوير محلي
│   └── docker-compose.prod.yml #   إنتاج
│
├── docs/                       #   📚 التوثيق 🆕
│   ├── MOBILE_USER_GUIDE.md    #   دليل المستخدم
│   ├── DASHBOARD_GUIDE.md      #   دليل لوحة التحكم
│   └── DEVELOPER_GUIDE.md      #   هذا الملف
│
├── scripts/                    #   Scripts مساعدة
├── MONETIZATION.md             #   خطة تحقيق الدخل 🆕
└── README.md                   #   ملف المشروع الرئيسي
```

---

## 2. نظرة عامة على البنية

### المفهوم الأساسي:

**دروب = منصة تخطيط رحلات نقل عام متعدد الوسائل**

المستخدم يدخل نقطة انطلاق (أ) ونقطة وصول (ب). التطبيق:
1. يبحث عن أقرب مسارات خطوط النقل القريبة من نقطة أ
2. يحسب أفضل تسلسل: مشي ← وسيلة نقل ← وسيلة نقل ← مشي
3. يرسم المسار كاملاً على الخريطة (خطوط ملونة)
4. يعرض الوقت التقديري والتكلفة لكل خيار

```
المستخدم: من البيت (الجاردنز) → إلى الجامعة الأردنية

النتيجة:
🚶 امشِ 3 دقائق ← أقرب نقطة على مسار سرفيس الحسين
🚐 سرفيس الحسين 10 دقائق ← اركب من أي نقطة، انزل عند محطة مجمع المحطة
⚡ BRT السريع 8 دقائق ← اركب من محطة مجمع المحطة (محطة ثابتة)، انزل في محطة الجامعة
🚶 امشِ دقيقتين ← إلى بوابة الجامعة
📊 المجموع: 23 دقيقة — 0.85 د.أ
```

### نموذج نقاط الركوب والنزول:

| وسيلة النقل | نقطة الركوب | نقطة النزول |
|-------------|-------------|-------------|
| 🚶 المشي | أي نقطة | أي نقطة |
| ⚡ BRT | **محطات ثابتة فقط** | محطات ثابتة فقط |
| 🚌 باص المدينة | أي نقطة على مسار الخط | أي نقطة على مسار الخط |
| 🚐 سرفيس | أي نقطة على مسار الخط | أي نقطة على مسار الخط |
| 🚍 بين المدن | محطات المجمعات | محطات المجمعات |

### مخطط البنية:

```
┌──────────────────────────────────────────────────────┐
│                    📱 Mobile App                      │
│              React Native + Expo SDK 54               │
│     خريطة + تخطيط رحلات + محطات + مغادرات + بحث       │
└────────────┬─────────────────────────────────────────┘
             │
             │  REST API (api.droob.jo)
             ▼
┌──────────────────────────────────────────────────────┐
│                  🗄️ Backend API                       │
│             Fastify 5 · Drizzle ORM · Zod              │
│        خوارزمية تخطيط الرحلات متعددة الوسائل           │
└────────┬───────────────────┬──────────────────────────┘
         │                   │
         ▼                   ▼
┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL 16  │  │     Redis 7     │
│   + PostGIS      │  │   (Cache فقط)   │
│   خطوط + محطات   │  │                 │
│   + مسارات       │  │                 │
└─────────────────┘  └─────────────────┘
         ▲
         │
┌────────┴────────────────────────────────────────────┐
│                  🖥️ Dashboard                         │
│             Next.js 15 · Tailwind CSS                 │
│      إدارة محطات + خطوط + مسارات + تصحيحات            │
│           + إعلانات + إحصائيات                        │
└──────────────────────────────────────────────────────┘
```

### تدفق البيانات:

```
مستخدم الهاتف:
  يبحث عن محطات ← REST API → Backend ← PostgreSQL/PostGIS
  يخطط رحلة     ← REST API → Backend ← خوارزمية تخطيط + PostGIS
  يقترح تصحيح   ← REST API → Backend ← community_reports

مدير النظام:
  يدير محطات/خطوط ← Dashboard → REST API → Backend
  يراجع التصحيحات ← Dashboard → REST API → Backend
  يستورد بيانات   ← Dashboard → REST API → Backend

CI/CD → GitHub Actions → Railway + Vercel + EAS
```

---

## 3. إعداد بيئة التطوير

### المتطلبات الأساسية:

| الأداة | الإصدار | للتثبيت |
|--------|--------|---------|
| Node.js | ≥ 22 | [nodejs.org](https://nodejs.org) |
| npm | ≥ 10 | يأتي مع Node.js |
| PostgreSQL | 16 + PostGIS | [postgresql.org](https://postgresql.org) |
| Redis | 7 | [redis.io](https://redis.io) |
| Git | أي إصدار | [git-scm.com](https://git-scm.com) |

### للتطوير على الهاتف:

| الأداة | للتثبيت |
|--------|---------|
| Expo CLI | `npm install -g eas-cli` |
| Android Studio | للـ Android emulator |
| Xcode (Mac فقط) | للـ iOS simulator |

### خطوات الإعداد:

```bash
# 1. استنساخ المشروع
git clone <repo-url> droob
cd droob

# 2. تثبيت حزم الهاتف
cd mobile
npm install
cd ..

# 3. تثبيت حزم لوحة التحكم
cd dashboard
npm install
cd ..

# 4. تثبيت حزم الخادم
cd backend
npm install

# 5. إعداد قاعدة البيانات
cp .env.example .env
# عدّل .env: DATABASE_URL, REDIS_URL, JWT_SECRET

# 6. تشغيل migrations
npx drizzle-kit push

# 7. زرع البيانات الأولية
npx tsx drizzle/seed.ts

cd ..
```

### تشغيل المشروع محلياً:

```bash
# الخادم الخلفي (المنفذ 3000)
cd backend
npm run dev

# لوحة التحكم (المنفذ 3001)
cd dashboard
npm run dev

# تطبيق الهاتف (Expo Go)
cd mobile
npx expo start
```

---

## 4. تطبيق الهاتف (Mobile)

### التقنيات الأساسية:

| التقنية | الإصدار | الغرض |
|---------|--------|-------|
| Expo SDK | 54.0.35 | إطار العمل |
| React Native | 0.81.5 | واجهة المستخدم الأصلية |
| React | 19.1.0 | إطار العمل |
| TypeScript | 5.9.2 | لغة البرمجة |
| React Navigation | 7.x | التنقل بين الشاشات |
| Zustand | 5.x | إدارة الحالة |
| Reanimated | 4.1.6 | الرسوم المتحركة |
| Gesture Handler | 2.28.x | إيماءات اللمس |
| React Native WebView | 13.15.0 | عرض الخرائط (Leaflet) |
| MMKV | 2.12.x | تخزين محلي سريع |
| i18next | 24.x | الترجمة (عربي/إنجليزي) |
| Zod | 3.23.x | التحقق من صحة البيانات |
| Jest | 29.7.x | اختبارات الوحدة |

### هيكل المكونات:

```
App.tsx
  └── ErrorBoundary
      └── GestureHandlerRootView
          └── SafeAreaProvider
              └── NavigationContainer
                  ├── Stack: Onboarding
                  │   └── OnboardingScreen (5 slides)
                  └── Stack: MainTabs
                      ├── Tab: Home → HomeScreen
                      │   ├── ErrorBoundary → LeafletMap (WebView)
                      │   ├── SearchBar
                      │   ├── AlertBanner
                      │   ├── LocationFAB
                      │   └── ErrorBoundary → BottomSheet
                      │       ├── QuickChipsRow
                      │       ├── NearbyStops
                      │       └── StopCards
                      ├── Tab: TripPlanner → TripPlannerScreen
                      │   ├── LocationFields (from/to + swap)
                      │   ├── TimeSelector pills
                      │   ├── PreferenceTabs
                      │   ├── ModeChips
                      │   └── JourneyCards (FlatList)
                      ├── Tab: Departures → DeparturesScreen
                      │   ├── StopHeader
                      │   ├── ModeFilterChips
                      │   ├── DepartureRows (FlatList)
                      │   └── CountdownTimers
                      ├── Stack: RouteDetail → RouteDetailScreen
                      ├── Stack: StopDetail → StopDetailScreen
                      ├── Stack: Search → SearchScreen
                      ├── Stack: JourneyDetail → JourneyDetailScreen
                      ├── Stack: Navigation → NavigationScreen
                      └── Stack: Alerts → AlertsScreen
```

### إضافة شاشة جديدة:

```typescript
// 1. أنشئ الملف: src/screens/NewScreen.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ErrorBoundary } from "@components/ErrorBoundary";
import { colors, fontSize, fontWeight } from "@theme/tokens";

const NewScreen: React.FC = () => (
  <ErrorBoundary>
    <View style={styles.root}>
      <Text style={styles.title}>شاشة جديدة</Text>
    </View>
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  title: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[20], fontWeight: fontWeight.bold },
});

export default NewScreen;

// 2. أضف المسار في AppNavigator.tsx
// 3. أضف النوع في RootStackParamList
```

### قواعد كتابة الكود:

1. **كل شاشة** = ملفوفة بـ `<ErrorBoundary>`
2. **كل التنسيقات** = من `@theme/tokens` فقط (لا ألوان مكتوبة مباشرة)
3. **كل النصوص** = بالعربية افتراضياً مع `fontFamily: "IBM Plex Sans Arabic"`
4. **الاستيراد** = استخدام المسارات المختصرة (`@components`, `@screens`, `@theme`, إلخ)
5. **الأنواع** = من `@/types` أو `@/types/transit` الموحد

---

## 5. لوحة التحكم (Dashboard)

### التقنيات:

| التقنية | الغرض |
|---------|-------|
| Next.js 15 | إطار العمل (App Router) |
| Tailwind CSS 3.4 | التنسيق (RTL، dark mode) |
| TanStack Table v8 | جداول البيانات |
| deck.gl 9 | خرائط WebGL |
| Recharts | رسوم بيانية |
| Framer Motion | حركات |
| Vitest | اختبارات |

### إضافة صفحة جديدة:

```typescript
// 1. أنشئ الملف: src/app/newpage/page.tsx
"use client";

import DashboardShell from "@/components/DashboardShell";

export default function NewPage() {
  return (
    <DashboardShell>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          صفحة جديدة
        </h1>
      </div>
    </DashboardShell>
  );
}

// 2. أضف الرابط في Sidebar.tsx
// 3. أضف دوال API في src/lib/api.ts
// 4. أضف hooks في src/lib/hooks.ts
```

---

## 6. الخادم الخلفي (Backend)

### التقنيات:

| التقنية | الغرض |
|---------|-------|
| Fastify 5 | HTTP server |
| Drizzle ORM 0.33 | Database ORM |
| PostgreSQL 16 + PostGIS | Database |
| Redis 7 | Cache + WebSocket pub/sub |
| Socket.io | Real-time communication |
| JWT | Authentication |
| Zod | Request validation |
| BullMQ | Background jobs |
| Vitest | Testing |

### إضافة API Route جديد:

```typescript
// 1. أنشئ الملف: src/routes/new-feature.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";

export async function newFeatureRoutes(app: FastifyInstance) {
  // GET /api/v1/new-feature
  app.get("/", async (request, reply) => {
    const data = await db.select().from(table);
    return { data };
  });

  // POST /api/v1/new-feature
  app.post("/", async (request, reply) => {
    const body = z.object({ name: z.string() }).parse(request.body);
    const result = await db.insert(table).values(body).returning();
    return { data: result };
  });
}

// 2. سجل المسار في src/server.ts:
// app.register(newFeatureRoutes, { prefix: "/api/v1/new-feature" });
```

---

## 7. قاعدة البيانات

### 20 جدول:

| # | الجدول | الوصف |
|---|--------|-------|
| 1 | `governorates` | 12 محافظة أردنية |
| 2 | `agencies` | شركات النقل |
| 3 | `stops` | محطات الباص (مع PostGIS) |
| 4 | `routes` | خطوط النقل |
| 5 | `route_stops` | ترتيب المحطات على الخط |
| 6 | `schedules` | جداول المواعيد |
| 7 | `trips` | رحلات فعلية |
| 8 | `vehicles` | مركبات |
| 9 | `alerts` | تنبيهات النظام |
| 10 | `users` | المستخدمين |
| 11 | `refresh_tokens` | رموز JWT |
| 12 | `community_reports` | بلاغات المجتمع |
| 13 | `fare_rules` | قواعد الأسعار |
| 14 | `prayer_times` | أوقات الصلاة |
| 15 | `activity_logs` | سجل النشاطات |
| 16 | `device_tokens` 🆕 | push notification tokens |
| 17 | `push_notifications` 🆕 | سجل الإشعارات |
| 18 | `payments` 🆕 | معاملات الدفع |
| 19 | `tickets` 🆕 | تذاكر إلكترونية |
| 20 | `wallet_transactions` 🆕 | محفظة المستخدم |

### إضافة جدول جديد:

```typescript
// في drizzle/schema.ts:
export const newTable = pgTable("new_table", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameAr: text("name_ar").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const newTableRelations = relations(newTable, ({ many }) => ({
  // العلاقات مع الجداول الأخرى
}));
```

---

## 8. API Reference

### Base URL: `https://api.droob.jo/api/v1`

### المصادقة (Auth):

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| POST | `/auth/register` | ❌ | تسجيل مستخدم جديد |
| POST | `/auth/login` | ❌ | تسجيل الدخول |
| POST | `/auth/refresh` | ❌ | تجديد JWT token |
| GET | `/auth/me` | ✅ | معلومات المستخدم الحالي |

### المحطات (Stops):

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/stops` | ❌ | قائمة المحطات |
| GET | `/stops/search?q=` | ❌ | بحث عن محطة |
| GET | `/stops/nearby/:lat/:lng` | ❌ | محطات قريبة |
| GET | `/stops/:id` | ❌ | تفاصيل محطة |
| POST | `/stops` | ❌ | إضافة محطة |
| PATCH | `/stops/:id` | ❌ | تعديل محطة |

### الخطوط (Routes):

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/routes` | ❌ | قائمة الخطوط |
| GET | `/routes/:id` | ❌ | تفاصيل خط |
| GET | `/routes/:id/stops` | ❌ | محطات الخط |
| GET | `/routes/:id/schedule` | ❌ | جدول الخط |

### تخطيط الرحلات (Trip Planner):

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| POST | `/planner` | ❌ | تخطيط رحلة |

```json
// Request:
{
  "fromLat": 31.9539, "fromLng": 35.9106,
  "toLat": 31.9516, "toLng": 35.9335,
  "preference": "fastest",
  "modes": ["city_bus", "brt", "serveece"]
}

// Response:
{
  "journeys": [{
    "id": "j-fast",
    "durationMinutes": 25,
    "fareAmount": 0.75,
    "fareCurrency": "د.أ",
    "legs": [...]
  }]
}
```

### المغادرات (Departures):

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/departures?stopId=` | ❌ | المغادرات من محطة |
| GET | `/departures/route/:routeId` | ❌ | مغادرات خط |

### التنبيهات (Alerts):

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/alerts` | ❌ | قائمة التنبيهات |
| POST | `/alerts` | ❌ | إنشاء تنبيه |
| POST | `/alerts/emergency` | ❌ | بث طارئ |

### المركبات (Vehicles):

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/vehicles` | ✅ | قائمة المركبات |
| POST | `/vehicles/location` | ✅ | تحديث موقع GPS |

### التقارير المجتمعية (Reports):

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/reports` | ❌ | قائمة البلاغات |
| POST | `/reports` | ❌ | إنشاء بلاغ |
| PATCH | `/reports/:id/resolve` | ❌ | حل بلاغ |

### لوحة التحكم (Dashboard):

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/dashboard/kpis` | ✅ | مؤشرات الأداء |
| GET | `/dashboard/hourly-trips` | ✅ | رحلات بالساعة |

---

## 9. أنواع البيانات (Types)

### ملف الأنواع الموحد: `mobile/src/types/index.ts`

```typescript
// 🚌 وسائل النقل (نوع موحد من @theme/tokens)
export type TransitMode = "city_bus" | "brt" | "serveece" | "intercity";

// 📍 محطة
export interface TransitStop {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  lat: number;
  lng: number;
  governorate?: string;
  city?: string;
  modes: TransitMode[];
  isLandmark: boolean;
  isAccessible: boolean;
  distance?: number;
}

// 🗺️ خط نقل
export interface TransitRoute {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  mode: TransitMode;
  color: string;
  agencyId: string;
  originStopId: string;
  destinationStopId: string;
  baseFare: number;
  headwayPeak: number;
  headwayOffPeak: number;
  isActive: boolean;
}

// 🚍 رحلة مخططة
export interface Journey {
  id: string;
  legs: JourneyLeg[];
  durationMinutes: number;
  fareAmount: number;
  fareCurrency: string;
  transferCount: number;
  departureTime: string;
  arrivalTime: string;
}

// 🔄 مرحلة رحلة
export interface JourneyLeg {
  mode: TransitMode | "walking";
  fromStop?: TransitStop;
  toStop?: TransitStop;
  routeCode?: string;
  routeName?: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  instructionsAr: string;
  instructionsEn: string;
}

// ⚠️ تنبيه
export interface TransitAlert {
  id: string;
  titleAr: string;
  messageAr: string;
  severity: "info" | "warning" | "critical";
  type: string;
  affectedRouteIds: string[];
  startAt: string;
  endAt?: string;
}

// 🕐 مغادرة
export interface Departure {
  routeId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  mode: TransitMode;
  waitMinutes: number;
  scheduledTime: string;
  estimatedTime: string;
  occupancy: "low" | "medium" | "high";
  status: "on_time" | "delayed" | "cancelled";
  isAccessible: boolean;
}
```

---

## 10. نظام التصميم (Design Tokens)

### ملف: `mobile/src/theme/tokens.ts`

**القاعدة:** لا تستخدم أبداً ألواناً أو قيماً مكتوبة مباشرة. استخدم tokens فقط.

```typescript
// ✅ صحيح
import { colors, fontSize, fontWeight, spacing, radius, shadows } from "@theme/tokens";
const style = { color: colors.brand_blue, fontSize: fontSize[18], padding: spacing[4] };

// ❌ خطأ
const style = { color: "#1A4F8A", fontSize: 18, padding: 16 };
```

### لوحة الألوان:

| الرمز | القيمة | الاستخدام |
|-------|--------|-----------|
| `brand_blue` | `#1A4F8A` | اللون الرئيسي |
| `brand_green` | `#2E7D32` | اللون الثانوي |
| `gold_accent` | `#C9A84C` | لون التمييز |
| `bus_city` | `#0066CC` | باص مدينة |
| `bus_brt` | `#E60026` | باص سريع |
| `serveece` | `#FF8C00` | سرفيس |
| `intercity` | `#6B21A8` | بين المدن |
| `on_time` | `#16A34A` | في الوقت |
| `delayed` | `#EAB308` | متأخر |
| `cancelled` | `#DC2626` | ملغي |

---

## 11. الاختبارات

### تشغيل الاختبارات:

```bash
# تطبيق الهاتف (Jest)
cd mobile && npm test

# لوحة التحكم (Vitest)
cd dashboard && npm test

# الخادم الخلفي (Vitest)
cd backend && npm test
```

### عتبات التغطية (Coverage Thresholds):

| الطبقة | Branches | Functions | Lines | Statements |
|--------|----------|-----------|-------|------------|
| Mobile | 70% | 70% | 70% | 70% |
| Backend | 50% | 60% | 60% | 60% |
| Dashboard | 50% | 60% | 60% | — |

### كتابة اختبار جديد:

```typescript
// Mobile (Jest + React Native Testing Library):
import { render } from "@testing-library/react-native";
import HomeScreen from "@screens/HomeScreen";

describe("HomeScreen", () => {
  it("renders search bar", () => {
    const { getByPlaceholderText } = render(<HomeScreen />);
    expect(getByPlaceholderText("إلى أين؟")).toBeTruthy();
  });
});

// Backend (Vitest + Fastify):
import { buildTestApp } from "../helpers/test-app";

describe("GET /api/v1/stops", () => {
  it("returns list of stops", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/api/v1/stops" });
    expect(res.statusCode).toBe(200);
  });
});

// Dashboard (Vitest + Testing Library):
import { render, screen } from "@testing-library/react";
import Home from "../app/page";

describe("Dashboard", () => {
  it("renders KPIs", () => {
    render(<Home />);
    expect(screen.getByText("مركبات")).toBeTruthy();
  });
});
```

---

## 12. CI/CD

### CI Pipeline (`.github/workflows/ci.yml`):

```
Push/PR to main:
├── Backend Job
│   ├── npm ci
│   ├── TypeScript check
│   ├── Lint
│   ├── DB Migration (test)
│   └── Run Tests
├── Dashboard Job
│   ├── npm ci
│   ├── TypeScript check
│   ├── Lint
│   ├── Run Tests  🆕
│   └── Build check
└── Mobile Job  🆕
    ├── npm ci
    ├── TypeScript check
    ├── Lint
    └── Run Tests
```

### Deploy Pipeline (`.github/workflows/deploy.yml`):

```
Push to main / Manual:
├── Validate Secrets
├── Backup Database
├── Deploy Backend → Railway
├── Deploy Dashboard → Vercel
├── Build Mobile → EAS Build
│   ├── Typecheck  🆕
│   ├── Lint  🆕
│   ├── Tests  🆕
│   └── eas build
└── Sync GTFS (Monday cron)
```

### Weekly E2E (`.github/workflows/e2e.yml`): 🆕

```
Monday 7:57 AM UTC:
├── Mobile E2E (Detox)
├── Backend Integration Tests
└── Summary Report
```

---

## 13. النشر (Deployment)

### البنية الإنتاجية:

```
┌────────────────────────────────────────────────────┐
│  📱 Mobile App                                      │
│  EAS Build → Google Play + App Store                │
│  Updates: expo-updates (OTA)                        │
├────────────────────────────────────────────────────┤
│  🖥️ Dashboard                                       │
│  Vercel (Next.js)                                   │
│  Domain: dashboard.droob.jo                         │
├────────────────────────────────────────────────────┤
│  🗄️ Backend API                                     │
│  Railway (Docker)                                   │
│  Domain: api.droob.jo                               │
│  ┌─────────────┐  ┌─────────────┐                  │
│  │ PostgreSQL  │  │   Redis     │                   │
│  │ Railway DB  │  │ Railway     │                   │
│  └─────────────┘  └─────────────┘                  │
└────────────────────────────────────────────────────┘
```

### أوامر النشر:

```bash
# Backend → Railway
cd backend
railway up

# Dashboard → Vercel (تلقائي عند push)
git push origin main

# Mobile → EAS Build
cd mobile
eas build -p android --profile production
eas build -p ios --profile production
```

---

## 14. المساهمة في المشروع

### سير العمل:

```
١. اعمل branch جديد: git checkout -b feature/xxx
٢. اكتب الكود
٣. اكتب الاختبارات
٤. تأكد: npm test, npm run typecheck, npm run lint
٥. اعمل commit: git commit -m "feat: description"
٦. ارفع: git push origin feature/xxx
٧. اعمل Pull Request
٨. انتظر مرور CI/CD
٩. دمج في main
```

### تنسيق commit messages:

```
feat:    ميزة جديدة
fix:     إصلاح خطأ
docs:    توثيق
style:   تنسيق (ليس له تأثير وظيفي)
refactor:إعادة هيكلة
test:    إضافة أو تعديل اختبارات
chore:   مهام روتينية (تحديث حزم، إلخ)
```

### جهات الاتصال:

- **المطور الرئيسي:** Jad Albara
- **البريد:** jadjbara3@gmail.com
- **المشروع:** [GitHub](https://github.com/jad-dev/droob)
- **المعرض:** [Expo](https://expo.dev/accounts/jad.dev/projects/droob)

---

> **دروب — منصة النقل العام الذكية في الأردن. ابنِ معنا! 🇯🇴🚀**
