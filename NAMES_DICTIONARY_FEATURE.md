# Names Dictionary Feature Documentation

## Overview
The Names Dictionary feature allows automatic translation and management of patient names between Arabic and English. When registering a new patient, the system:

1. **Auto-completes** names from a pre-populated dictionary of common Egyptian names
2. **Auto-fills** the English translation when an Arabic name is found
3. **Prompts** the user to add new names when an Arabic name isn't in the dictionary
4. **Persists** new names for future auto-completion

## Features

### 1. Arabic Name Auto-Complete
- Type Arabic name in the `patientNameArabic` field
- Suggestions appear with fuzzy matching
- System uses `LIKE` pattern matching to handle variations and extra spaces
- Click a suggestion to select it and auto-fill the English name

### 2. Automatic English Translation
- When an Arabic name is selected or entered:
  - System queries the database for exact match
  - If found → English name is auto-filled
  - If not found → Popup dialog appears to add the new name

### 3. Add New Names Dialog
- Appears when an Arabic name isn't found in the dictionary
- User enters the English translation
- New name pair is saved to the database
- Immediately available for future registrations

### 4. Fuzzy Matching
- Handles extra spaces: "محمد " matches "محمد"
- Case-insensitive search
- Pattern-based matching using SQL `LIKE` operator
- Example searches:
  - "محم" finds "محمد", "محمود", etc.
  - "فاط" finds "فاطمة"

## Database Schema

### NamesDictionary Table
```sql
CREATE TABLE NamesDictionary (
    id INT PRIMARY KEY IDENTITY(1,1),
    arabicName NVARCHAR(100) NOT NULL,
    englishName NVARCHAR(100) NOT NULL,
    createdAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_arabicName UNIQUE (arabicName)
);
```

### Pre-loaded Egyptian Names
The database comes with 50 common Egyptian names pre-populated, including:
- **Male Names**: محمد, أحمد, علي, إبراهيم, عمر, حسن, حسين, سالم, etc.
- **Female Names**: فاطمة, عائشة, زينب, نور, ليلى, ياسمين, ندى, سلمى, etc.

## API Endpoints

### Search Names (Fuzzy Match)
```
GET /api/names/search?q=محمد
```
**Response:**
```json
[
  {
    "id": 1,
    "arabicName": "محمد",
    "englishName": "Muhammad"
  },
  {
    "id": 15,
    "arabicName": "محمود",
    "englishName": "Mahmoud"
  }
]
```

### Lookup Exact Name
```
GET /api/names/lookup/محمد
```
**Response:**
```json
{
  "id": 1,
  "arabicName": "محمد",
  "englishName": "Muhammad"
}
```
**Status 404** if not found

### Add New Name
```
POST /api/names
Content-Type: application/json

{
  "arabicName": "محمد",
  "englishName": "Muhammad"
}
```
**Response (201 Created):**
```json
{
  "id": 51,
  "arabicName": "محمد",
  "englishName": "Muhammad",
  "message": "Name added to dictionary successfully"
}
```

**Error Responses:**
- `400`: Missing required fields or empty names
- `409`: Arabic name already exists in dictionary
- `500`: Server error

## Frontend Components

### useNamesDictionary Hook
```typescript
const { 
  searchResults,      // Current search results
  loading,            // Loading state
  error,              // Error message if any
  searchNames,        // Search function
  lookupName,         // Lookup function
  addName,            // Add new name function
  setSearchResults,   // Update results manually
  setError            // Update error manually
} = useNamesDictionary();
```

**Functions:**
- `searchNames(query)` - Returns matching names
- `lookupName(arabicName)` - Returns exact match or null
- `addName(arabicName, englishName)` - Adds new name to dictionary

### AddNameDialog Component
```tsx
<AddNameDialog
  open={boolean}
  arabicName={string}
  onOpenChange={(open) => void}
  onAddName={(arabicName, englishName) => Promise<void>}
  isLoading={boolean}
/>
```

