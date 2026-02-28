# 4-Part Patient Name System Implementation

## Overview
Successfully implemented a 4-part name system (رباعي الأسماء) for patient registration with separate fields for Arabic and English names, backed by a dictionary for auto-fill and auto-complete functionality.

## Database Schema Changes

### New Columns Added to `patients` Table
The following 8 columns were added to support the 4-part name structure:

**Arabic Names:**
- `firstName_ar` - الاسم الأول (First Name in Arabic)
- `secondName_ar` - الاسم الثاني (Second Name in Arabic)
- `thirdName_ar` - الاسم الثالث (Third Name in Arabic)
- `fourthName_ar` - الاسم الرابع (Fourth Name in Arabic)

**English Names:**
- `firstName_en` - First Name in English
- `secondName_en` - Second Name in English
- `thirdName_en` - Third Name in English
- `fourthName_en` - Fourth Name in English

All fields are nullable (NULL) and defined as `NVARCHAR(100)`.

**Migration File:** `local-backend/migrations/split_names.sql`

### Full Name Concatenation Logic
- Arabic full name: Combines all 4 Arabic fields with spaces, filtering out empty values
- English full name: Combines all 4 English fields with spaces, filtering out empty values
- Stored full_name format: `"{Arabic} ({English})"` or just `"{Arabic}"` if no English names provided

**Example:** 
- Arabic: محمد علي أحمد محمود
- English: Mohammad Ali Ahmed Mahmoud
- Stored: `محمد علي أحمد محمود (Mohammad Ali Ahmed Mahmoud)`

## Frontend Implementation

### PatientRegistration Component (`src/pages/PatientRegistration.tsx`)

#### Form State Structure
```typescript
const [formData, setFormData] = useState({
  // ... existing fields ...
  firstName_ar: "",
  secondName_ar: "",
  thirdName_ar: "",
  fourthName_ar: "",
  firstName_en: "",
  secondName_en: "",
  thirdName_en: "",
  fourthName_en: "",
});
```

#### Dictionary Hooks
Four independent instances of the `useNamesDictionary` hook for managing dictionary searches per field:
```typescript
const nameField1 = useNamesDictionary();
const nameField2 = useNamesDictionary();
const nameField3 = useNamesDictionary();
const nameField4 = useNamesDictionary();
```

#### Suggestion States
Per-field suggestion dropdown visibility:
```typescript
const [showSuggestions, setShowSuggestions] = useState<{[key: number]: boolean}>({
  1: false,
  2: false,
  3: false,
  4: false,
});
```

#### Handler Functions

**1. `handleNameFieldChange(fieldNum: 1|2|3|4, lang: 'ar'|'en', value: string)`**
- Updates the field's value in formData
- For Arabic fields: triggers dictionary search and displays suggestions
- For English fields: allows manual entry

**2. `handleNameFieldBlur(fieldNum: 1|2|3|4)`**
- Executes when user leaves a name field
- Performs exact lookup in dictionary using Arabic name
- Auto-fills English name if found
- Shows "Add Name Dialog" if name not found in dictionary
- Hides suggestions dropdown

**3. `handleNameFieldSelect(fieldNum: 1|2|3|4, name: object)`**
- Called when user clicks a suggestion
- Sets both Arabic and English values from selected name
- Hides suggestions dropdown

**4. `handleAddNameForField(arabicName: string, englishName: string)`**
- Handles adding a new name to the dictionary
- Updates active field with newly added name pair
- Integrates with AddNameDialog component

#### Helper Functions

**`getNameFieldHook(fieldNum: 1|2|3|4)`**
Returns the appropriate useNamesDictionary hook instance for the given field number.

**`getFieldName(fieldNum: 1|2|3|4, lang: 'ar'|'en')`**
Maps field number and language to the corresponding formData property key:
- Returns: `firstName_ar`, `secondName_ar`, `thirdName_ar`, `fourthName_ar`, `firstName_en`, etc.

### Form UI Layout

#### Name Fields Section
- Title: "الاسم رباعي *" (4-Part Name - Required)
- 4 rows displayed, each row contains:
  - Arabic input field (left) with dictionary dropdown
  - English input field (right) for auto-filled translation

#### Field Labels
- Row 1: "الاسم الأول (عربي) *" | "الاسم الأول (إنجليزي)"
- Row 2: "الاسم الثاني (عربي)" | "الاسم الثاني (إنجليزي)"
- Row 3: "الاسم الثالث (عربي)" | "الاسم الثالث (إنجليزي)"
- Row 4: "الاسم الرابع (عربي)" | "الاسم الرابع (إنجليزي)"

#### Placeholders
- First field: "مثال: محمد" (Example: Mohammad)
- Other fields: "اختياري" (Optional)
- English fields: "يتم ملؤه تلقائياً" (Auto-filled)

#### Suggestion Dropdown
- Appears below Arabic field when typing
- Shows matching names from dictionary
- Displays format: "English Name" (on right) | "الاسم العربي" (on left)
- Disappears on selection, blur, or when cleared

### Form Submission

