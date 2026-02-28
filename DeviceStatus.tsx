import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Monitor, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { api, USE_LOCAL_API } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

interface Device {
  id: string;
  name: string;
  room: string | null;
  status: string;
  type: string;
}

export function DeviceStatus() {
  const { t, language } = useI18n();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const statusConfig: Record<string, { label: string; labelAr: string; color: string; textColor: string }> = {
    available: { label: "Available", labelAr: "متاح", color: "bg-success", textColor: "text-success" },
    busy: { label: "Busy", labelAr: "مشغول", color: "bg-warning", textColor: "text-warning" },
    maintenance: { label: "Maintenance", labelAr: "صيانة", color: "bg-destructive", textColor: "text-destructive" },
    offline: { label: "Offline", labelAr: "غير متصل", color: "bg-muted", textColor: "text-muted-foreground" },
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // Listen for exam status updates
  useEffect(() => {
    const handleExamUpdate = () => {
      console.log('Exam status updated, refreshing devices');
      fetchDevices();
    };

    window.addEventListener('examStatusUpdated', handleExamUpdate);
    
    return () => {
      window.removeEventListener('examStatusUpdated', handleExamUpdate);
    };
  }, []);

  // Auto-refresh every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto-refreshing devices');
      fetchDevices();
    }, 20000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchDevices = async () => {
    try {
      if (USE_LOCAL_API) {
        const data = await api.getDeviceStatus();
        console.log('Device status from API:', data);
        setDevices(data || []);
      } else {
        const { data, error } = await supabase
          .from('devices')
          .select('*')
          .order('name');

        if (error) throw error;
        setDevices(data || []);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const config = statusConfig[status] || statusConfig.offline;
    return language === 'ar' ? config.labelAr : config.label;
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
          <h2 className="text-lg font-semibold text-foreground">{t.dashboard.deviceStatus}</h2>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'مراقبة الأجهزة في الوقت الحقيقي' : 'Real-time equipment monitoring'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {Object.entries(statusConfig).slice(0, 3).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", config.color)} />
              <span className="text-xs text-muted-foreground">
                {language === 'ar' ? config.labelAr : config.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t.common.noData}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {devices.map((device, index) => {
            const status = statusConfig[device.status] || statusConfig.offline;
            return (
              <div
                key={device.id}
                className={cn(
                  "p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-smooth animate-scale-in opacity-0",
                  `stagger-${(index % 4) + 1}`
                )}
                style={{ animationFillMode: "forwards" }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      device.status === "available" ? "bg-success/10" :
                      device.status === "busy" ? "bg-warning/10" : "bg-destructive/10"
                    )}>
                      <Monitor className={cn("w-5 h-5", status.textColor)} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{device.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {device.room || (language === 'ar' ? 'غير محدد' : 'Not assigned')}
                      </p>
                    </div>
                  </div>
                  <div className={cn("flex items-center gap-1", status.textColor)}>
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-medium">{getStatusLabel(device.status)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}