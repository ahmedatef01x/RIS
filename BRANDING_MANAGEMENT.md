# صفحة إدارة العلامة التجارية والصور

## نظرة عامة
تم تطوير نظام شامل لإدارة العلامة التجارية والصور والمعلومات الأساسية للمركز، يمكّن المسؤولين من:
- تحديث معلومات المركز (الاسم، العنوان، الهاتف، البريد الإلكتروني)
- إدارة الألوان الأساسية والثانوية للموقع
- رفع وإدارة الشعارات (Logo)
- إنشاء معرض صور متقدم مع تصنيفات
- مراقبة وتنظيم جميع الصور المستخدمة في الموقع

## المميزات الرئيسية

### 1. إدارة المعلومات الأساسية
- **اسم المركز**: يدعم اللغة العربية والإنجليزية
- **العنوان والتفاصيل**: الهاتف، البريد الإلكتروني، الموقع الإلكتروني
- **النصوص الإضافية**: نص التذييل ونص "عن المركز"
- **الألوان المخصصة**: منتقي ألوان لتخصيص الواجهة

### 2. معرض الصور
- رفع صور بسهولة من خلال واجهة Drag & Drop
- تصنيف الصور (أجهزة، منشأة، فريق، أخرى)
- إضافة عنوان ووصف لكل صورة
- حذف الصور غير المستخدمة
- معاينة الصور بشكل مباشر

### 3. إدارة الشعارات
- تخزين مسار الشعار الرئيسي
- شعار منفصل للأجهزة المحمولة
- إدارة الـ Favicon

## البنية التكنولوجية

### قاعدة البيانات
تم إنشاء جدولين جديدين:

#### جدول `branding`
```sql
CREATE TABLE branding (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    clinic_name NVARCHAR(255) NOT NULL,           -- اسم المركز بالعربية
    clinic_name_en NVARCHAR(255),                 -- اسم المركز بالإنجليزية
    logo_path NVARCHAR(500),                      -- مسار الشعار الرئيسي
    logo_mobile_path NVARCHAR(500),               -- شعار الجوال
    favicon_path NVARCHAR(500),                   -- Favicon
    hero_image_path NVARCHAR(500),                -- صورة البطل
    primary_color NVARCHAR(10),                   -- اللون الأساسي (HEX)
    secondary_color NVARCHAR(10),                 -- اللون الثانوي (HEX)
    address NVARCHAR(500),                        -- العنوان
    phone NVARCHAR(50),                           -- رقم الهاتف
    email NVARCHAR(255),                          -- البريد الإلكتروني
    website NVARCHAR(255),                        -- الموقع الإلكتروني
    footer_text NVARCHAR(MAX),                    -- نص التذييل
    about_text NVARCHAR(MAX),                     -- نص عن المركز
    updated_by UNIQUEIDENTIFIER,                  -- آخر من قام بالتحديث
    created_at DATETIME2,                         -- تاريخ الإنشاء
    updated_at DATETIME2                          -- تاريخ آخر تحديث
);
```

#### جدول `media_gallery`
```sql
CREATE TABLE media_gallery (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    title NVARCHAR(255) NOT NULL,                 -- عنوان الصورة
    description NVARCHAR(MAX),                    -- وصف الصورة
    image_path NVARCHAR(500) NOT NULL,            -- مسار الصورة
    thumbnail_path NVARCHAR(500),                 -- مسار الصورة المصغرة
    category NVARCHAR(100),                       -- الفئة (equipment, facility, team, other)
    display_order INT,                            -- ترتيب العرض
    is_active BIT,                                -- هل الصورة مفعلة
    uploaded_by UNIQUEIDENTIFIER,                 -- من قام برفع الصورة
    created_at DATETIME2,                         -- تاريخ الرفع
    updated_at DATETIME2                          -- تاريخ آخر تحديث
);
```

### API Endpoints

#### الـ Branding Routes (`/api/branding`)
- **GET /api/branding** - جلب معلومات المركز الحالية
- **PUT /api/branding** - تحديث معلومات المركز

#### الـ Media Routes (`/api/media`)
- **GET /api/media** - جلب قائمة الصور
- **POST /api/media** - رفع صورة جديدة
- **DELETE /api/media/:id** - حذف صورة
- **PUT /api/media/order/:id** - تحديث ترتيب العرض

### المكونات الواجهة (Frontend Components)

#### `BrandingSettings.tsx`
يقع في: `src/pages/BrandingSettings.tsx`

**المسؤوليات:**
1. عرض معلومات المركز الحالية
2. واجهة تعديل المعلومات في Dialog
3. عرض معرض الصور
4. واجهة رفع صور جديدة
5. إدارة حذف الصور

**الحالات:**
- `branding`: معلومات المركز الحالية
- `media`: قائمة الصور
- `loading`: حالة التحميل
- `editDialogOpen`: حالة فتح dialog التعديل
- `uploadDialogOpen`: حالة فتح dialog الرفع
- `formData`: بيانات نموذج التعديل
- `mediaFormData`: بيانات نموذج الرفع

**الدوال الرئيسية:**
- `fetchBranding()`: جلب معلومات المركز
- `fetchMedia()`: جلب قائمة الصور
- `handleSaveBranding()`: حفظ تعديلات المركز
- `handleUploadMedia()`: رفع صورة جديدة
- `handleDeleteMedia()`: حذف صورة
- `handleFileUpload()`: معالجة اختيار ملف

