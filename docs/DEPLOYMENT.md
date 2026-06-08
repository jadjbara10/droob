# 🚀 دروب Droob — خطة النشر الكاملة

## 📋 حالة النشر الحالية

| العنصر | الحالة |
|--------|--------|
| 🏪 حساب Google Play | ⏳ قيد المراجعة |
| 🌐 الدومين `droob-jo.com` | ✅ تم الشراء من Namecheap |
| 📱 نسخة التطبيق | 1.0.0 — جاهز للبناء |
| 🔒 سياسة الخصوصية | ✅ جاهزة (`docs/privacy/index.html`) |

---

## 🔧 الخطوة 1: استضافة الخلفية (Railway — الخيار الأرخص)

### أ. إنشاء حساب Railway
1. افتح https://railway.app
2. سجل دخول بحساب GitHub
3. اربط بطاقة دفع (لن يتم الخصم إلا بعد تجاوز الحد المجاني $5)

### ب. نشر قاعدة البيانات
```bash
# من لوحة Railway:
1. اضغط New → Database → PostgreSQL
2. انسخ DATABASE_URL الناتج
3. الصقها في .env.production مكان DATABASE_URL
```

### ج. نشر الـ API
```bash
# من مجلد المشروع:
cd D:\trans_app\droob\backend

# تثبيت Railway CLI (مرة واحدة):
npm i -g @railway/cli

# تسجيل الدخول:
railway login

# ربط المشروع:
railway link

# نشر الخلفية:
railway up
```

### د. إعداد المتغيرات البيئية في Railway
اذهب إلى Dashboard → Project → Variables وأضف كل المتغيرات من ملف `.env.production`

---

## 🔧 الخطوة 2: ربط الدومين

### في Namecheap:
1. ادخل على لوحة تحكم الدومين droob-jo.com
2. اذهب إلى Advanced DNS
3. أضف السجلات التالية:

| النوع | المضيف | القيمة |
|-------|--------|--------|
| CNAME | `api` | `droob-api.railway.app` (أو الرابط اللي يعطيك Railway) |
| CNAME | `admin` | `droob-dashboard.vercel.app` (بعد نشر الداشبورد) |
| A | `@` | (IP الخادم إذا استخدمت استضافة ثابتة) |

---

## 🔧 الخطوة 3: نشر الداشبورد (Vercel — مجاني)

```bash
cd D:\trans_app\droob\dashboard

# تثبيت Vercel CLI:
npm i -g vercel

# نشر:
vercel --prod

# بعد النشر، اربط الدومين:
# Vercel Dashboard → Settings → Domains → أضف admin.droob-jo.com
```

---

## 🔧 الخطوة 4: بناء التطبيق ورفعه للمتجر

### أ. توليد مفاتيح JWT قوية
```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

### ب. تحديث متغيرات EAS
```bash
# تعيين متغيرات البيئة للإنتاج:
eas secret:create --scope project SECRET_JWT_SECRET --value "الناتج من الأمر أعلاه"
eas secret:create --scope project SECRET_API_URL --value "https://api.droob-jo.com"
```

### ج. بناء نسخة الإنتاج
```bash
cd D:\trans_app\droob\mobile

# بناء AAB للمتجر:
eas build --platform android --profile production

# رفع مباشر للمتجر:
eas submit --platform android
```

---

## 🔧 الخطوة 5: استضافة سياسة الخصوصية

ارفع ملف `docs/privacy/index.html` إلى:
- **GitHub Pages** (مجاني): أنشئ مستودع `droob-jo/droob-jo.github.io` وارفع الملف
- **Vercel** (مجاني): `vercel deploy docs/privacy/index.html`
- **Netlify** (مجاني): اسحب ملف index.html إلى https://app.netlify.com/drop

الرابط النهائي يجب أن يكون: `https://droob-jo.com/privacy`

---

## 💰 ملخص التكاليف الشهرية

| الخدمة | التكلفة |
|--------|---------|
| Railway (API + DB + Redis) | ~$15-20/شهر |
| Vercel (Dashboard) | مجاني |
| GitHub Pages (سياسة الخصوصية) | مجاني |
| EAS Build | مجاني (30 build/شهر) |
| **المجموع** | **~$15-20/شهر** |

### بدائل للتوفير:
- **Render** بدل Railway: مجاني لكن الخادم بينام بعد 15 دقيقة inactivity
- **Neon** بدل Railway PG: PostgreSQL مجاني 0.5GB
- **Upstash** بدل Railway Redis: Redis مجاني 256MB
- **Fly.io** (مجاني 3 VMs صغيرة)

---

## ✅ قائمة التدقيق النهائية قبل النشر

- [ ] حساب Google Play مفعل
- [ ] الخلفية منشورة على Railway والدومين مربوط
- [ ] قاعدة البيانات مهيأة بالبيانات (تشغيل السكربتات)
- [ ] CORS مضبوط للإنتاج
- [ ] JWT_SECRET وجميع كلمات المرور قوية
- [ ] سياسة الخصوصية منشورة ورابطها شغال
- [ ] أيقونة التطبيق 1024×1024 مرفوعة
- [ ] لقطات الشاشة 8+ مرفوعة
- [ ] وصف المتجر مكتوب (عربي + إنجليزي)
- [ ] نسخة AAB مبنية وجاهزة للرفع
- [ ] اختبار التطبيق على جهاز حقيقي
