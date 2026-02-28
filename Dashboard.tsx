import { useState, useEffect } from "react";
import { Users, ClipboardList, CheckCircle, AlertTriangle } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { PatientQueue } from "@/components/dashboard/PatientQueue";
import { ExamChart } from "@/components/dashboard/ExamChart";
import { DeviceStatus } from "@/components/dashboard/DeviceStatus";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import { BillingChart } from "@/components/dashboard/BillingChart";
import { supabase } from "@/integrations/supabase/client";
import { api, USE_LOCAL_API } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

export default function Dashboard() {
  const { user, userRole, isLocalMode } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState({
    todayPatients: 47,
    pendingOrders: 23,
    completedToday: 31,
    criticalCases: 3
  });

  useEffect(() => {
    fetchStats();
  }, []);

  // Listen for exam status updates
  useEffect(() => {
    const handleExamUpdate = async () => {
      console.log('Exam status updated, refreshing dashboard stats');
      await fetchStats();
    };

    window.addEventListener('examStatusUpdated', handleExamUpdate);
    
    return () => {
      window.removeEventListener('examStatusUpdated', handleExamUpdate);
    };
  }, []);

  // Auto-refresh stats every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto-refreshing dashboard stats');
      fetchStats();
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      if (isLocalMode) {
        const data = await api.getDashboardStats();
        console.log('Dashboard stats from API:', data);
        setStats({
          todayPatients: data.todayPatients || 0,
          pendingOrders: data.pendingOrders || 0,
          completedToday: data.completedToday || 0,
          criticalCases: data.criticalCases || 0
        });
      } else {
        const today = new Date().toISOString().split('T')[0];
        
        const { count: patientsCount } = await supabase
          .from("patients")
          .select("*", { count: "exact", head: true })
          .gte("created_at", today);

        const { count: pendingCount } = await supabase
          .from("exam_orders")
          .select("*", { count: "exact", head: true })
          .in("status", ["scheduled", "checked-in"]);

        const { count: completedCount } = await supabase
          .from("exam_orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed")
          .gte("updated_at", today);

        const { count: criticalCount } = await supabase
          .from("exam_orders")
          .select("*", { count: "exact", head: true })
          .eq("priority", "emergency")
          .neq("status", "completed");

        setStats({
          todayPatients: patientsCount || 0,
          pendingOrders: pendingCount || 0,
          completedToday: completedCount || 0,
          criticalCases: criticalCount || 0
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const roleLabels: Record<string, string> = {
    admin: t.dashboard.roleAdmin,
    radiologist: t.dashboard.roleRadiologist,
    technician: t.dashboard.roleTechnician,
    reception: t.dashboard.roleReception,
    billing: t.dashboard.roleBilling
  };

  const getUserName = () => {
    if (isLocalMode && user) {
      return (user as any).fullName || (user as any).email?.split("@")[0] || t.dashboard.user;
    }
    if (user && 'user_metadata' in user && user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    return (user as any)?.email?.split("@")[0] || t.dashboard.user;
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">{t.dashboard.pageTitle}</h1>
        <p className="text-muted-foreground">
          {t.dashboard.greeting} {getUserName()}! 
          {userRole && ` - ${roleLabels[userRole]}`}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={t.dashboard.todayPatients}
          value={stats.todayPatients}
          change={`+12% ${t.dashboard.changeFromYesterday}`}
          changeType="positive"
          icon={Users}
          iconColor="text-primary"
          className="animate-slide-up opacity-0 stagger-1"
          style={{ animationFillMode: "forwards" } as React.CSSProperties}
        />
        <StatsCard
          title={t.dashboard.pendingOrders}
          value={stats.pendingOrders}
          change={`${stats.criticalCases} ${t.dashboard.emergencyCases}`}
          changeType="neutral"
          icon={ClipboardList}
          iconColor="text-info"
          className="animate-slide-up opacity-0 stagger-2"
          style={{ animationFillMode: "forwards" } as React.CSSProperties}
        />
        <StatsCard
          title={t.dashboard.completedToday}
          value={stats.completedToday}
          change={`+8% ${t.dashboard.efficiency}`}
          changeType="positive"
          icon={CheckCircle}
          iconColor="text-success"
          className="animate-slide-up opacity-0 stagger-3"
          style={{ animationFillMode: "forwards" } as React.CSSProperties}
        />
        <StatsCard
          title={t.dashboard.criticalCases}
          value={stats.criticalCases}
          change={t.dashboard.requiresAttention}
          changeType="negative"
          icon={AlertTriangle}
          iconColor="text-warning"
          className="animate-slide-up opacity-0 stagger-4"
          style={{ animationFillMode: "forwards" } as React.CSSProperties}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Patient Queue */}
        <div className="lg:col-span-2">
          <PatientQueue />
        </div>

        {/* Right column - Upcoming */}
        <div>
          <UpcomingAppointments />
        </div>
      </div>

      {/* Charts and Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExamChart />
        <div>
          <BillingChart />
          <DeviceStatus />
        </div>
      </div>
    </div>
  );
}
