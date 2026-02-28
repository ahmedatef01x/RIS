# Detailed Changes - ACC-000062

## 1. src/lib/appointmentStatus.ts

### Change: Enhanced onStatusUpdate() and onAppointmentStatusUpdate() with unsubscribe functions

**Before**:
```typescript
export function onStatusUpdate(callback: (data: { appointmentId: string; newStatus: string }) => void) {
  statusEmitter.on('appointmentStatusChanged', callback);
}

export function onAppointmentStatusUpdate(appointmentId: string, callback: (data: { newStatus: string }) => void) {
  statusEmitter.on(`appointment:${appointmentId}:statusChanged`, callback);
}
```

**After**:
```typescript
export function onStatusUpdate(callback: (data: { appointmentId: string; newStatus: string }) => void) {
  statusEmitter.on('appointmentStatusChanged', callback);
  // Return unsubscribe function
  return () => {
    statusEmitter.off('appointmentStatusChanged', callback);
  };
}

export function onAppointmentStatusUpdate(appointmentId: string, callback: (data: { newStatus: string }) => void) {
  statusEmitter.on(`appointment:${appointmentId}:statusChanged`, callback);
  // Return unsubscribe function
  return () => {
    statusEmitter.off(`appointment:${appointmentId}:statusChanged`, callback);
  };
}
```

**Why**: Allows proper cleanup of event listeners in useEffect to prevent memory leaks.

---

## 2. src/pages/Worklist.tsx

### Change A: Added import
**Line 22**:
```typescript
import { APPOINTMENT_STATUSES, emitStatusUpdate } from "@/lib/appointmentStatus";
```

### Change B: Updated updateStatus() function
**Location**: Lines 101-155

**Before**:
```typescript
  const updateStatus = async (id: string, newStatus: string) => {
    try {
      console.log(`🔄 Updating status for ${id} to ${newStatus}`);
      
      if (USE_LOCAL_API) {
        // ... API calls ...
      } else {
        // ... Supabase update ...
      }
      
      setWorklistItems(prevItems => prevItems.map(item => ...));
      toast.success("تم تحديث الحالة");
      console.log('✨ Local state updated');
      
      // Fetch fresh data from server immediately
      await fetchWorklist();
      
      // Dispatch a custom event to notify Dashboard
      window.dispatchEvent(new CustomEvent('examStatusUpdated', { 
        detail: { id, status: newStatus } 
      }));
      console.log('📢 Event dispatched to other components');
    } catch (error) {
      // ... error handling ...
    }
  };
```

**After**:
```typescript
  const updateStatus = async (id: string, newStatus: string) => {
    try {
      console.log(`🔄 Updating status for ${id} to ${newStatus}`);
      
      if (USE_LOCAL_API) {
        // ... API calls ... (unchanged)
      } else {
        // ... Supabase update ... (unchanged)
      }
      
      setWorklistItems(prevItems => prevItems.map(item => ...));
      toast.success("تم تحديث الحالة");
      console.log('✨ Local state updated');
      
      // ✨ NEW: Emit status update event for real-time synchronization
      emitStatusUpdate(id, newStatus);
      console.log('📢 Status update event emitted');
      
      // Fetch fresh data from server immediately
      await fetchWorklist();
      console.log('🔁 Worklist refreshed');
      
      // Dispatch a custom event to notify Dashboard (legacy support)
      window.dispatchEvent(new CustomEvent('examStatusUpdated', { 
        detail: { id, status: newStatus } 
      }));
      console.log('📢 Legacy event dispatched to other components');
    } catch (error) {
      // ... error handling ...
    }
  };
```

**What Changed**: 
- Added `emitStatusUpdate(id, newStatus)` call after successful status update
- Changed comment to indicate "legacy support" for window event
- Added console log to confirm status update event emitted

---

## 3. src/pages/Scheduling.tsx

### Change A: Added import
**Line 17** (after existing imports):
```typescript
import { APPOINTMENT_STATUSES, onStatusUpdate } from "@/lib/appointmentStatus";
```

### Change B: Updated statusColors constant
**Lines 24-32**

**Before**:
```typescript
const statusColors: Record<string, string> = {
  scheduled: "bg-info/20 border-info/30 text-info",
  confirmed: "bg-success/20 border-success/30 text-success",
  in_progress: "bg-warning/20 border-warning/30 text-warning",
  completed: "bg-muted/50 border-muted text-muted-foreground",
  cancelled: "bg-destructive/20 border-destructive/30 text-destructive",
};
```

**After**:
```typescript
// Map APPOINTMENT_STATUSES for badge styling
const statusColors: Record<string, string> = {
  scheduled: APPOINTMENT_STATUSES.scheduled.badgeColor,
  confirmed: APPOINTMENT_STATUSES['checked-in'].badgeColor,
  'checked-in': APPOINTMENT_STATUSES['checked-in'].badgeColor,
  in_progress: APPOINTMENT_STATUSES['in-progress'].badgeColor,
  'in-progress': APPOINTMENT_STATUSES['in-progress'].badgeColor,
  completed: APPOINTMENT_STATUSES.completed.badgeColor,
  cancelled: APPOINTMENT_STATUSES.cancelled.badgeColor,
};
```

