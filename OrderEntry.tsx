import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardList, Search, User, Stethoscope, Calendar, FileText,
  ChevronRight, CheckCircle, AlertTriangle, Zap, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { api, USE_LOCAL_API } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

const examTypes = [
  { category: "X-Ray", items: ["Chest PA/Lat", "Lumbar Spine AP/Lat", "Cervical Spine", "Abdomen", "Pelvis", "Extremities"] },
  { category: "CT Scan", items: ["CT Head w/o Contrast", "CT Head w/ Contrast", "CT Chest", "CT Abdomen/Pelvis", "CT Angio"] },
  { category: "MRI", items: ["MRI Brain", "MRI Spine Cervical", "MRI Spine Lumbar", "MRI Knee", "MRI Shoulder"] },
  { category: "Ultrasound", items: ["Abdomen Complete", "Pelvic", "Thyroid", "Doppler Lower Extremity", "Echocardiogram"] },
  { category: "Fluoroscopy", items: ["Upper GI Series", "Barium Swallow", "Barium Enema", "VCUG"] },
];

const steps = [
  { id: 1, title: "Patient Information", icon: User },
  { id: 2, title: "Select Exam", icon: Stethoscope },
  { id: 3, title: "Scheduling", icon: Calendar },
  { id: 4, title: "Confirmation", icon: CheckCircle },
];