In `handleSubmit`:
1. Validates first Arabic name is provided
2. Validates phone number is provided
3. Combines all 4 Arabic names into `fullName_ar`
4. Combines all 4 English names into `fullName_en`
5. Creates full_name with format: `"{fullName_ar} ({fullName_en})"`
6. Passes all 8 individual name fields plus combined names to API
7. Shows success toast with generated MRN

### Form Reset
Reset button clears:
- All 8 name fields
- All suggestion states (set to false for fields 1-4)
- All other form fields (age, gender, phone, etc.)

## Backend Implementation

### API Routes (`local-backend/src/routes/patients.js`)

#### POST /api/patients (Create Patient)
**Parameters added:**
```javascript
{
  firstName_ar,
  secondName_ar,
  thirdName_ar,
  fourthName_ar,
  firstName_en,
  secondName_en,
  thirdName_en,
  fourthName_en,
  // ... existing fields ...
}
```

**Implementation:**
- Accepts all 8 name fields in request body
- Stores individual fields in database
- Returns created patient with all fields

#### PUT /api/patients/:id (Update Patient)
**Parameters added:**
- Same 8 name fields as POST endpoint
- Updates individual fields in database

**Implementation:**
- Accepts all 8 name fields in request body
- Updates existing patient record
- Returns updated patient with all fields

### Database Constraints
- All name fields allow NULL values
- Field length: 100 characters (NVARCHAR(100))
- No unique constraints on individual name fields
- Dictionary lookups happen at application level

## Names Dictionary Integration

### Dictionary Features
- **Search:** Fuzzy matching on Arabic names
- **Lookup:** Exact match lookup for Arabic name
- **Auto-fill:** English name automatically filled based on Arabic name
- **Add New:** Dialog to add missing name pairs
- **Per-Field:** Each of 4 fields has independent dictionary access

### API Endpoints Used
- `GET /api/names/search?q={query}` - Search with fuzzy matching
- `GET /api/names/lookup/{arabicName}` - Exact match lookup
- `POST /api/names` - Add new name pair

### Dictionary Table
**Table:** `NamesDictionary`
- Contains 56+ pre-populated Arabic names with English translations
- All names use proper Arabic script without extra spaces (e.g., عبدالرحمن not عبد الرحمن)

## Testing Checklist

### Form Display
- [ ] All 4 name field rows display correctly
- [ ] Arabic and English fields appear side-by-side
- [ ] Labels are correct for each field
- [ ] First field shows required asterisk
- [ ] Optional fields show placeholder text

### Dictionary Functionality
- [ ] Typing in Arabic field 1 shows suggestions
- [ ] Typing in Arabic field 2 shows suggestions
- [ ] Typing in Arabic field 3 shows suggestions
- [ ] Typing in Arabic field 4 shows suggestions
- [ ] Each field has independent suggestions
- [ ] Clicking suggestion auto-fills Arabic and English

### Auto-fill Behavior
- [ ] Blurring field after entering Arabic name triggers lookup
- [ ] If name found, English field auto-fills
- [ ] If name not found, Add Name Dialog shows with Arabic name pre-filled
- [ ] Dialog allows adding English translation
- [ ] After adding, both fields populate

### Database Storage
- [ ] All 8 name fields save to database
- [ ] Combined full_name saves with correct format
- [ ] Can retrieve patient and see all 8 name fields
- [ ] Update patient preserves individual name fields

### Form Submission
- [ ] Cannot submit without first Arabic name
- [ ] Cannot submit without phone
- [ ] MRN auto-generates if not provided
- [ ] Success toast shows after submission
- [ ] Form resets after successful submission

### Edge Cases
- [ ] Only 1 name (first name) can be submitted
- [ ] All 4 names can be provided
- [ ] English names are optional
- [ ] Special Arabic characters handled correctly
- [ ] Long names (up to 100 chars) handled correctly

## Files Modified

1. **Frontend:**
   - `src/pages/PatientRegistration.tsx` - Updated form UI and handlers
   - `src/hooks/useNamesDictionary.ts` - No changes (already supports multiple instances)
   - `src/components/AddNameDialog.tsx` - No changes (already integrated)

2. **Backend:**
   - `local-backend/src/routes/patients.js` - Added 8 name fields to POST and PUT routes
   - `local-backend/migrations/split_names.sql` - Pre-existing migration file

3. **Database:**
   - `RIS_System` - Added 8 columns to patients table via migration

## Performance Considerations

- Dictionary searches use existing API endpoints (no new endpoints needed)
- Each field performs independent lookups
- No circular dependencies between fields
- Suggestions dropdown is virtualized if many results (browser default)
- Database query performance unchanged (columns are nullable, no complex constraints)

## Backward Compatibility

- Existing patient records continue to work
- `full_name` field still contains combined name for backward compatibility
- Individual name fields are NULL for existing records unless explicitly updated
- API accepts both old single-name and new 4-part name inputs

## Future Enhancements

1. Migration script to populate existing patient records from full_name
2. Display split names in Worklist and Scheduling views
3. Advanced search using individual name fields
4. Name validation rules (optional middle names, etc.)
5. Customizable number of name parts (currently hardcoded to 4)
6. Name prefix/suffix support (e.g., Dr., Mr., Jr.)