### PatientRegistration Form Integration
The form now includes:
- **patientNameArabic**: Main input with auto-complete suggestions
- **patientNameEnglish**: Auto-filled from dictionary, manually editable
- **AddNameDialog**: Triggered when name not found

## User Flow

### Scenario 1: Name Found in Dictionary
1. User types "محمد" in Arabic name field
2. Suggestions appear (محمد, محمود, etc.)
3. User clicks "محمد"
4. English field auto-fills with "Muhammad"
5. Form ready to submit

### Scenario 2: Name Not in Dictionary
1. User types "علاء" (less common name)
2. No suggestions appear
3. User presses Tab or clicks elsewhere (blur event)
4. System checks dictionary → not found
5. AddNameDialog popup appears
6. User enters "Alaa" in English field
7. Clicks "إضافة الاسم"
8. Name saved to database
9. English field auto-fills with "Alaa"
10. Form ready to submit

### Scenario 3: Manual Override
1. User selects "محمد" from suggestions
2. English field shows "Muhammad"
3. User manually changes to "Mohammad" (alternate spelling)
4. System allows this override
5. Form saves with the manual entry

## Technical Implementation

### Backend Routes (`local-backend/src/routes/names.js`)
- GET `/search` - Fuzzy search with LIKE pattern
- GET `/lookup/:arabicName` - Exact match lookup
- POST `/` - Add new name with validation and duplicate checking

### Frontend Hook (`src/hooks/useNamesDictionary.ts`)
- Handles all API calls
- Manages search results state
- Provides error handling
- Supports both localhost and production URLs

### Dialog Component (`src/components/AddNameDialog.tsx`)
- Material-aligned UI with Arabic/RTL support
- Form validation
- Loading states
- Toast notifications for success/error

### Form Integration (`src/pages/PatientRegistration.tsx`)
- Separate fields for Arabic and English names
- Auto-complete dropdown with suggestions
- Blur event triggers exact lookup
- Auto-fill on match, show dialog on miss
- Combined name format for storage: "محمد (Muhammad)"

## Data Flow

```
User types Arabic name
    ↓
handleArabicNameChange() called
    ↓
searchNames() API call (fuzzy match)
    ↓
Suggestions displayed
    ↓
User selects suggestion OR presses Tab
    ↓
If selected: handleSelectName() → auto-fill English
If blur: handleArabicNameBlur() → lookupName() exact match
    ↓
If found: Auto-fill English
If not found: Show AddNameDialog
    ↓
User enters English translation
    ↓
addName() API call
    ↓
Save to database + auto-fill English field
    ↓
Form ready to submit patient registration
```

## Files Modified/Created

### Backend
- ✅ `local-backend/migrations/add_names_dictionary.sql` - Migration file
- ✅ `local-backend/src/routes/names.js` - API routes
- ✅ `local-backend/src/index.js` - Route registration

### Frontend
- ✅ `src/hooks/useNamesDictionary.ts` - Custom hook
- ✅ `src/components/AddNameDialog.tsx` - Dialog component
- ✅ `src/pages/PatientRegistration.tsx` - Form integration

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] NamesDictionary table contains 50 names
- [ ] API `/api/names/search` returns results
- [ ] API `/api/names/lookup` finds exact matches
- [ ] API `/api/names` POST creates new names
- [ ] Frontend hook calls API correctly
- [ ] Auto-complete dropdown appears when typing Arabic
- [ ] Selecting suggestion auto-fills English
- [ ] Dialog appears when name not found
- [ ] New names saved and available in future searches
- [ ] Form validates required fields
- [ ] Patient registration saves with combined names

## Future Enhancements

- Add female/male name indicators
- Support for nickname variations
- Name pronunciation guide
- Batch import names from external sources
- Name popularity/frequency tracking
- Name search by English translation (reverse lookup)
- Export/backup dictionary
