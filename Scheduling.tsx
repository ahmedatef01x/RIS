import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, Filter, Loader2, X, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { api, USE_LOCAL_API } from "@/lib/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { APPOINTMENT_STATUSES, onStatusUpdate } from "@/lib/appointmentStatus";
import { useI18n } from "@/lib/i18n";

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00"
];

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

const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Scheduling() {
  const { t } = useI18n();
  const [view, setView] = useState<"day" | "week">("day");
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDevice, setEditDevice] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      if (USE_LOCAL_API) {
        const data = await api.getAppointments({ date: dateStr });
        setAppointments(data || []);
      } else {
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            patients (full_name, mrn),
            devices (name, room, type),
            exam_orders (exam_type)
          `)
          .gte('scheduled_time', startOfDay.toISOString())
          .lte('scheduled_time', endOfDay.toISOString())
          .order('scheduled_time', { ascending: true });

        if (error) throw error;
        setAppointments(data || []);
      }
    } catch (error) {
      toast.error(t.scheduling.loadError);
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
      toast.error(t.scheduling.deviceError);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDevices();
  }, [currentDate]);

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
  }, [currentDate]);

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

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto-refreshing appointments');
      fetchAppointments();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [currentDate]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const filteredDevices = selectedRoom === "all" 
    ? devices 
    : devices.filter(d => d.id === selectedRoom);

  const getPatientName = (apt: any) => {
    if (USE_LOCAL_API) {
      return apt.patient_name || apt.patients?.full_name || "-";
    }
    return apt.patients?.full_name || "-";
  };

  const getExamType = (apt: any) => {
    if (USE_LOCAL_API) {
      return apt.exam_type || apt.exam_orders?.exam_type || "-";
    }
    return apt.exam_orders?.exam_type || "-";
  };

  const getAppointmentForSlot = (deviceId: string, time: string) => {
    return appointments.find(apt => {
      // Don't show cancelled appointments in calendar
      if (apt.status === 'cancelled') return false;
      if (apt.device_id !== deviceId) return false;
      const aptTime = new Date(apt.scheduled_time);
      const aptTimeStr = aptTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      return aptTimeStr === time;
    });
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    
    try {
      if (USE_LOCAL_API) {
        await api.cancelAppointment(selectedAppointment.id);
      } else {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', selectedAppointment.id);
        if (error) throw error;
      }
      
      toast.success("تم إلغاء الموعد");
      setDetailsOpen(false);
      setSelectedAppointment(null);
      fetchAppointments();
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('examStatusUpdated', { detail: { id: selectedAppointment.id, status: 'cancelled' } }));
    } catch (error) {
      toast.error("خطأ في إلغاء الموعد");
    }
  };

  const handleOpenEdit = () => {
    if (!selectedAppointment) return;
    const aptDate = new Date(selectedAppointment.scheduled_time);
    const dateStr = aptDate.toISOString().split('T')[0];
    const timeStr = aptDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    setEditDate(dateStr);
    setEditTime(timeStr);
    setEditDevice(selectedAppointment.device_id || "");
    setEditNotes(selectedAppointment.notes || "");
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAppointment || !editDate || !editTime) {
      toast.error("يرجى ملء جميع البيانات المطلوبة");
      return;
    }

    setEditLoading(true);
    try {
      const scheduledTime = new Date(`${editDate}T${editTime}`);
      
      if (USE_LOCAL_API) {
        await api.updateAppointment(selectedAppointment.id, {
          scheduled_time: scheduledTime.toISOString(),
          device_id: editDevice || null,
          notes: editNotes
        });
      } else {
        const { error } = await supabase
          .from('appointments')
          .update({
            scheduled_time: scheduledTime.toISOString(),
            device_id: editDevice || null
          })
          .eq('id', selectedAppointment.id);
        if (error) throw error;
      }
      
      toast.success("تم تحديث الموعد بنجاح");
      setIsEditing(false);
      setDetailsOpen(false);
      setSelectedAppointment(null);
      fetchAppointments();
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('examStatusUpdated', { detail: { id: selectedAppointment.id, status: 'updated' } }));
    } catch (error: any) {
      toast.error("خطأ في تحديث الموعد");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الجدولة</h1>
          <p className="text-muted-foreground">إدارة المواعيد والغرف</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          موعد جديد
        </Button>
      </div>

      <Card className="glass-card border-0 animate-slide-up opacity-0 stagger-1" style={{ animationFillMode: "forwards" }}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  {currentDate.toLocaleDateString("ar-EG", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={goToToday}>اليوم</Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger className="w-40 bg-muted/50">
                    <SelectValue placeholder="كل الغرف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الغرف</SelectItem>
                      {devices.length === 0 ? (
                        <SelectItem value="no-devices" disabled>لا توجد أجهزة</SelectItem>
                      ) : (
                        devices.map((device) => (
                          <SelectItem key={device.id} value={device.id}>{device.name}</SelectItem>
                        ))
                      )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={view === "day" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("day")}
                >
                  يوم
                </Button>
                <Button
                  variant={view === "week" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("week")}
                >
                  أسبوع
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="animate-slide-up opacity-0 stagger-2" style={{ animationFillMode: "forwards" }}>
        {loading ? (
          <Card className="glass-card border-0">
            <CardContent className="py-12 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : view === "day" ? (
          <Card className="glass-card border-0 overflow-hidden">
            <CardContent className="p-0">
              <div className="grid" style={{ gridTemplateColumns: `80px repeat(${filteredDevices.length}, 1fr)` }}>
                <div className="p-3 bg-muted/50 border-b border-r border-border font-medium text-sm text-muted-foreground">
                  الوقت
                </div>
                {filteredDevices.map((device) => (
                  <div key={device.id} className="p-3 bg-muted/50 border-b border-border text-center">
                    <p className="font-medium text-foreground">{device.name}</p>
                    <Badge variant="outline" className="mt-1">{device.type}</Badge>
                  </div>
                ))}

                {timeSlots.map((time) => (
                  <React.Fragment key={time}>
                    <div key={`time-${time}`} className="p-3 border-r border-b border-border text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {time}
                    </div>
                    {filteredDevices.map((device) => {
                      const apt = getAppointmentForSlot(device.id, time);
                      return (
                        <div
                          key={`${device.id}-${time}`}
                          className={cn(
                            "p-2 border-b border-border min-h-[60px] transition-smooth",
                            !apt && "hover:bg-muted/30 cursor-pointer"
                          )}
                          onClick={() => apt && (setSelectedAppointment(apt), setDetailsOpen(true))}
                        >
                          {apt && (
                            <div className={cn(
                              "p-2 rounded-lg border text-xs h-full cursor-pointer hover:shadow-md transition-all",
                              statusColors[apt.status] || statusColors.scheduled
                            )}>
                              <p className="font-medium">{getPatientName(apt)}</p>
                              <p className="opacity-80">{getExamType(apt)}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card border-0">
            <CardContent className="p-6">
              <div className="grid grid-cols-7 gap-4">
                {weekDays.map((day, index) => {
                  const date = new Date(currentDate);
                  date.setDate(date.getDate() - date.getDay() + index);
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div key={day} className="text-center">
                      <div className={cn(
                        "p-3 rounded-lg mb-2",
                        isToday ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <p className="text-xs font-medium">{day}</p>
                        <p className="text-2xl font-bold">{date.getDate()}</p>
                      </div>
                      <div className="space-y-2">
                        {appointments.slice(0, 3).map((apt, i) => (
                          <div
                            key={`${day}-${apt.id}-${i}`}
                            className={cn(
                              "p-2 rounded text-xs border",
                              statusColors[apt.status] || statusColors.scheduled
                            )}
                          >
                            <p className="font-medium">
                              {new Date(apt.scheduled_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="truncate">{getExamType(apt)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="glass-card border-0 animate-slide-up opacity-0 stagger-3" style={{ animationFillMode: "forwards" }}>
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-6">
            {Object.entries({ scheduled: "مجدول", confirmed: "مؤكد", in_progress: "جاري", completed: "مكتمل", cancelled: "ملغي" }).map(([status, label]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={cn("w-4 h-4 rounded border", statusColors[status])} />
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تفاصيل الموعد</DialogTitle>
            <DialogDescription>تفاصيل الموعد المحدد</DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              {!isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">رقم الزيارة</p>
                      <Badge variant="outline" className="font-mono text-sm bg-primary/10">
                        {selectedAppointment.accession_number || "-"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">المريض</p>
                      <p className="font-medium">{getPatientName(selectedAppointment)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">نوع الفحص</p>
                      <p className="font-medium">{getExamType(selectedAppointment)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">الوقت</p>
                      <p className="font-medium">{new Date(selectedAppointment.scheduled_time).toLocaleString('ar-EG')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">الحالة</p>
                      <Badge className="mt-1">{selectedAppointment.status}</Badge>
                    </div>
                    {selectedAppointment.device_name && (
                      <div>
                        <p className="text-xs text-muted-foreground">الجهاز</p>
                        <p className="font-medium">{selectedAppointment.device_name}</p>
                      </div>
                    )}
                    {selectedAppointment.notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">الملاحظات</p>
                        <p className="text-sm">{selectedAppointment.notes}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">التاريخ</p>
                      <Input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="bg-muted/50"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">الوقت</p>
                      <Select value={editTime} onValueChange={setEditTime}>
                        <SelectTrigger className="bg-muted/50">
                          <SelectValue placeholder="اختر الوقت" />
                        </SelectTrigger>
                        <SelectContent>
                          {["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"].map((time) => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">الجهاز</p>
                      <Select value={editDevice} onValueChange={setEditDevice}>
                        <SelectTrigger className="bg-muted/50">
                          <SelectValue placeholder="اختر الجهاز" />
                        </SelectTrigger>
                        <SelectContent>
                          {devices.map((device) => (
                            <SelectItem key={device.id} value={device.id}>
                              {device.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-notes" className="text-xs text-muted-foreground">ملاحظات</Label>
                      <Textarea
                        id="edit-notes"
                        placeholder="أضف ملاحظات إضافية..."
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="mt-2 bg-muted/50"
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex gap-2 pt-4">
                {selectedAppointment.status !== 'cancelled' && !isEditing && (
                  <>
                    <Button 
                      variant="default" 
                      className="w-full gap-2" 
                      onClick={handleOpenEdit}
                    >
                      <Edit2 className="w-4 h-4" />
                      تعديل
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-full" 
                      onClick={handleCancelAppointment}
                    >
                      <X className="w-4 h-4 mr-2" />
                      إلغاء
                    </Button>
                  </>
                )}
                {isEditing && (
                  <>
                    <Button 
                      variant="default" 
                      className="w-full" 
                      onClick={handleSaveEdit}
                      disabled={editLoading}
                    >
                      {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setIsEditing(false)}
                      disabled={editLoading}
                    >
                      إلغاء التعديل
                    </Button>
                  </>
                )}
                {!isEditing && (
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setDetailsOpen(false)}
                  >
                    إغلاق
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
