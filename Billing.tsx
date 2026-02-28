import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Receipt, Search, DollarSign, CreditCard, FileText, Download,
  CheckCircle, Clock, AlertCircle, Filter, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { api, USE_LOCAL_API } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface BillingRecord {
  id: string;
  patient_id?: string;
  exam_order_id?: string;
  amount_egp?: number;
  discount_egp?: number;
  insurance_coverage_egp?: number;
  total_due_egp?: number;
  status?: string;
  payment_method?: string | null;
  created_at?: string;
  // local API shape
  patient_name?: string;
  mrn?: string;
  exam_type?: string;
  // supabase shape
  patient?: { full_name: string; mrn: string };
  exam_order?: { exam_type: string };
}

export default function Billing() {
  const { t, language } = useI18n();
  const { userRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterExamType, setFilterExamType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);

  // Only admin and billing can accept payments
  const canAcceptPayment = userRole === 'admin' || userRole === 'billing';

  const handleAcceptPayment = async (record: BillingRecord) => {
    if (!canAcceptPayment) {
      toast.error(language === 'ar' ? 'غير مصرح لك بقبول الدفع' : 'You are not authorized to accept payments');
      return;
    }

    try {
      if (USE_LOCAL_API) {
        await api.updateBilling(record.id, { status: 'paid', paid_at: new Date().toISOString() });
      } else {
        const { error } = await supabase
          .from('billing')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', record.id);
        if (error) throw error;
      }
      toast.success(language === 'ar' ? 'تم قبول الدفع بنجاح' : 'Payment accepted successfully');
      fetchBillingRecords();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const statusConfig = {
    paid: { label: language === 'ar' ? "مدفوع" : "Paid", icon: CheckCircle, color: "bg-success/10 text-success border-success/30" },
    pending: { label: language === 'ar' ? "قيد الانتظار" : "Pending", icon: Clock, color: "bg-warning/10 text-warning border-warning/30" },
    partial: { label: language === 'ar' ? "جزئي" : "Partial", icon: Clock, color: "bg-info/10 text-info border-info/30" },
    cancelled: { label: language === 'ar' ? "ملغي" : "Cancelled", icon: AlertCircle, color: "bg-muted text-muted-foreground" },
    refunded: { label: language === 'ar' ? "مسترد" : "Refunded", icon: AlertCircle, color: "bg-destructive/10 text-destructive border-destructive/30" },
  };

  useEffect(() => {
    fetchBillingRecords();
  }, []);

  const fetchBillingRecords = async () => {
    setLoading(true);
    try {
      if (USE_LOCAL_API) {
        const data = await api.getBillingRecords();
        setBillingRecords(data || []);
      } else {
        const { data, error } = await supabase
          .from("billing")
          .select(`
            *,
            patient:patients(full_name, mrn),
            exam_order:exam_orders(exam_type)
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setBillingRecords(data || []);
      }
    } catch (error) {
      console.error("Error fetching billing:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = billingRecords.filter(inv => {
    const patientName = String(inv.patient?.full_name || inv.patient_name || '').toLowerCase();
    const invId = String(inv.id || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    const matchesSearch = patientName.includes(term) || invId.includes(term);
    const matchesStatus = filterStatus === "all" || inv.status === filterStatus;
    
    // Date range filter
    let matchesDateRange = true;
    if (filterDateFrom || filterDateTo) {
      const invDate = new Date(inv.created_at);
      invDate.setHours(0, 0, 0, 0); // Reset time to compare dates only
      
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && invDate >= fromDate;
      }
      
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && invDate <= toDate;
      }
    }

    // Exam type filter
    const matchesExamType = filterExamType === "all" || 
                           (inv.exam_order?.exam_type || inv.exam_type) === filterExamType;

    return matchesSearch && matchesStatus && matchesDateRange && matchesExamType;
  });

  const amountFor = (i: BillingRecord) => (i.amount_egp ?? i.total_due_egp ?? 0);
  
  // Get unique exam types for filter
  const uniqueExamTypes = Array.from(new Set(
    billingRecords.map(r => r.exam_order?.exam_type || r.exam_type).filter(Boolean)
  )).sort();

  // Calculate statistics based on filtered records
  const totalRevenue = filteredRecords.filter(i => i.status === "paid").reduce((sum, i) => sum + amountFor(i), 0);
  const pendingAmount = filteredRecords.filter(i => i.status === "pending").reduce((sum, i) => sum + amountFor(i), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.billing.title}</h1>
          <p className="text-muted-foreground">{t.billing.subtitle}</p>
        </div>
        <Button className="gap-2">
          <Receipt className="w-4 h-4" />
          {t.billing.newInvoice}
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 animate-slide-up opacity-0 stagger-1" style={{ animationFillMode: "forwards" }}>
        <Card className="glass-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.billing.totalCollected}</p>
                <p className="text-2xl font-bold text-foreground">{totalRevenue.toLocaleString()} {t.common.currency}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.billing.pendingAmount}</p>
                <p className="text-2xl font-bold text-foreground">{pendingAmount.toLocaleString()} {t.common.currency}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.billing.invoiceCount}</p>
                <p className="text-2xl font-bold text-foreground">{filteredRecords.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-info/10">
                <Receipt className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'العملة' : 'Currency'}</p>
                <p className="text-2xl font-bold text-foreground">EGP</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-0 animate-slide-up opacity-0 stagger-2" style={{ animationFillMode: "forwards" }}>
        <CardContent className="py-4">
          <div className="flex flex-col gap-4">
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
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36 bg-muted/50">
                    <SelectValue placeholder={t.common.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.common.all}</SelectItem>
                    <SelectItem value="paid">{t.billing.paid}</SelectItem>
                    <SelectItem value="pending">{t.status.pending}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'من:' : 'From:'}
                </span>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-40 bg-muted/50"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'إلى:' : 'To:'}
                </span>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-40 bg-muted/50"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'الفحص:' : 'Exam:'}
                </span>
                <Select value={filterExamType} onValueChange={setFilterExamType}>
                  <SelectTrigger className="w-48 bg-muted/50">
                    <SelectValue placeholder={language === 'ar' ? 'اختر الفحص' : 'Select exam'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'جميع الفحوصات' : 'All exams'}</SelectItem>
                    {uniqueExamTypes.map((examType) => (
                      <SelectItem key={examType} value={examType}>
                        {examType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-0 animate-slide-up opacity-0 stagger-4" style={{ animationFillMode: "forwards" }}>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Activity className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t.common.noData}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                  <TableHead className="font-semibold">{language === 'ar' ? 'المريض' : 'Patient'}</TableHead>
                  <TableHead className="font-semibold">{language === 'ar' ? 'الفحص' : 'Exam'}</TableHead>
                  <TableHead className="font-semibold">{t.billing.amount}</TableHead>
                  <TableHead className="font-semibold">{t.common.date}</TableHead>
                  <TableHead className="font-semibold">{t.common.status}</TableHead>
                  <TableHead className="font-semibold w-24">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((invoice) => {
                  const status = statusConfig[invoice.status as keyof typeof statusConfig];
                  const StatusIcon = status?.icon || Clock;
                  
                  return (
                    <TableRow key={invoice.id} className="hover:bg-muted/30 transition-smooth">
                      <TableCell className="font-mono text-sm">{invoice.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{invoice.patient?.full_name || invoice.patient_name}</p>
                          <p className="text-sm text-muted-foreground">{invoice.patient?.mrn || invoice.mrn}</p>
                        </div>
                      </TableCell>
                      <TableCell>{invoice.exam_order?.exam_type || invoice.exam_type}</TableCell>
                      <TableCell className="font-semibold">{(amountFor(invoice)).toLocaleString()} {t.common.currency}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(invoice.created_at).toLocaleDateString(language === 'ar' ? "ar-EG" : "en-US")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(status?.color, "gap-1")}>
                          <StatusIcon className="w-3 h-3" />
                          {status?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* Accept Payment button - only for admin and billing */}
                          {canAcceptPayment && invoice.status !== 'paid' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-success hover:text-success"
                              onClick={() => handleAcceptPayment(invoice)}
                              title={language === 'ar' ? 'قبول الدفع' : 'Accept Payment'}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
