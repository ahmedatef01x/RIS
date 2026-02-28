import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { api, USE_LOCAL_API } from "@/lib/api";

const typeColors = {
  mri: "bg-chart-3/10 text-chart-3 border-chart-3/30",
  ct: "bg-chart-2/10 text-chart-2 border-chart-2/30",
  xray: "bg-chart-1/10 text-chart-1 border-chart-1/30",
  us: "bg-chart-4/10 text-chart-4 border-chart-4/30",
};

export function UpcomingAppointments() {
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Listen for exam status updates
  useEffect(() => {
    const handleExamUpdate = () => {
      console.log('Exam status updated, refreshing appointments');
      fetchAppointments();
    };

    window.addEventListener('examStatusUpdated', handleExamUpdate);
    
    return () => {
      window.removeEventListener('examStatusUpdated', handleExamUpdate);
    };
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto-refreshing appointments');
      fetchAppointments();
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAppointments = async () => {
    try {
      if (USE_LOCAL_API) {
        const data = await api.getUpcomingAppointments();
        // normalize rows to expected shape
        const normalized = (data || []).map((r: any) => ({
          id: r.id,
          patient: r.patient_name || (r.patients && r.patients.full_name) || '-',
          exam: r.exam_type || (r.exam_orders && r.exam_orders.exam_type) || '-',
          time: new Date(r.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          room: r.device_name || r.room || '—',
          type: (r.exam_type || '').toLowerCase().includes('mri') ? 'mri' : (r.exam_type || '').toLowerCase().includes('ct') ? 'ct' : (r.exam_type || '').toLowerCase().includes('x-ray') || (r.exam_type || '').toLowerCase().includes('xray') ? 'xray' : 'us'
        }));
        setAppointments(normalized);
      } else {
        // Fallback static (could be replaced with Supabase query)
        setAppointments([]);
      }
    } catch (err) {
      console.error('Failed fetching upcoming appointments', err);
    }
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">المواعيد القادمة</h2>
          <p className="text-sm text-muted-foreground">الفحوصات المجدولة التالية</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="w-4 h-4" />
          عرض التقويم
        </Button>
      </div>

      <div className="space-y-3">
        {appointments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">لا توجد مواعيد قادمة</div>
        ) : (
          appointments.map((apt, index) => (
            <div
              key={apt.id}
              className={cn(
                "flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-smooth animate-slide-up opacity-0",
                `stagger-${index + 1}`
              )}
              style={{ animationFillMode: "forwards" }}
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-muted">
                  <Clock className="w-4 h-4 text-muted-foreground mb-1" />
                  <span className="text-sm font-semibold text-foreground">{apt.time.split(' ')[0] ?? apt.time}</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{apt.patient}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={cn(typeColors[apt.type as keyof typeof typeColors])}>
                      {apt.exam}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {apt.room}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