### التكامل مع النظام

#### إضافة الـ Route
تمت إضافة Route جديد في `src/App.tsx`:
```tsx
<Route 
  path="/admin/branding" 
  element={
    <ProtectedRoute requiredPage="branding">
      <MainLayout>
        <BrandingSettings />
      </MainLayout>
    </ProtectedRoute>
  } 
/>
```

#### تسجيل الـ Routes في الباكند
تم تحديث `local-backend/src/index.js`:
```javascript
const brandingRoutes = require('./routes/branding');
app.use('/api/branding', brandingRoutes);
```

#### إضافة للـ Sidebar
تم تحديث `src/components/layout/Sidebar.tsx` لإضافة عنصر جديد:
```tsx
{ 
  id: 'branding', 
  icon: Palette, 
  label: "Branding Settings", 
  labelAr: "إدارة العلامة التجارية", 
  path: "/admin/branding" 
}
```

## كيفية الاستخدام

### الوصول إلى الصفحة
1. الدخول إلى النظام كمسؤول (Admin)
2. النقر على "إدارة العلامة التجارية" من القائمة الجانبية
3. أو الذهاب مباشرة إلى: `/admin/branding`

### تحديث معلومات المركز
1. انقر على زر "تعديل" في بطاقة معلومات المركز
2. قم بتحديث البيانات المطلوبة:
   - اسم المركز (عربي/إنجليزي)
   - العنوان والهاتف والبريد
   - الألوان المخصصة
   - النصوص الإضافية
3. انقر "حفظ التغييرات"

### رفع صور جديدة
1. انقر على زر "رفع صورة" في معرض الصور
2. أدخل بيانات الصورة:
   - عنوان الصورة
   - الفئة (أجهزة/منشأة/فريق/أخرى)
   - وصف اختياري
3. اختر الصورة من الجهاز
4. انقر "رفع"

### حذف صور
1. مرر الماوس على الصورة في المعرض
2. انقر على أيقونة الحذف (سلة القمامة)
3. سيتم حذف الصورة فوراً

## الأمان والأذونات

### مستويات الوصول
- **الوصول**: مسؤول فقط (Admin)
- **التحقق**: يتم التحقق من JWT Token
- **التصريح**: يتم التحقق من دور المستخدم

### معالجة الأخطاء
- التحقق من صحة البيانات قبل الإرسال
- عرض رسائل خطأ واضحة للمستخدم
- Timeout للطلبات (10 ثوان)

## الميزات المستقبلية المحتملة

1. **تحسينات الصور:**
   - ضغط تلقائي للصور
   - توليد صور مصغرة (Thumbnails)
   - دعم WebP والصور الحديثة

2. **التخزين:**
   - خيارات التخزين السحابي (AWS S3، Azure)
   - نسخ احتياطي تلقائي

3. **الإدارة المتقدمة:**
   - السحب والإفلات لإعادة الترتيب
   - تحرير الصور مباشرة
   - استخدام الصور الموصى به

4. **التحليلات:**
   - عدد مرات استخدام الصور
   - إحصائيات الصور الأكثر استخداماً
   - تحليل أداء الصور

## ملفات الكود المتعلقة

```
src/
  ├── pages/
  │   └── BrandingSettings.tsx (صفحة الإدارة)
  ├── components/
  │   └── layout/
  │       └── Sidebar.tsx (تحديث الملاحة)
  ├── App.tsx (إضافة Route)
  └── lib/
      └── api.ts (استدعاءات API)

local-backend/
  ├── src/
  │   ├── index.js (تسجيل Routes)
  │   └── routes/
  │       └── branding.js (API Endpoints)
  └── migrations/
      └── add_branding_table.sql (مخطط قاعدة البيانات)
```

## الملاحظات المهمة

1. **الصور:**
   - يتم تخزين الصور كـ Base64 في البداية (يمكن تحسينها لاحقاً)
   - تدعم جميع صيغ الصور الشائعة (JPG, PNG, WebP, SVG)

2. **الأداء:**
   - يتم تحميل البيانات عند فتح الصفحة
   - الحد الأقصى للطلب: 10 ثوان

3. **التوافقية:**
   - يدعم اللغة العربية بشكل كامل
   - واجهة مستجيبة لجميع الأجهزة

## مثال على الاستخدام

```typescript
// جلب معلومات المركز
const token = localStorage.getItem('auth_token');
const response = await fetch('http://localhost:3001/api/branding', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
const branding = await response.json();

// تحديث معلومات المركز
await fetch('http://localhost:3001/api/branding', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    clinic_name: 'مركز الأشعة الحديث',
    clinic_name_en: 'Modern Radiance Center',
    primary_color: '#FF6B6B',
  }),
});
```

## الخلاصة

تم تطوير نظام متكامل لإدارة العلامة التجارية والصور يوفر:
- ✅ واجهة سهلة الاستخدام
- ✅ إدارة شاملة للصور والمعلومات
- ✅ أمان عالي والتحقق من الأذونات
- ✅ قابلية للتوسع والتحسينات المستقبلية
- ✅ دعم كامل للغة العربية
