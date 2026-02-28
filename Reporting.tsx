import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Search, Clock, User, CheckCircle, Save, Send, 
  Mic, Maximize2, Monitor, Loader2, Printer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { PACSViewer } from "@/components/pacs/PACSViewer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ReportPrintView } from "@/components/reports/ReportPrintView";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const templates = [
  { id: "normal-ct-chest", name: "CT Chest طبيعي", category: "CT" },
  { id: "normal-mri-brain", name: "MRI Brain طبيعي", category: "MRI" },
  { id: "normal-xray-chest", name: "X-Ray Chest طبيعي", category: "X-Ray" },
  { id: "pneumonia", name: "التهاب رئوي", category: "CT" },
  { id: "fracture", name: "كسر", category: "X-Ray" },
];

export default function Reporting() {
  const { user } = useAuth();
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPACS, setShowPACS] = useState(false);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchPendingReports = async () => {
    setLoading(true);
    try {
      // Fetch exam orders that need reports
      const { data: orders, error } = await supabase
        .from('exam_orders')
        .select(`
          *,
          patients (full_name, mrn),
          reports (id, status, findings, impression)
        `)
        .in('status', ['completed', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform to report format
      const reports = (orders || []).map(order => ({
        id: order.id,
        patient: order.patients?.full_name,
        mrn: order.patients?.mrn,
        exam: order.exam_type,
        date: new Date(order.created_at).toLocaleDateString('ar-EG'),
        priority: order.priority,
        status: order.reports?.[0]?.status || 'pending',
        report_id: order.reports?.[0]?.id,
        existing_findings: order.reports?.[0]?.findings,
        existing_impression: order.reports?.[0]?.impression,
        patient_id: order.patient_id,
      }));

      setPendingReports(reports);
    } catch (error) {
      toast.error("خطأ في تحميل التقارير");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingReports();
  }, []);

  const handleSelectCase = (report: any) => {
    setSelectedCase(report);
    setFindings(report.existing_findings || "");
    setImpression(report.existing_impression || "");
  };

  const handleSaveDraft = async () => {
    if (!selectedCase) return;
    
    setSaving(true);
    try {
      if (selectedCase.report_id) {
        // Update existing report
        await supabase
          .from('reports')
          .update({ findings, impression, status: 'draft' })
          .eq('id', selectedCase.report_id);
      } else {
        // Create new report
        await supabase
          .from('reports')
          .insert({
            exam_order_id: selectedCase.id,
            patient_id: selectedCase.patient_id,
            radiologist_id: user?.id,
            findings,
            impression,
            status: 'draft'
          });
      }
      toast.success("تم حفظ المسودة");
      fetchPendingReports();
    } catch (error) {
      toast.error("خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedCase || !findings || !impression) {
      toast.error("يرجى إكمال النتائج والانطباع");
      return;
    }

    setSaving(true);
    try {
      if (selectedCase.report_id) {
        await supabase
          .from('reports')
          .update({ 
            findings, 
            impression, 
            status: 'finalized',
            finalized_at: new Date().toISOString()
          })
          .eq('id', selectedCase.report_id);
      } else {
        await supabase
          .from('reports')
          .insert({
            exam_order_id: selectedCase.id,
            patient_id: selectedCase.patient_id,
            radiologist_id: user?.id,
            findings,
            impression,
            status: 'finalized',
            finalized_at: new Date().toISOString()
          });
      }

      toast.success("تم اعتماد التقرير!", {
        description: "سيتم إخطار المريض.",
      });
      
      setSelectedCase(null);
      setFindings("");
      setImpression("");
      fetchPendingReports();
    } catch (error) {
      toast.error("خطأ في اعتماد التقرير");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!selectedCase || !findings || !impression) {
      toast.error("يرجى إكمال التقرير أولاً");
      return;
    }
    setShowPrintPreview(true);
  };

  const printReport = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("يرجى السماح بالنوافذ المنبثقة للطباعة");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <title>تقرير الأشعة - ${selectedCase?.patient}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; }
          @page { size: A4; margin: 1cm; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
    
    setShowPrintPreview(false);
  };

  const applyTemplate = (templateId: string) => {
    if (templateId === "normal-ct-chest") {
      setFindings("الرئتان صافيتان بدون تجمعات أو انصباب جنبي أو استرواح صدري. حجم القلب طبيعي. المنصف طبيعي. لا توجد تضخمات لمفاوية. الهياكل العظمية المرئية سليمة.");
      setImpression("فحص CT صدري طبيعي. لا توجد عمليات قلبية رئوية حادة.");
    } else if (templateId === "normal-mri-brain") {
      setFindings("النسيج الدماغي يظهر كثافة وشكل طبيعي. لا يوجد دليل على احتشاء حاد أو نزيف أو كتلة. البطينات والأتلام مناسبة لعمر المريض. لا يوجد تعزيز غير طبيعي.");
      setImpression("MRI للدماغ طبيعي. لا توجد تشوهات داخل الجمجمة حادة.");
    }
    setSelectedTemplate(templateId);
    toast.info("تم تطبيق القالب");
  };

  const filteredReports = pendingReports.filter(r => {
    const patient = String(r.patient || '').toLowerCase();
    const mrn = String(r.mrn || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return patient.includes(term) || mrn.includes(term);
  });

  const pendingCount = pendingReports.filter(r => r.status === "pending").length;
  const draftCount = pendingReports.filter(r => r.status === "draft").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">التقارير</h1>
          <p className="text-muted-foreground">إنشاء وإدارة تقارير الأشعة</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
            {pendingCount} قيد الانتظار
          </Badge>
          <Badge variant="outline" className="bg-info/10 text-info border-info/30">
            {draftCount} مسودة
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card border-0 animate-slide-up opacity-0 stagger-1" style={{ animationFillMode: "forwards" }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              التقارير المعلقة
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-muted/50"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredReports.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد تقارير</p>
            ) : (
              filteredReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => handleSelectCase(report)}
                  className={cn(
                    "p-4 rounded-lg cursor-pointer transition-smooth",
                    selectedCase?.id === report.id 
                      ? "bg-primary/10 border border-primary/30" 
                      : "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{report.patient}</p>
                      <p className="text-sm text-muted-foreground">{report.mrn}</p>
                      <p className="text-sm text-muted-foreground mt-1">{report.exam}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className={cn(
                        report.priority === "urgent" && "bg-warning/10 text-warning border-warning/30",
                        report.priority === "emergency" && "bg-destructive/10 text-destructive border-destructive/30"
                      )}>
                        {report.priority === "normal" ? "عادي" : report.priority === "urgent" ? "عاجل" : "طوارئ"}
                      </Badge>
                      <Badge variant="outline" className={cn(
                        report.status === "draft" && "bg-info/10 text-info border-info/30",
                        report.status === "finalized" && "bg-success/10 text-success border-success/30"
                      )}>
                        {report.status === "pending" ? "معلق" : report.status === "draft" ? "مسودة" : "معتمد"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {report.date}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {selectedCase ? (
            <>
              <Card className="glass-card border-0 animate-slide-up opacity-0 stagger-2" style={{ animationFillMode: "forwards" }}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{selectedCase.patient}</p>
                        <p className="text-sm text-muted-foreground">{selectedCase.mrn} • {selectedCase.exam}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant={showPACS ? "default" : "outline"} 
                        size="sm" 
                        className="gap-2"
                        onClick={() => setShowPACS(!showPACS)}
                      >
                        <Monitor className="w-4 h-4" />
                        {showPACS ? "إخفاء PACS" : "عرض PACS"}
                      </Button>
                      <Button variant="outline" size="icon" className="h-9 w-9">
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {showPACS && (
                <div className="animate-slide-up">
                  <PACSViewer className="h-[500px]" />
                </div>
              )}

              <Card className="glass-card border-0 animate-slide-up opacity-0 stagger-3" style={{ animationFillMode: "forwards" }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">محرر التقرير</CardTitle>
                    <div className="flex items-center gap-2">
                      <Select value={selectedTemplate} onValueChange={applyTemplate}>
                        <SelectTrigger className="w-48 bg-muted/50">
                          <SelectValue placeholder="تطبيق قالب..." />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" className="h-10 w-10">
                        <Mic className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs defaultValue="findings">
                    <TabsList className="bg-muted/50">
                      <TabsTrigger value="findings">النتائج</TabsTrigger>
                      <TabsTrigger value="impression">الانطباع</TabsTrigger>
                    </TabsList>
                    <TabsContent value="findings" className="mt-4">
                      <Textarea
                        placeholder="أدخل النتائج التفصيلية..."
                        value={findings}
                        onChange={(e) => setFindings(e.target.value)}
                        className="min-h-[200px] bg-muted/50"
                        dir="rtl"
                      />
                    </TabsContent>
                    <TabsContent value="impression" className="mt-4">
                      <Textarea
                        placeholder="أدخل الانطباع/الخلاصة..."
                        value={impression}
                        onChange={(e) => setImpression(e.target.value)}
                        className="min-h-[200px] bg-muted/50"
                        dir="rtl"
                      />
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-between">
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleSaveDraft} className="gap-2" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        حفظ مسودة
                      </Button>
                      <Button variant="outline" onClick={handlePrint} className="gap-2" disabled={!findings || !impression}>
                        <Printer className="w-4 h-4" />
                        طباعة
                      </Button>
                    </div>
                    <Button onClick={handleFinalize} className="gap-2" disabled={!findings || !impression || saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      اعتماد التقرير
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="glass-card border-0 h-[600px] flex items-center justify-center animate-slide-up opacity-0 stagger-2" style={{ animationFillMode: "forwards" }}>
              <div className="text-center text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">اختر حالة لبدء كتابة التقرير</p>
                <p className="text-sm">اختر من قائمة التقارير المعلقة</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Print Preview Dialog */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogTitle>معاينة الطباعة</DialogTitle>
          <DialogDescription>معاينة تقرير الفحص قبل الطباعة</DialogDescription>
          <div className="border rounded-lg overflow-hidden">
            <ReportPrintView
              ref={printRef}
              report={{
                patient_name: selectedCase?.patient || "",
                mrn: selectedCase?.mrn || "",
                exam_type: selectedCase?.exam || "",
                exam_date: selectedCase?.date || "",
                findings,
                impression,
                radiologist_name: user?.email || "الطبيب",
                finalized_at: selectedCase?.status === "finalized" ? new Date().toISOString() : undefined,
              }}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowPrintPreview(false)}>
              إلغاء
            </Button>
            <Button onClick={printReport} className="gap-2">
              <Printer className="w-4 h-4" />
              طباعة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
