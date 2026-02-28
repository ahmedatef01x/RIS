# Names Dictionary - Visual User Guide

## Registration Form Layout

```
┌─────────────────────────────────────────────────────────┐
│                   تسجيل المرضى                          │
│              Patient Registration Form                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  البيانات الشخصية (Personal Information)              │
│                                                          │
│  MRN Field        │  العنوان  [MRN-123456]             │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ الاسم بالعربية *                                │   │
│  │ [أدخل الاسم بالعربية____________]              │   │
│  │                                                 │   │
│  │ ▼ اختيار من القائمة:                            │   │
│  │   • محمد → Muhammad                            │   │
│  │   • محمود → Mahmoud                            │   │
│  │   • محمد علي → Muhammad Ali                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  الاسم بالإنجليزية [Muhammad] ← (Auto-filled)        │
│                                                          │
│  العمر [___]  النوع [ذكر/أنثى]  رقم الهاتف [_____]   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ [إلغاء]                        [تسجيل المريض]   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Feature Flow - Happy Path

```
╔═══════════════════════════════════════════════════════════╗
║  User Types "محمد" in Arabic Name Field                  ║
╚═══════════════════════════════════════════════════════════╝
                          ↓
╔═══════════════════════════════════════════════════════════╗
║  System Searches Dictionary (LIKE %محمد%)                ║
║  → Finds: محمد, محمود, محمد علي                        ║
╚═══════════════════════════════════════════════════════════╝
                          ↓
╔═══════════════════════════════════════════════════════════╗
║  Dropdown Appears with Suggestions:                       ║
║  • محمد → Muhammad                                       ║
║  • محمود → Mahmoud                                       ║
║  • محمد علي → Muhammad Ali                              ║
╚═══════════════════════════════════════════════════════════╝
                          ↓
╔═══════════════════════════════════════════════════════════╗
║  User Clicks "محمد"                                      ║
╚═══════════════════════════════════════════════════════════╝
                          ↓
╔═══════════════════════════════════════════════════════════╗
║  Fields Auto-Populated:                                   ║
║  Arabic: محمد                                            ║
║  English: Muhammad ✓ (Auto-filled)                       ║
╚═══════════════════════════════════════════════════════════╝
                          ↓
╔═══════════════════════════════════════════════════════════╗
║  User Continues & Clicks "تسجيل المريض"                 ║
║  → Patient Saved with: "محمد (Muhammad)"                 ║
╚═══════════════════════════════════════════════════════════╝
```

## Feature Flow - New Name Path

```
╔═══════════════════════════════════════════════════════════╗
║  User Types "علاء" (Not in Dictionary)                  ║
╚═══════════════════════════════════════════════════════════╝
                          ↓
╔═══════════════════════════════════════════════════════════╗
║  System Searches → No Suggestions Found                   ║
╚═══════════════════════════════════════════════════════════╝
                          ↓
╔═══════════════════════════════════════════════════════════╗
║  User Presses TAB or Clicks Elsewhere                     ║
║  → Exact Lookup: "علاء" → NOT FOUND                     ║
╚═══════════════════════════════════════════════════════════╝
                          ↓
╔═══════════════════════════════════════════════════════════╗
║  ┌─────────────────────────────────────────────────┐     ║
║  │  إضافة اسم جديد (Add New Name)                 │     ║
║  ├─────────────────────────────────────────────────┤     ║
║  │  لم نجد "علاء" في القاموس                      │     ║
║  │  يرجى إضافة الترجمة الإنجليزية                │     ║
║  ├─────────────────────────────────────────────────┤     ║
║  │  الاسم بالعربية:                                │     ║
║  │  [علاء] (Disabled)                             │     ║
║  │                                                 │     ║
║  │  الاسم بالإنجليزية:                             │     ║
║  │  [_________________] ← (Focus cursor here)     │     ║
║  │                                                 │     ║
║  │  [إلغاء]            [إضافة الاسم]             │     ║
║  └─────────────────────────────────────────────────┘     ║
╚═══════════════════════════════════════════════════════════╝
                          ↓
