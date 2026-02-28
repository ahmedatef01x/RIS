import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, Filter, RefreshCw, Play, CheckCircle, Clock, AlertTriangle,
  User, Monitor, MoreHorizontal, Loader2, DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExamTicket } from "@/components/ExamTicket";
import { supabase } from "@/integrations/supabase/client";
import { api, USE_LOCAL_API } from "@/lib/api";
import { APPOINTMENT_STATUSES, emitStatusUpdate } from "@/lib/appointmentStatus";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

const statusConfig = {
  "scheduled": { label: "مجدول", icon: Clock, color: "status-scheduled" },
  "checked_in": { label: "وصل", icon: User, color: "status-in-progress" },
  "in_progress": { label: "جاري", icon: Play, color: "bg-info/10 text-info border-info/30" },
  "completed": { label: "مكتمل", icon: CheckCircle, color: "status-completed" },
  "cancelled": { label: "تم الإلغاء", icon: AlertTriangle, color: "bg-destructive/10 text-destructive border-destructive/30" },
};

const priorityConfig = {
  "normal": { label: "عادي", color: "bg-muted text-muted-foreground" },
  "urgent": { label: "عاجل", color: "bg-warning/10 text-warning border-warning/30" },
  "emergency": { label: "طوارئ", color: "bg-destructive/10 text-destructive border-destructive/30" },
};

