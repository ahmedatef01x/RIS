// Status and styling constants for appointments
export const APPOINTMENT_STATUSES = {
  scheduled: {
    ar: 'مجدول',
    en: 'Scheduled',
    color: 'bg-blue-50 text-blue-900 border-blue-300',
    badgeColor: 'bg-blue-100 text-blue-800',
    hexColor: '#3b82f6', // blue-500
  },
  'checked-in': {
    ar: 'مؤكد',
    en: 'Checked In',
    color: 'bg-purple-50 text-purple-900 border-purple-300',
    badgeColor: 'bg-purple-100 text-purple-800',
    hexColor: '#a855f7', // purple-500
  },
  'in-progress': {
    ar: 'جاري',
    en: 'In Progress',
    color: 'bg-yellow-50 text-yellow-900 border-yellow-300',
    badgeColor: 'bg-yellow-100 text-yellow-800',
    hexColor: '#eab308', // yellow-500
  },
  completed: {
    ar: 'مكتمل',
    en: 'Completed',
    color: 'bg-green-50 text-green-900 border-green-300',
    badgeColor: 'bg-green-100 text-green-800',
    hexColor: '#22c55e', // green-500
  },
  cancelled: {
    ar: 'ملغي',
    en: 'Cancelled',
    color: 'bg-red-50 text-red-900 border-red-300',
    badgeColor: 'bg-red-100 text-red-800',
    hexColor: '#ef4444', // red-500
  },
};

export const STATUS_ORDER = ['scheduled', 'checked-in', 'in-progress', 'completed', 'cancelled'];

export const PRIORITY_COLORS: Record<string, string> = {
  normal: 'bg-muted text-muted-foreground',
  urgent: 'bg-warning/10 text-warning border-warning/30',
  emergency: 'bg-destructive/10 text-destructive border-destructive/30',
};

export function getStatusLabel(status: string, language: 'ar' | 'en'): string {
  const statusConfig = APPOINTMENT_STATUSES[status as keyof typeof APPOINTMENT_STATUSES];
  if (!statusConfig) return status;
  return language === 'ar' ? statusConfig.ar : statusConfig.en;
}

export function getStatusStyle(status: string): string {
  const statusConfig = APPOINTMENT_STATUSES[status as keyof typeof APPOINTMENT_STATUSES];
  return statusConfig?.badgeColor || 'bg-gray-100 text-gray-800';
}

export function getStatusColor(status: string): string {
  const statusConfig = APPOINTMENT_STATUSES[status as keyof typeof APPOINTMENT_STATUSES];
  return statusConfig?.hexColor || '#6b7280';
}

export function getNextStatus(currentStatus: string): string | null {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex >= STATUS_ORDER.length - 1) {
    return null;
  }
  return STATUS_ORDER[currentIndex + 1];
}

// Event emitter for status changes
class StatusEmitter {
  private listeners: Record<string, Function[]> = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, data?: any) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }
}

export const statusEmitter = new StatusEmitter();

// Emit events for real-time updates
export function emitStatusUpdate(appointmentId: string, newStatus: string) {
  statusEmitter.emit('appointmentStatusChanged', { appointmentId, newStatus });
  statusEmitter.emit(`appointment:${appointmentId}:statusChanged`, { newStatus });
}

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