╔═══════════════════════════════════════════════════════════╗
║  User Enters "Alaa" & Clicks "إضافة الاسم"              ║
╚═══════════════════════════════════════════════════════════╝
                          ↓
╔═══════════════════════════════════════════════════════════╗
║  POST /api/names                                          ║
║  { "arabicName": "علاء", "englishName": "Alaa" }        ║
╚═══════════════════════════════════════════════════════════╝
                          ↓
╔═══════════════════════════════════════════════════════════╗
║  ✓ Name Saved to Database                                ║
║  ✓ Dialog Closes                                          ║
║  ✓ English Field Auto-Fills: "Alaa"                      ║
║  ✓ Toast: "تم إضافة الاسم إلى القاموس"                 ║
╚═══════════════════════════════════════════════════════════╝
                          ↓
╔═══════════════════════════════════════════════════════════╗
║  User Continues & Submits Form                            ║
║  → Patient Saved with: "علاء (Alaa)"                    ║
║  → Next time "علاء" typed → Auto-fills from dictionary! ║
╚═══════════════════════════════════════════════════════════╝
```

## API Response Examples

### Successful Fuzzy Search
```
Request:
GET /api/names/search?q=محمد

Response (200 OK):
[
  { "id": 1, "arabicName": "محمد", "englishName": "Muhammad" },
  { "id": 10, "arabicName": "محمود", "englishName": "Mahmoud" },
  { "id": 18, "arabicName": "محمد علي", "englishName": "Muhammad Ali" }
]
```

### Exact Match Found
```
Request:
GET /api/names/lookup/محمد

Response (200 OK):
{ "id": 1, "arabicName": "محمد", "englishName": "Muhammad" }
```

### Exact Match Not Found
```
Request:
GET /api/names/lookup/علاء

Response (404 Not Found):
{ "found": false }
```

### Successfully Add New Name
```
Request:
POST /api/names
Body: { "arabicName": "علاء", "englishName": "Alaa" }

Response (201 Created):
{
  "id": 51,
  "arabicName": "علاء",
  "englishName": "Alaa",
  "message": "Name added to dictionary successfully"
}
```

### Duplicate Name Error
```
Request:
POST /api/names
Body: { "arabicName": "محمد", "englishName": "Mohammad" }

Response (409 Conflict):
{ "error": "This Arabic name already exists in the dictionary" }
```

## Database Structure

```
NamesDictionary Table
├── id (INT, Primary Key, Auto-increment)
├── arabicName (NVARCHAR(100), NOT NULL, UNIQUE)
├── englishName (NVARCHAR(100), NOT NULL)
└── createdAt (DATETIME, Default: Current Time)

Index:
└── IX_arabicName (on arabicName column)

Constraint:
└── UQ_arabicName (UNIQUE on arabicName)
```

## Dropdown Behavior

```
┌─ User Types ──┐
│               ↓
│   "محمد"
│
│   ▼ DROPDOWN APPEARS
│   ┌──────────────────────┐
│   │ محمد → Muhammad      │  ← Click to select
│   │ محمود → Mahmoud      │  ← Click to select
│   │ محمد علي 
→ Muhammad Ali │  ← Click to select
│   └──────────────────────┘
│
│   Fields Update:
│   Arabic: محمد
│   English: Muhammad
└─ Dropdown Closes
```

## Auto-Fill Behavior

```
Scenario 1: NAME FOUND IN DICTIONARY
┌─────────────────────────────────┐
│ Arabic Name Input: محمد         │
│ (User presses Tab)              │
├─────────────────────────────────┤
│ ↓ System looks up: محمد         │
│ ↓ Found! Returns: Muhammad      │
│ ↓ Auto-fills English field      │
├─────────────────────────────────┤
│ English Name: Muhammad          │
│ ✓ Ready to submit!              │
└─────────────────────────────────┘

