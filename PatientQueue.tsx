import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock, User, MoreVertical, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { api, USE_LOCAL_API } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { APPOINTMENT_STATUSES, onStatusUpdate } from "@/lib/appointmentStatus";

interface QueuePatient {
  id: string;
  scheduled_time: string;
  status: string;
  patients: { full_name: string; mrn: string } | null;
  exam_orders: { exam_type: string; priority: string } | null;
}

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

const priorityStyles: Record<string, string> = {
  normal: "bg-muted text-muted-foreground",
  urgent: "bg-warning/10 text-warning border-warning/30",
  emergency: "bg-destructive/10 text-destructive border-destructive/30",
};

export function PatientQueue() {
  const { t, language } = useI18n();
  const [patients, setPatients] = useState<QueuePatient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueue();
  }, []);

  // Listen for exam status updates
  useEffect(() => {
    const handleExamUpdate = () => {
      console.log('Exam status updated, refreshing patient queue');
      fetchQueue();
    };

    window.addEventListener('examStatusUpdated', handleExamUpdate);
    
    return () => {
      window.removeEventListener('examStatusUpdated', handleExamUpdate);
    };
  }, []);

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

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto-refreshing patient queue');
      fetchQueue();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      if (USE_LOCAL_API) {
        const data = await api.getPatientQueue();
        // normalize local API shape to component expected shape
        const normalized = (data || [])
          .filter((row: any) => row.status !== 'cancelled')
          .map((row: any) => ({
            id: row.id,
            scheduled_time: row.scheduled_time,
            status: row.status,
            patients: { 
              full_name: row.patient_name || row.full_name || '-', 
              mrn: row.mrn || '-' 
            },
            exam_orders: { 
              exam_type: row.exam_type || '-', 
              priority: row.priority || 'normal' 
            }
          }));
        console.log('PatientQueue normalized data:', normalized);
        setPatients(normalized);
      } else {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            scheduled_time,
            status,
            patients (full_name, mrn),
            exam_orders (exam_type, priority)
          `)
          .gte('scheduled_time', `${today}T00:00:00`)
          .lte('scheduled_time', `${today}T23:59:59`)
          .neq('status', 'cancelled')
          .order('scheduled_time')
          .limit(10);

        if (error) throw error;
        setPatients(data || []);
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityLabel = (priority: string) => {
    if (language === 'ar') {
      return priority === 'normal' ? 'عادي' : priority === 'urgent' ? 'عاجل' : 'طوارئ';
    }
    return priority;
  };

  const getStatusLabel = (status: string) => {
    const statusConfig = APPOINTMENT_STATUSES[status as keyof typeof APPOINTMENT_STATUSES];
    if (!statusConfig) return status;
    return language === 'ar' ? statusConfig.ar : statusConfig.en;
  };

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Activity className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t.dashboard.patientQueue}</h2>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'مرضى اليوم في الانتظار' : "Today's waiting patients"}
          </p>
        </div>
        <Button variant="outline" size="sm">
          {language === 'ar' ? 'عرض الكل' : 'View All'}
        </Button>
      </div>
      
      {patients.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t.common.noData}
        </div>
      ) : (
        <div className="space-y-3">
          {patients.map((patient, index) => (
            <div
              key={patient.id}
              className={cn(
                "flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-smooth animate-slide-up opacity-0",
                `stagger-${index + 1}`
              )}
              style={{ animationFillMode: "forwards" }}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{patient.patients?.full_name || '-'}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{patient.patients?.mrn || '-'}</span>
                    <span>•</span>
                    <span>{patient.exam_orders?.exam_type || '-'}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {formatTime(patient.scheduled_time)}
                </div>
                <Badge variant="outline" className={cn(priorityStyles[patient.exam_orders?.priority || 'normal'], "capitalize")}>
                  {getPriorityLabel(patient.exam_orders?.priority || 'normal')}
                </Badge>
                <Badge variant="outline" className={cn(getStatusStyle(patient.status), "capitalize")}>
                  {getStatusLabel(patient.status)}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}