**Why**: Uses unified colors from APPOINTMENT_STATUSES for consistency across all pages.

### Change C: Added new useEffect for status listener
**After line 125** (after existing event listeners):
```typescript
  // Listen for appointment status changes from statusEmitter
  useEffect(() => {
    const unsubscribe = onStatusUpdate((data: any) => {
      console.log('📡 Scheduling: Status update received for appointment:', data.appointmentId);
      // Update local appointments with new status
      setAppointments(prev => 
        prev.map(apt => 
          (apt.id === data.appointmentId || apt.exam_order_id === data.appointmentId) 
            ? { ...apt, status: data.newStatus } 
            : apt
        )
      );
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);
```

**Why**: Listens to status changes from Worklist and updates Scheduling appointments in real-time.

---

## 4. src/components/dashboard/PatientQueue.tsx

### Change A: Added import
**Line 9**:
```typescript
import { APPOINTMENT_STATUSES, onStatusUpdate } from "@/lib/appointmentStatus";
```

### Change B: Replaced statusStyles with getStatusStyle() function
**Lines 16-29**

**Before**:
```typescript
const statusStyles: Record<string, string> = {
  scheduled: "status-scheduled",
  "checked-in": "status-in-progress",
  "in-progress": "status-completed",
  completed: "bg-success/10 text-success border-success/30",
};
```

**After**:
```typescript
// Map status values to APPOINTMENT_STATUSES colors
const getStatusStyle = (status: string): string => {
  const statusMap: Record<string, string> = {
    scheduled: APPOINTMENT_STATUSES.scheduled.badgeColor,
    'checked-in': APPOINTMENT_STATUSES['checked-in'].badgeColor,
    'in-progress': APPOINTMENT_STATUSES['in-progress'].badgeColor,
    completed: APPOINTMENT_STATUSES.completed.badgeColor,
    cancelled: APPOINTMENT_STATUSES.cancelled.badgeColor,
  };
  return statusMap[status] || APPOINTMENT_STATUSES.scheduled.badgeColor;
};
```

**Why**: Dynamically determines correct color for each status using APPOINTMENT_STATUSES.

### Change C: Added new useEffect for status listener
**After line 65** (after window event listener):
```typescript
  // Listen for real-time status updates from statusEmitter
  useEffect(() => {
    const unsubscribe = onStatusUpdate((data: any) => {
      console.log('📡 PatientQueue: Status update received for appointment:', data.appointmentId);
      // Update local patients with new status immediately
      setPatients(prev => 
        prev.map(patient => 
          patient.id === data.appointmentId 
            ? { ...patient, status: data.newStatus } 
            : patient
        )
      );
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);
```

**Why**: Listens to status changes and updates patient queue immediately without waiting for auto-refresh.

### Change D: Updated getStatusLabel() function
**Around line 165**

**Before**:
```typescript
  const getStatusLabel = (status: string) => {
    if (language === 'ar') {
      return status === 'scheduled' ? 'مجدول' : status === 'in-progress' ? 'قيد التنفيذ' : status === 'completed' ? 'مكتمل' : status;
    }
    return status.replace("-", " ");
  };
```

**After**:
```typescript
  const getStatusLabel = (status: string) => {
    const statusConfig = APPOINTMENT_STATUSES[status as keyof typeof APPOINTMENT_STATUSES];
    if (!statusConfig) return status;
    return language === 'ar' ? statusConfig.ar : statusConfig.en;
  };
```

**Why**: Uses unified APPOINTMENT_STATUSES for consistent Arabic/English labels.

### Change E: Updated Badge rendering
**Around line 220-225**

**Before**:
```typescript
<Badge variant="outline" className={cn(statusStyles[patient.status] || statusStyles.scheduled, "capitalize")}>
  {getStatusLabel(patient.status)}
</Badge>
```

**After**:
```typescript
<Badge variant="outline" className={cn(getStatusStyle(patient.status), "capitalize")}>
  {getStatusLabel(patient.status)}
</Badge>
```

**Why**: Uses new getStatusStyle() function for unified colors.

---

## Summary of Changes

| File | Changes | Impact |
|------|---------|--------|
| **appointmentStatus.ts** | Added unsubscribe return values | Enables proper event listener cleanup |
| **Worklist.tsx** | Added emitStatusUpdate() call | Broadcasts status changes to other pages |
| **Scheduling.tsx** | Added statusEmitter listener + unified colors | Receives and displays real-time updates |
| **PatientQueue.tsx** | Added statusEmitter listener + unified colors | Receives and displays real-time updates |

## Testing Impact

✅ All changes are **backward compatible**
✅ Legacy window events still dispatched (for compatibility)
✅ No breaking changes to existing functionality
✅ All TypeScript compilation errors resolved
✅ Ready for immediate deployment

## Performance Impact

✅ **Zero performance degradation**
- Event-driven (no additional API calls)
- No polling or timers added
- Proper memory management with listener cleanup
- Synchronous event processing

---

*Changes completed on: 2024-12-28*
*Status: Ready for Production*