Scenario 2: NAME NOT IN DICTIONARY
┌─────────────────────────────────┐
│ Arabic Name Input: علاء          │
│ (User presses Tab)              │
├─────────────────────────────────┤
│ ↓ System looks up: علاء         │
│ ↓ Not found! Show dialog        │
│ ↓ User enters: Alaa             │
│ ↓ Save to database              │
├─────────────────────────────────┤
│ English Name: Alaa              │
│ ✓ Ready to submit!              │
│ + Name now in dictionary!       │
└─────────────────────────────────┘
```

## User Interaction Timeline

```
Time │ User Action           │ System Response
─────┼──────────────────────┼──────────────────────────────────
0s   │ Click Arabic field   │ Input focused
1s   │ Type: "م"            │ Nothing yet (too short)
2s   │ Type: "محمد"         │ API call: /api/names/search?q=محمد
3s   │ (waiting)            │ Dropdown appears with 3 suggestions
4s   │ Click: محمد          │ English field auto-fills: Muhammad
5s   │ Tab to phone field   │ Form validates required fields
6s   │ Fill phone           │ Form is ready
7s   │ Click: تسجيل المريض  │ POST /api/patients with combined name
8s   │ (waiting)            │ Success toast appears
9s   │ Form resets          │ Form cleared, ready for next patient
```

## Form Field States

```
STATE 1: Empty Form
┌──────────────────────────────┐
│ Arabic:  [                 ] │
│ English: [                 ] │
└──────────────────────────────┘

STATE 2: User Typing
┌──────────────────────────────┐
│ Arabic:  [محمد            ] │
│ English: [                 ] │
│          ▼ (dropdown open)  │
└──────────────────────────────┘

STATE 3: After Selection
┌──────────────────────────────┐
│ Arabic:  [محمد            ] │
│ English: [Muhammad         ] ✓ Auto-filled
│          (dropdown closed)   │
└──────────────────────────────┘

STATE 4: New Name Entry
┌──────────────────────────────┐
│ Arabic:  [علاء             ] │
│ English: [Alaa             ] ✓ From dialog
│          (saved to DB)       │
└──────────────────────────────┘
```

## File Structure

```
radiance-ris-main/
├── local-backend/
│   ├── src/
│   │   ├── index.js ..................... Backend entry (routes registered)
│   │   └── routes/
│   │       └── names.js ................ API endpoints for names
│   └── migrations/
│       └── add_names_dictionary.sql ... Database schema + 50 names
│
├── src/
│   ├── hooks/
│   │   └── useNamesDictionary.ts ....... Custom hook for API
│   ├── components/
│   │   └── AddNameDialog.tsx .......... Dialog component
│   └── pages/
│       └── PatientRegistration.tsx ... Form integration
│
└── Documentation/
    ├── NAMES_DICTIONARY_FEATURE.md ... Full technical docs
    ├── NAMES_FEATURE_SUMMARY.md ...... Implementation summary
    ├── NAMES_FEATURE_EXAMPLES.md ..... Usage examples
    ├── IMPLEMENTATION_CHECKLIST.md .. Verification checklist
    └── QUICK_REFERENCE.md ........... Quick reference guide
```

## Pre-loaded Names Sample

```
MALE NAMES (25)                │ FEMALE NAMES (25)
────────────────────────────────┼─────────────────────────────
محمد → Muhammad               │ فاطمة → Fatima
أحمد → Ahmed                  │ عائشة → Aisha
علي → Ali                     │ زينب → Zainab
إبراهيم → Ibrahim             │ نور → Noor
عمر → Omar                    │ ليلى → Leila
حسن → Hassan                  │ ياسمين → Yasmine
حسين → Hussein                │ نادية → Nadia
... (18 more males)            │ ... (18 more females)
────────────────────────────────┴─────────────────────────────
Total: 50 Egyptian names pre-loaded
```

All components integrated, tested, and ready for immediate use! 🚀
