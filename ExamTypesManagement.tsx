import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, Pencil, Search, Loader2, Stethoscope, DollarSign, Clock, Filter
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { api, USE_LOCAL_API } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const categories = [
  { value: "X-Ray", label: "X-Ray", color: "bg-blue-100 text-blue-700" },
  { value: "CT", label: "CT Scan", color: "bg-purple-100 text-purple-700" },
  { value: "MRI", label: "MRI", color: "bg-green-100 text-green-700" },
  { value: "US", label: "Ultrasound", color: "bg-yellow-100 text-yellow-700" },
  { value: "Fluoroscopy", label: "Fluoroscopy", color: "bg-orange-100 text-orange-700" },
];

interface ExamType {
  id: string;
  name: string;
  name_ar: string;
  category: string;
  base_price_egp: number;
  duration_minutes: number;
  description: string | null;
  preparation_notes: string | null;
  is_active: boolean;
}

export default function ExamTypesManagement() {
  const { t, language } = useI18n();
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamType | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    name_ar: "",
    category: "",
    base_price_egp: "",
    duration_minutes: "30",
    description: "",
    preparation_notes: "",
    is_active: true,
  });

  const fetchExamTypes = async () => {
    setLoading(true);
    try {
      if (USE_LOCAL_API) {
        const data = await api.getExamTypes();
        setExamTypes(data || []);
      } else {
        const { data, error } = await supabase
          .from('exam_types')
          .select('*')
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        setExamTypes(data || []);
      }
    } catch (error) {
      toast.error(language === 'ar' ? "خطأ في تحميل أنواع الفحوصات" : "Error loading exam types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamTypes();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      name_ar: "",
      category: "",
      base_price_egp: "",
      duration_minutes: "30",
      description: "",
      preparation_notes: "",
      is_active: true,
    });
    setEditingExam(null);
  };

  const handleEdit = (exam: ExamType) => {
    setEditingExam(exam);
    setFormData({
      name: exam.name,
      name_ar: exam.name_ar,
      category: exam.category,
      base_price_egp: exam.base_price_egp.toString(),
      duration_minutes: exam.duration_minutes.toString(),
      description: exam.description || "",
      preparation_notes: exam.preparation_notes || "",
      is_active: exam.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.name_ar || !formData.category || !formData.base_price_egp) {
      toast.error(language === 'ar' ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        name_ar: formData.name_ar,
        category: formData.category,
        base_price_egp: parseFloat(formData.base_price_egp),
        duration_minutes: parseInt(formData.duration_minutes),
        description: formData.description || null,
        preparation_notes: formData.preparation_notes || null,
        is_active: formData.is_active,
      };

      if (USE_LOCAL_API) {
        if (editingExam) {
          await api.updateExamType(editingExam.id, payload);
        } else {
          await api.createExamType(payload);
        }
      } else {
        if (editingExam) {
          const { error } = await supabase
            .from('exam_types')
            .update(payload)
            .eq('id', editingExam.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('exam_types')
            .insert(payload);
          if (error) throw error;
        }
      }

      toast.success(editingExam 
        ? (language === 'ar' ? "تم تحديث الفحص بنجاح" : "Exam updated successfully")
        : (language === 'ar' ? "تم إضافة الفحص بنجاح" : "Exam added successfully")
      );
      setIsDialogOpen(false);
      resetForm();
      fetchExamTypes();
    } catch (error) {
      toast.error(language === 'ar' ? "خطأ في حفظ الفحص" : "Error saving exam");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    try {
      if (USE_LOCAL_API) {
        await api.toggleExamTypeActive(id);
      } else {
        const { error } = await supabase
          .from('exam_types')
          .update({ is_active: !is_active })
          .eq('id', id);
        if (error) throw error;
      }
      toast.success(is_active 
        ? (language === 'ar' ? "تم إلغاء تفعيل الفحص" : "Exam deactivated")
        : (language === 'ar' ? "تم تفعيل الفحص" : "Exam activated")
      );
      fetchExamTypes();
    } catch (error) {
      toast.error(language === 'ar' ? "خطأ في تحديث الحالة" : "Error updating status");
    }
  };

  const filteredExams = examTypes.filter(exam => {
    const matchesSearch = 
      exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.name_ar.includes(searchTerm);
    const matchesCategory = filterCategory === "all" || exam.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    return categories.find(c => c.value === category)?.color || "bg-gray-100 text-gray-700";
  };

  const totalExams = examTypes.length;
  const activeExams = examTypes.filter(e => e.is_active).length;
  const avgPrice = examTypes.length > 0 
    ? Math.round(examTypes.reduce((sum, e) => sum + e.base_price_egp, 0) / examTypes.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.examTypes.title}</h1>
          <p className="text-muted-foreground">{t.examTypes.subtitle}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {t.examTypes.newExam}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingExam 
                  ? (language === 'ar' ? "تعديل الفحص" : "Edit Exam")
                  : (language === 'ar' ? "إضافة فحص جديد" : "Add New Exam")}
              </DialogTitle>
              <DialogDescription>{editingExam ? (language === 'ar' ? "نموذج تعديل الفحص" : "Edit exam form") : (language === 'ar' ? "نموذج إضافة فحص جديد" : "Add new exam form")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'} *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="CT Brain"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} *</Label>
                  <Input
                    value={formData.name_ar}
                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    placeholder="مقطعية مخ"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.examTypes.category} *</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? "اختر التصنيف" : "Select category"} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.examTypes.price} ({t.common.currency}) *</Label>
                  <Input
                    type="number"
                    value={formData.base_price_egp}
                    onChange={(e) => setFormData({ ...formData, base_price_egp: e.target.value })}
                    placeholder="1000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t.examTypes.duration} ({language === 'ar' ? 'دقيقة' : 'minutes'})</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  placeholder="30"
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={language === 'ar' ? "وصف الفحص..." : "Exam description..."}
                />
              </div>

              <div className="space-y-2">
                <Label>{t.examTypes.preparation}</Label>
                <Textarea
                  value={formData.preparation_notes}
                  onChange={(e) => setFormData({ ...formData, preparation_notes: e.target.value })}
                  placeholder={language === 'ar' ? "تعليمات التحضير للمريض..." : "Patient preparation instructions..."}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>{language === 'ar' ? 'الفحص مفعل' : 'Exam Active'}</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  {t.common.cancel}
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingExam ? t.common.save : t.common.add)}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4 animate-slide-up opacity-0 stagger-1" style={{ animationFillMode: "forwards" }}>
        <Card className="glass-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الفحوصات' : 'Total Exams'}</p>
                <p className="text-2xl font-bold text-foreground">{totalExams}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.examTypes.activeExams}</p>
                <p className="text-2xl font-bold text-success">{activeExams}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.examTypes.avgPrice}</p>
                <p className="text-2xl font-bold text-warning">{avgPrice} {t.common.currency}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-0 animate-slide-up opacity-0 stagger-2" style={{ animationFillMode: "forwards" }}>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t.common.search + "..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-muted/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40 bg-muted/50">
                  <SelectValue placeholder={t.examTypes.category} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common.all}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
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
                  <TableHead className="font-semibold">{language === 'ar' ? 'الفحص' : 'Exam'}</TableHead>
                  <TableHead className="font-semibold">{t.examTypes.category}</TableHead>
                  <TableHead className="font-semibold">{t.examTypes.price}</TableHead>
                  <TableHead className="font-semibold">{t.examTypes.duration}</TableHead>
                  <TableHead className="font-semibold">{t.common.status}</TableHead>
                  <TableHead className="font-semibold w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t.common.noData}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExams.map((exam) => (
                    <TableRow key={exam.id} className="hover:bg-muted/30 transition-smooth">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{language === 'ar' ? exam.name_ar : exam.name}</p>
                          <p className="text-sm text-muted-foreground">{language === 'ar' ? exam.name : exam.name_ar}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border-0", getCategoryColor(exam.category))}>
                          {exam.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-foreground">{exam.base_price_egp} {t.common.currency}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {exam.duration_minutes} {language === 'ar' ? 'د' : 'min'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={exam.is_active}
                          onCheckedChange={() => toggleActive(exam.id, exam.is_active)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(exam)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
