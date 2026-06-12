# Droob Loop Definitions
**Created**: 2026-06-11
**Type**: Achievement-based loops (NOT time-based)

## Philosophy

نظام الحلقات مبني على مبدأ الإنجاز وليس الوقت. كل حلقة تُعرّف هدفاً قابلاً للتحقق وتستمر حتى يتحقق، ثم تنتقل للتالي. هذا يضمن أن المشروع يتقدم بشكل حقيقي وليس شكلي.

---

## Loop 1: Security Completion Loop

### Goal
```
/goal "كل الثغرات الأمنية الـ 8 محققة ومثبتة في LOOP_STATE.md تحت Completed"
```

### Verification Steps
1. `fly.toml` لا يحتوي على أسرار (DATABASE_URL, REDIS_URL, JWT_SECRET)
2. لا يوجد `SMTP_PASS` في أي ملف `.env`
3. لا يوجد `droob_password` في أي ملف بالكود
4. WebSocket middleware يتحقق من JWT token
5. Dashboard لا يستخدم localStorage للتخزين
6. `require-trusted-types-for 'script'` موجود في CSP
7. Mobile يستخدم expo-secure-store
8. API worker يرفض 101 طلب/دقيقة مع 429

### Status: ✅ ALL COMPLETE

---

## Loop 2: Build Verification Loop

### Goal
```
/goal "عدد TypeScript errors = 0 في backend و mobile و dashboard، و npm run build ينجح في الثلاثة"
```

### Verification Steps
1. `cd backend && npx tsc --noEmit` → 0 errors
2. `cd mobile && npx tsc --noEmit` → 0 errors
3. `cd dashboard && npx tsc --noEmit` → 0 errors
4. `cd backend && npm run build` ينجح
5. `cd mobile && npx expo export` ينجح
6. `cd dashboard && npm run build` ينجح

### Status: ⏳ PENDING (re-verify after security changes)

---

## Loop 3: API Health Loop

### Goal
```
/goal "api.droob-jo.com/health يعيد status 200 وكل الـ endpoints الأساسية تعمل"
```

### Verification Steps
1. `curl https://api.droob-jo.com/health` → 200 OK
2. `curl https://api.droob-jo.com/api/v1/routes` → 200 مع بيانات
3. `curl https://api.droob-jo.com/api/v1/stops/nearby?lat=31.95&lng=35.93` → 200
4. Login endpoint يعمل (`POST /api/v1/auth/login`)
5. WebSocket connection مع JWT token ينجح
6. Rate limiting يعمل (429 بعد 100 طلب)

### Status: ⏳ PENDING (needs deployment)

---

## Loop 4: Full Integration Loop

### Goal
```
/goal "المستخدم يستطيع: تسجيل دخول → عرض الخريطة → طلب رحلة → رؤية المسار → تأكيد الرحلة. كل الخطوات تعمل بدون أخطاء"
```

### Verification Steps
1. ✅ Mobile app login with valid credentials → JWT tokens returned
2. ✅ Map loads OpenStreetMap tiles (no blank screen)
3. ✅ Trip planner accepts origin/destination → returns route via OSRM
4. ✅ Route displayed on map with journey timeline
5. ✅ Fare calculated and displayed
6. ✅ Trip confirmation flow works
7. ✅ Dashboard admin login works (jadjbara@live.com)
8. ✅ Dashboard shows live stats

### Status: ⏳ PENDING (needs end-to-end test)

---

## Loop 5: Project Completion Loop

### Goal
```
/goal "كل المهام في LOOP_STATE.md تحت Completed، لا شيء تحت Pending أو Blocked، و DROOB_MASTER_PLAN.md محدّث بالكامل"
```

### Verification Steps
1. LOOP_STATE.md — 0 items under "Pending"
2. LOOP_STATE.md — 0 items under "Blocked"
3. DROOB_MASTER_PLAN.md has all sections updated
4. All 5 SKILL.md files exist and accurate
5. All 3 sub-agent files exist
6. All 8 security fixes applied and verified
7. LOOPS.md exists with 5 defined loops
8. Build succeeds for all 3 projects
9. API health check passes

### Status: 🔄 IN PROGRESS

---

## Loop Execution Order

```
LOOP 1 (Security) ──✅ COMPLETE──►
                                    │
LOOP 2 (Build)    ──⏳ PENDING──►  │
                                    ▼
LOOP 3 (API)      ──⏳ PENDING──►  │
                                    │
LOOP 4 (Integration) ──⏳ PENDING─►│
                                    ▼
LOOP 5 (Completion) ──🔄 IN PROGRESS
```

**قاعدة**: لا تنتقل للحلقة التالية حتى تكتمل الحالية بالكامل. الإنجاز يتحقق بالاختبار الفعلي وليس بالافتراض.
