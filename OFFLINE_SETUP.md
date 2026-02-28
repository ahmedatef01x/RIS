# دليل تشغيل نظام RIS محلياً (Offline)

## نظرة عامة

هذا الدليل يشرح كيفية تشغيل نظام معلومات الأشعة (RIS) على جهازك المحلي بدون اتصال بالإنترنت باستخدام SQL Server.

## المتطلبات

### 1. البرامج المطلوبة

- **Node.js** v18 أو أحدث - [تحميل](https://nodejs.org/)
- **SQL Server** 2019 أو أحدث - [تحميل Express المجاني](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
- **SQL Server Management Studio (SSMS)** - [تحميل](https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms)

### 2. متطلبات النظام

- Windows 10/11 أو Windows Server
- 4GB RAM على الأقل
- 10GB مساحة قرص صلب

## خطوات التثبيت

### الخطوة 1: تثبيت SQL Server Express

1. قم بتحميل SQL Server Express من الرابط أعلاه
2. اختر "Basic" أثناء التثبيت
3. احفظ اسم السيرفر (عادة `localhost\SQLEXPRESS`)

### الخطوة 2: إنشاء قاعدة البيانات

1. افتح SSMS واتصل بـ SQL Server
2. افتح ملف `local-backend/database/schema.sql`
3. نفذ الأوامر لإنشاء قاعدة البيانات والجداول

أو استخدم الأمر:
```sql
CREATE DATABASE RIS_System;
```

ثم نفذ باقي الأوامر من الملف.

### الخطوة 3: إعداد Backend

```bash
# انتقل لمجلد Backend
cd local-backend

# ثبت المكتبات
npm install

# انسخ ملف الإعدادات
copy .env.example .env
```

### الخطوة 4: تعديل إعدادات الاتصال

افتح ملف `local-backend/.env` وعدل الإعدادات:

```env
# إعدادات SQL Server
DB_SERVER=localhost\SQLEXPRESS
DB_DATABASE=RIS_System
DB_USER=sa
DB_PASSWORD=كلمة_السر
DB_PORT=1433

# إعدادات JWT
JWT_SECRET=your_very_long_and_secure_secret_key_here_make_it_random
JWT_EXPIRES_IN=24h

# منفذ الخادم
PORT=3001
```

### الخطوة 5: تشغيل Backend

```bash
cd local-backend
npm run dev
```

سيعمل الخادم على: `http://localhost:3001`

### الخطوة 6: تشغيل Frontend

في نافذة أخرى:

```bash
# في المجلد الرئيسي للمشروع
npm install
npm run dev
```

سيعمل الموقع على: `http://localhost:5173`

### الخطوة 7: إعداد أول مستخدم Admin

1. سجل حساب جديد من صفحة `/auth`
2. من SSMS، نفذ:

```sql
USE RIS_System;

-- أضف صلاحية Admin للمستخدم الأول
INSERT INTO user_roles (user_id, role)
SELECT TOP 1 id, 'admin' FROM users;
```

## التبديل بين Online و Offline

### للعمل Offline (SQL Server محلي):

أضف في ملف `.env` الخاص بالـ Frontend:

```env
VITE_USE_LOCAL_API=true
VITE_API_URL=http://localhost:3001/api
```

### للعمل Online (Supabase):

```env
VITE_USE_LOCAL_API=false
```

## استكشاف الأخطاء

### خطأ في الاتصال بـ SQL Server

1. تأكد أن خدمة SQL Server تعمل
2. افتح "SQL Server Configuration Manager"
3. فعّل TCP/IP في Network Configuration
4. أعد تشغيل الخدمة

### خطأ في تسجيل الدخول

1. تأكد من صحة اسم المستخدم وكلمة السر
2. في SSMS: Security > Logins > تأكد من تفعيل SQL Server Authentication

### خطأ CORS

تأكد من تشغيل Backend قبل Frontend.

## البنية النهائية

```
RIS-System/
├── local-backend/           # خادم Node.js
│   ├── database/
│   │   └── schema.sql       # قاعدة البيانات
│   ├── src/
│   │   ├── routes/          # نقاط API
│   │   ├── middleware/      # التحقق من الهوية
│   │   └── index.js         # الملف الرئيسي
│   ├── .env                 # إعدادات الخادم
│   └── package.json
│
├── src/                     # Frontend React
│   ├── lib/
│   │   └── api.ts          # عميل API
│   └── ...
│
└── OFFLINE_SETUP.md        # هذا الملف
```

## الدعم

إذا واجهت أي مشاكل، تأكد من:
1. تشغيل SQL Server
2. تشغيل Backend أولاً
3. صحة إعدادات الاتصال في `.env`