export default function OrderEntry() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(1);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("");
  const [priority, setPriority] = useState("normal");
  const [clinicalInfo, setClinicalInfo] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      if (USE_LOCAL_API) {
        const data = await api.getDevices();
        // Filter for active devices
        setDevices((data || []).filter((d: any) => d.is_active !== false));
      } else {
        const { data } = await supabase.from('devices').select('*').eq('status', 'available');
        setDevices(data || []);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error(t.orders.deviceError);
    }
  };

  const handlePatientSearch = async () => {
    if (!patientSearch.trim()) return;
    
    setSearching(true);
    try {
      if (USE_LOCAL_API) {
        const data = await api.getPatients(patientSearch);
        setPatients(data || []);
        if (!data || data.length === 0) toast.info(t.orders.patientNotFound);
      } else {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .or(`full_name.ilike.%${patientSearch}%,mrn.ilike.%${patientSearch}%,phone.ilike.%${patientSearch}%`)
          .limit(10);

        if (error) throw error;
        setPatients(data || []);
        if (data && data.length === 0) toast.info(t.orders.patientNotFound);
      }
    } catch (error) {
      toast.error(t.orders.searchError);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient || !selectedExam || !appointmentDate || !appointmentTime) {
      toast.error(t.orders.completeAllFields);
      return;
    }

    setLoading(true);
    try {
      const scheduledDate = new Date(`${appointmentDate}T${appointmentTime}`);
      let order;
      if (USE_LOCAL_API) {
        order = await api.createExamOrder({
          patient_id: selectedPatient.id,
          exam_type: selectedCategory,
          protocol: selectedExam,
          priority,
          device_id: selectedDevice || null,
          scheduled_date: scheduledDate.toISOString(),
          notes: clinicalInfo
        });

        // create appointment via local API
        await api.createAppointment({
          patient_id: selectedPatient.id,
          exam_order_id: order.id || order.id,
          device_id: selectedDevice || null,
          scheduled_time: scheduledDate.toISOString(),
          duration_minutes: 30
        });
      } else {
        const { data: orderData, error: orderError } = await supabase
          .from('exam_orders')
          .insert({
            patient_id: selectedPatient.id,
            exam_type: selectedCategory, // Store only category like 'CT', 'MRI'
            protocol: selectedExam, // Store specific exam like 'Chest PA/Lat'
            priority,
            notes: clinicalInfo,
            device_id: selectedDevice || null,
            scheduled_date: scheduledDate.toISOString(),
            created_by: user?.id,
            status: 'scheduled'
          })
          .select()
          .single();

        if (orderError) throw orderError;

        order = orderData;

        // Create appointment
        await supabase.from('appointments').insert({
          patient_id: selectedPatient.id,
          exam_order_id: order.id,
          device_id: selectedDevice || null,
          scheduled_time: scheduledDate.toISOString(),
          created_by: user?.id,
          status: 'scheduled'
        });
      }

      toast.success("تم إنشاء الطلب بنجاح!", {
        description: `${selectedExam} للمريض ${selectedPatient.full_name}`,
      });
      
      // Reset form
      setCurrentStep(1);
      setSelectedPatient(null);
      setPatients([]);
      setSelectedCategory("");
      setSelectedExam("");
      setSelectedDevice("");
      setPriority("normal");
      setClinicalInfo("");
      setAppointmentDate("");
      setAppointmentTime("");
      setPatientSearch("");
    } catch (error: any) {
      toast.error("خطأ في إنشاء الطلب", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">طلب فحص جديد</h1>
        <p className="text-muted-foreground">إنشاء طلبات فحوصات الأشعة</p>
      </div>

      <Card className="glass-card border-0 animate-slide-up opacity-0 stagger-1" style={{ animationFillMode: "forwards" }}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-smooth",
                      isCompleted ? "bg-success text-success-foreground" :
                      isActive ? "bg-primary text-primary-foreground" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className={cn(
                        "font-medium text-sm",
                        isActive ? "text-primary" : isCompleted ? "text-success" : "text-muted-foreground"
                      )}>
                        خطوة {step.id}
                      </p>
                      <p className={cn(
                        "text-sm",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {step.title}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "flex-1 h-0.5 mx-4",
                      currentStep > step.id ? "bg-success" : "bg-border"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="animate-slide-up opacity-0 stagger-2" style={{ animationFillMode: "forwards" }}>
        {currentStep === 1 && (
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                بيانات المريض
              </CardTitle>
              <CardDescription>ابحث عن مريض موجود</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بـ MRN أو الاسم أو رقم الهاتف..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePatientSearch()}
                    className="pl-10 h-12 bg-muted/50"
                  />
                </div>
                <Button onClick={handlePatientSearch} className="h-12 px-6" disabled={searching}>
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "بحث"}
                </Button>
              </div>

              {patients.length > 0 && !selectedPatient && (
                <div className="space-y-2">
                  {patients.map((patient) => (
                    <Card 
                      key={patient.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-smooth"
                      onClick={() => setSelectedPatient(patient)}
                    >
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{patient.full_name}</p>
                            <p className="text-sm text-muted-foreground">{patient.mrn} • {patient.gender} • {patient.age} سنة</p>
                          </div>
                          <Badge variant="outline">{patient.phone}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {selectedPatient && (
                <Card className="bg-success/5 border-success/20">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                          <User className="w-6 h-6 text-success" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{selectedPatient.full_name}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{selectedPatient.mrn}</span>
                            <span>{selectedPatient.gender}</span>
                            <span>{selectedPatient.age} سنة</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-success text-success-foreground">تم الاختيار</Badge>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>تغيير</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button 
                  onClick={() => setCurrentStep(2)} 
                  disabled={!selectedPatient}
                  className="gap-2"
                >
                  التالي <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary" />
                اختيار الفحص
              </CardTitle>
              <CardDescription>اختر نوع الفحص والأولوية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>فئة الفحص</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {examTypes.map((type) => (
                      <Button
                        key={type.category}
                        variant={selectedCategory === type.category ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => {
                          setSelectedCategory(type.category);
                          setSelectedExam("");
                        }}
                      >
                        {type.category}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>الفحص المحدد</Label>
                  {selectedCategory ? (
                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                      {examTypes.find(t => t.category === selectedCategory)?.items.map((exam) => (
                        <Button
                          key={exam}
                          variant={selectedExam === exam ? "default" : "outline"}
                          className="justify-start"
                          onClick={() => setSelectedExam(exam)}
                        >
                          {exam}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm p-4 bg-muted/50 rounded-lg">
                      اختر فئة الفحص أولاً
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Label>مستوى الأولوية</Label>
                <RadioGroup value={priority} onValueChange={setPriority} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="normal" id="normal" />
                    <Label htmlFor="normal" className="flex items-center gap-2 cursor-pointer">
                      <Badge variant="outline">عادي</Badge>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="urgent" id="urgent" />
                    <Label htmlFor="urgent" className="flex items-center gap-2 cursor-pointer">
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        عاجل
                      </Badge>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="emergency" id="emergency" />
                    <Label htmlFor="emergency" className="flex items-center gap-2 cursor-pointer">
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                        <Zap className="w-3 h-3 mr-1" />
                        طوارئ
                      </Badge>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinical">المعلومات السريرية</Label>
                <Textarea
                  id="clinical"
                  placeholder="أدخل التاريخ المرضي وسبب الفحص..."
                  value={clinicalInfo}
                  onChange={(e) => setClinicalInfo(e.target.value)}
                  className="min-h-[100px] bg-muted/50"
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>السابق</Button>
                <Button 
                  onClick={() => setCurrentStep(3)} 
                  disabled={!selectedExam}
                  className="gap-2"
                >
                  التالي <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                جدولة الموعد
              </CardTitle>
              <CardDescription>اختر التاريخ والوقت المفضل</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="date">التاريخ</Label>
                  <Input
                    id="date"
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="bg-muted/50"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">الوقت</Label>
                  <Select value={appointmentTime} onValueChange={setAppointmentTime}>
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue placeholder="اختر الوقت" />
                    </SelectTrigger>
                    <SelectContent>
                      {["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "14:00", "14:30", "15:00", "15:30", "16:00"].map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الجهاز</Label>
                  <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue placeholder="اختر الجهاز" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((device) => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name} - {device.room}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>السابق</Button>
                <Button 
                  onClick={() => setCurrentStep(4)} 
                  disabled={!appointmentDate || !appointmentTime}
                  className="gap-2"
                >
                  التالي <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                ملخص الطلب
              </CardTitle>
              <CardDescription>راجع وأكد تفاصيل الطلب</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Card className="bg-muted/30 border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">المريض</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold">{selectedPatient?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedPatient?.mrn}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">الفحص</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold">{selectedExam}</p>
                    <p className="text-sm text-muted-foreground">{selectedCategory}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">الموعد</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold">{appointmentDate}</p>
                    <p className="text-sm text-muted-foreground">{appointmentTime}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">الأولوية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline" className={cn(
                      priority === "urgent" && "bg-warning/10 text-warning border-warning/30",
                      priority === "emergency" && "bg-destructive/10 text-destructive border-destructive/30"
                    )}>
                      {priority === "normal" ? "عادي" : priority === "urgent" ? "عاجل" : "طوارئ"}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {clinicalInfo && (
                <Card className="bg-muted/30 border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">المعلومات السريرية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{clinicalInfo}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>السابق</Button>
                <Button onClick={handleSubmit} className="gap-2" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  تأكيد الطلب
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