export default function Worklist() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDevice, setFilterDevice] = useState<string>("all");
  const [worklistItems, setWorklistItems] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [ticketOpen, setTicketOpen] = useState(false);

  const fetchWorklist = async () => {
    setLoading(true);
    try {
      if (USE_LOCAL_API) {
        const data = await api.getExamOrders();
        setWorklistItems(data || []);
      } else {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('exam_orders')
          .select(`
            *,
            patients (full_name, mrn),
            devices (name, room)
          `)
          .gte('scheduled_date', today)
          .order('scheduled_date', { ascending: true });

        if (error) throw error;
        setWorklistItems(data || []);
      }
    } catch (error: any) {
      toast.error(t.worklist.loadError);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      if (USE_LOCAL_API) {
        const data = await api.getDevices();
        setDevices(data || []);
      } else {
        const { data } = await supabase.from('devices').select('*');
        setDevices(data || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchWorklist();
    fetchDevices();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchWorklist();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      console.log(`🔄 Updating status for ${id} to ${newStatus}`);
      
      if (USE_LOCAL_API) {
        console.log('📡 Using LOCAL API');
        // Try to update as exam_order first
        try {
          const result = await api.updateExamOrderStatus(id, newStatus);
          console.log('✅ Exam order update successful:', result);
        } catch (examError) {
          // If exam_order update fails, try appointment
          console.log('⚠️ Exam order update failed, trying appointment update:', examError);
          const result = await api.updateAppointmentStatus(id, newStatus);
          console.log('✅ Appointment update successful:', result);
        }
      } else {
        console.log('📡 Using SUPABASE API');
        const { error } = await supabase
          .from('exam_orders')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;
      }
      
      // Update the local state immediately for better UX
      setWorklistItems(prevItems =>
        prevItems.map(item => 
          item.id === id ? { ...item, status: newStatus } : item
        )
      );
      
      toast.success("تم تحديث الحالة");
      console.log('✨ Local state updated');
      
      // Emit status update event for real-time synchronization
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
      toast.error("خطأ في تحديث الحالة");
      console.error("❌ Update status error:", error);
    }
  };

  const cancelExamOrder = async (id: string) => {
    try {
      if (USE_LOCAL_API) {
        // Try to cancel as exam_order first
        try {
          await api.updateExamOrderStatus(id, 'cancelled');
        } catch (examError) {
          // If exam_order cancel fails, try appointment
          console.log('Exam order cancel failed, trying appointment cancel');
          await api.cancelAppointment(id);
        }
      } else {
        const { error } = await supabase
          .from('exam_orders')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      }
      
      // Update the local state immediately for better UX
      setWorklistItems(prevItems =>
        prevItems.map(item => 
          item.id === id ? { ...item, status: 'cancelled' } : item
        )
      );
      
      toast.success("تم إلغاء الفحص");
      
      // Fetch fresh data from server immediately
      await fetchWorklist();
      
      // Dispatch a custom event to notify Dashboard
      window.dispatchEvent(new CustomEvent('examStatusUpdated', { 
        detail: { id, status: 'cancelled' } 
      }));
    } catch (error) {
      toast.error("خطأ في إلغاء الفحص");
      console.error("Cancel exam order error:", error);
    }
  };

  const printTicket = (item: any) => {
    setSelectedItem(item);
    setTicketOpen(true);
  };

  const getPatientName = (item: any) => {
    if (USE_LOCAL_API) {
      return item.patient_name || item.patients?.full_name || "-";
    }
    return item.patients?.full_name || "-";
  };

  const getPatientMrn = (item: any) => {
    if (USE_LOCAL_API) {
      return item.patient_acc_num || item.patient_mrn || item.patients?.mrn || "-";
    }
    return item.patients?.mrn || "-";
  };

  const getDeviceName = (item: any) => {
    if (USE_LOCAL_API) {
      return item.device_name || item.devices?.name || "—";
    }
    return item.devices?.name || "—";
  };

  const getDeviceRoom = (item: any) => {
    if (USE_LOCAL_API) {
      return item.device_room || item.devices?.room || "";
    }
    return item.devices?.room || "";
  };

  const filteredItems = worklistItems.filter(item => {
    // Hide cancelled by default unless specifically filtering for them
    if (filterStatus !== "cancelled" && item.status === "cancelled") {
      return false;
    }
    
    const patientName = String(getPatientName(item)).toLowerCase();
    const patientMrn = String(getPatientMrn(item)).toLowerCase();
    const examType = String(item.exam_type || '').toLowerCase();
    const matchesSearch = 
      patientName.includes(searchTerm.toLowerCase()) ||
      patientMrn.includes(searchTerm.toLowerCase()) ||
      examType.includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    const matchesDevice = filterDevice === "all" || item.device_id === filterDevice;
    return matchesSearch && matchesStatus && matchesDevice;
  });

  const statusCounts = {
    scheduled: worklistItems.filter(i => i.status === "scheduled").length,
    checked_in: worklistItems.filter(i => i.status === "checked_in").length,
    in_progress: worklistItems.filter(i => i.status === "in_progress").length,
    completed: worklistItems.filter(i => i.status === "completed").length,
    cancelled: worklistItems.filter(i => i.status === "cancelled").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.worklist.pageTitle}</h1>
          <p className="text-muted-foreground">{t.dashboard.todayExams}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={fetchWorklist}>
          <RefreshCw className="w-4 h-4" />
          {t.worklist.refresh}
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 animate-slide-up opacity-0 stagger-1" style={{ animationFillMode: "forwards" }}>
        {[
          { label: t.worklist.scheduled, count: statusCounts.scheduled, color: "text-info" },
          { label: t.worklist.checkedIn, count: statusCounts.checked_in, color: "text-warning" },
          { label: t.worklist.inProgress, count: statusCounts.in_progress, color: "text-primary" },
          { label: t.worklist.completed, count: statusCounts.completed, color: "text-success" },
          { label: t.worklist.cancelled, count: statusCounts.cancelled, color: "text-destructive" },
        ].map((stat) => (
          <Card key={stat.label} className="glass-card border-0">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={cn("text-3xl font-bold", stat.color)}>{stat.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card border-0 animate-slide-up opacity-0 stagger-2" style={{ animationFillMode: "forwards" }}>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو MRN أو نوع الفحص..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-muted/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36 bg-muted/50">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="scheduled">مجدول</SelectItem>
                  <SelectItem value="checked_in">وصل</SelectItem>
                  <SelectItem value="in_progress">جاري</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterDevice} onValueChange={setFilterDevice}>
                <SelectTrigger className="w-40 bg-muted/50">
                  <SelectValue placeholder="الجهاز" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأجهزة</SelectItem>
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>{device.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-0 animate-slide-up opacity-0 stagger-3" style={{ animationFillMode: "forwards" }}>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">رقم الزيارة</TableHead>
                  <TableHead className="font-semibold">المريض</TableHead>
                  <TableHead className="font-semibold">الفحص</TableHead>
                  <TableHead className="font-semibold">الجهاز / الغرفة</TableHead>
                  <TableHead className="font-semibold">الموعد</TableHead>
                  <TableHead className="font-semibold">الأولوية</TableHead>
                  <TableHead className="font-semibold">الحالة</TableHead>
                  <TableHead className="font-semibold">حالة الدفع</TableHead>
                  <TableHead className="font-semibold w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد فحوصات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const status = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.scheduled;
                    const priority = priorityConfig[item.priority as keyof typeof priorityConfig] || priorityConfig.normal;
                    const StatusIcon = status.icon;
                    
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-smooth">
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-sm bg-primary/10">
                            {item.accession_number || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{getPatientName(item)}</p>
                            <p className="text-sm text-muted-foreground">{getPatientMrn(item)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground">{item.exam_type}</p>
                          {item.protocol && <p className="text-sm text-muted-foreground">{item.protocol}</p>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-foreground">{getDeviceName(item)}</p>
                              <p className="text-sm text-muted-foreground">{getDeviceRoom(item)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {item.scheduled_date ? new Date(item.scheduled_date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(priority.color, "capitalize")}>
                            {item.priority === "emergency" && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {priority.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(status.color, "gap-1")}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm text-foreground">{item.billing_status || '—'}</p>
                            {item.billing_total != null && (
                              <p className="text-xs text-muted-foreground">{Number(item.billing_total).toFixed(2)} EGP</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => updateStatus(item.id, 'in_progress')}>
                                بدء الفحص
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(item.id, 'checked_in')}>
                                تسجيل وصول
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(item.id, 'completed')}>
                                إكمال
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => printTicket(item)}>
                                طباعة تذكرة
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => cancelExamOrder(item.id)} className="text-destructive">إلغاء</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ExamTicket 
        item={selectedItem} 
        isOpen={ticketOpen} 
        onClose={() => {
          setTicketOpen(false);
          setSelectedItem(null);
          fetchWorklist(); // Refresh data after closing
        }}
      />
    </div>
  );
}
