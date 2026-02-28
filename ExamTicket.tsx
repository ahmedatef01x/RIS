import { useEffect, useState } from "react";
import { DollarSign, Check, Clock, AlertCircle, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api, USE_LOCAL_API } from "@/lib/api";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ExamTicketProps {
  item: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ExamTicket({ item, isOpen, onClose }: ExamTicketProps) {
  const [billing, setBilling] = useState<any>(null);
  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      fetchBillingData();
      fetchBrandingData();
    }
  }, [isOpen, item]);

  const fetchBrandingData = async () => {
    try {
      if (USE_LOCAL_API) {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('http://localhost:3001/api/branding', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setBranding(data);
        }
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    }
  };

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      if (USE_LOCAL_API) {
        // Get billing record for this exam order
        const billingRecords = await api.getBillingRecords({
          // Search by passing empty filters and filter client-side
        });
        // Find billing record for this exam order
        const matchingBilling = billingRecords?.find((b: any) => b.exam_order_id === item.id);
        if (matchingBilling) {
          setBilling(matchingBilling);
          setNotes(matchingBilling.notes || "");
          setPaymentAmount(String(matchingBilling.amount_egp || ""));
        } else {
          setBilling(null);
        }
      } else {
        // Fetch from Supabase
        const { data } = await supabase
          .from("billing")
          .select("*")
          .eq("exam_order_id", item.id)
          .single();
        if (data) {
          setBilling(data);
          setNotes(data.notes || "");
          setPaymentAmount(String(data.amount_egp || ""));
        }
      }
    } catch (error) {
      console.error("Error fetching billing:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentStatusChange = async (status: "paid" | "pending") => {
    try {
      setUpdating(true);
      if (!billing) {
        toast.error("لا توجد بيانات دفع لتحديثها");
        return;
      }

      const updateData = {
        status,
        paid_at: status === "paid" ? new Date().toISOString() : null,
        notes
      };

      if (USE_LOCAL_API) {
        await api.updateBilling(billing.id, updateData);
      } else {
        const { error } = await supabase
          .from("billing")
          .update(updateData)
          .eq("id", billing.id);
        if (error) throw error;
      }

      setBilling({ ...billing, ...updateData });
      toast.success(status === "paid" ? "تم تحديث الحالة إلى مدفوع" : "تم تحديث الحالة إلى معلق");
    } catch (error) {
      console.error("Error updating billing:", error);
      toast.error("فشل تحديث حالة الدفع");
    } finally {
      setUpdating(false);
    }
  };

  const handlePrint = () => {
    const patientName = item.patient_name || item.patients?.full_name || "-";
    const patientMrn = item.patient_acc_num || item.patient_mrn || item.patients?.mrn || "-";
    const examType = item.exam_type || "-";
    const scheduledDate = item.scheduled_date ? new Date(item.scheduled_date).toLocaleString("ar-EG") : "-";
    const deviceName = item.device_name || item.devices?.name || "-";
    const billingStatus = billing?.status === "paid" ? "مدفوع" : "معلق";
    const amount = billing?.amount_egp || paymentAmount || "-";

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تذكرة الفحص</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Arial', sans-serif;
            background: white;
            padding: 20px;
            color: #333;
          }
          .ticket-container {
            max-width: 400px;
            margin: 0 auto;
            border: 2px solid #333;
            padding: 20px;
            text-align: center;
            background: white;
          }
          .header {
            border-bottom: 2px dashed #333;
            padding-bottom: 15px;
            margin-bottom: 15px;
          }
          .header h1 {
            font-size: 24px;
            margin-bottom: 5px;
            color: #1a1a1a;
          }
          .header p {
            font-size: 12px;
            color: #666;
          }
          .section {
            margin-bottom: 15px;
            text-align: right;
          }
          .section-title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 8px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
            color: #1a1a1a;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 13px;
            padding: 5px;
          }
          .detail-label {
            font-weight: 600;
            color: #555;
            flex: 0 0 40%;
          }
          .detail-value {
            color: #333;
            flex: 1;
            text-align: left;
          }
          .barcode-section {
            margin: 15px 0;
            padding: 15px 0;
            border-top: 1px dashed #333;
            border-bottom: 1px dashed #333;
          }
          .barcode-section img {
            max-width: 100%;
            height: auto;
          }
          .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
            margin: 10px 0;
          }
          .status-paid {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
          }
          .status-pending {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeeba;
          }
          .total-section {
            background: #f8f9fa;
            padding: 12px;
            margin: 15px 0;
            border-radius: 5px;
            border-left: 4px solid #007bff;
          }
          .total-section .detail-row {
            margin-bottom: 0;
          }
          .total-amount {
            font-size: 18px;
            font-weight: bold;
            color: #007bff;
          }
          .footer {
            margin-top: 15px;
            font-size: 11px;
            color: #999;
            border-top: 1px dashed #333;
            padding-top: 10px;
          }
          .accession-number {
            font-size: 12px;
            font-weight: bold;
            font-family: monospace;
            margin: 10px 0;
            color: #007bff;
          }
          @media print {
            body {
              padding: 0;
              margin: 0;
            }
            .ticket-container {
              border: none;
              max-width: 100%;
              padding: 10mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="ticket-container">
          <div class="header">
            <h1>🏥 مركز الأشعة</h1>
            <p>Radiance Center</p>
            <p>تذكرة فحص طبي</p>
          </div>

          <div class="section">
            <div class="section-title">بيانات المريض</div>
            <div class="detail-row">
              <span class="detail-label">الاسم:</span>
              <span class="detail-value">${patientName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">الرقم:</span>
              <span class="detail-value">${patientMrn}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">بيانات الفحص</div>
            <div class="detail-row">
              <span class="detail-label">نوع الفحص:</span>
              <span class="detail-value">${examType}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">الجهاز:</span>
              <span class="detail-value">${deviceName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">الموعد:</span>
              <span class="detail-value">${scheduledDate}</span>
            </div>
          </div>

          <div class="accession-number">
            رقم الزيارة: ${item.accession_number || "—"}
          </div>

          <div class="barcode-section" id="barcode-placeholder">
            <!-- سيتم إضافة الباركود هنا -->
          </div>

          <div class="section">
            <div class="section-title">معلومات المركز</div>
            <div class="detail-row">
              <span class="detail-label">اسم المركز:</span>
              <span class="detail-value">${branding?.clinic_name || 'مركز الأشعة'}</span>
            </div>
            ${branding?.phone ? `
            <div class="detail-row">
              <span class="detail-label">الهاتف:</span>
              <span class="detail-value">${branding.phone}</span>
            </div>
            ` : ''}
            ${branding?.email ? `
            <div class="detail-row">
              <span class="detail-label">البريد الإلكتروني:</span>
              <span class="detail-value">${branding.email}</span>
            </div>
            ` : ''}
            ${branding?.address ? `
            <div class="detail-row">
              <span class="detail-label">العنوان:</span>
              <span class="detail-value">${branding.address}</span>
            </div>
            ` : ''}
          </div>

          <div class="section">
            <div class="section-title">حالة الدفع</div>
            <div class="status-badge ${billingStatus === "مدفوع" ? "status-paid" : "status-pending"}">
              ${billingStatus === "مدفوع" ? "✓ مدفوع" : "⏳ معلق الدفع"}
            </div>
          </div>

          <div class="total-section">
            <div class="detail-row">
              <span class="detail-label">المبلغ المستحق:</span>
              <span class="detail-value total-amount">${amount} EGP</span>
            </div>
          </div>

          ${notes ? `
            <div class="section">
              <div class="section-title">ملاحظات:</div>
              <p style="font-size: 12px; color: #666; text-align: right;">${notes}</p>
            </div>
          ` : ""}

          <div class="footer">
            <p>تاريخ الطباعة: ${new Date().toLocaleString("ar-EG")}</p>
            <p>يرجى الاحتفاظ بهذه التذكرة حتى إتمام الفحص</p>
          </div>
        </div>

        <script>
          // تحميل الباركود إذا كان متاحاً
          window.onload = function() {
            // يمكن إضافة مكتبة باركود هنا إذا لزم الأمر
            setTimeout(() => window.print(), 500);
          };
        </script>
      </body>
      </html>
    `;

    const w = window.open("", "_blank");
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    } else {
      toast.error("تعذر فتح نافذة الطباعة");
    }
  };

  const getPaymentStatusDisplay = () => {
    if (!billing) return "—";
    const status = billing.status === "paid" ? "مدفوع" : "معلق";
    const icon = billing.status === "paid" ? "✓" : "⏳";
    return `${icon} ${status}`;
  };

  const paymentStatusColor = billing?.status === "paid" 
    ? "bg-green-100 text-green-800" 
    : "bg-yellow-100 text-yellow-800";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">تذكرة الفحص والدفع</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !item ? (
          <div className="text-center py-8 text-muted-foreground">
            لم يتم العثور على بيانات الفحص
          </div>
        ) : (
          <div className="space-y-6">
            {/* معلومات المريض */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">معلومات المريض</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">الاسم</Label>
                    <p className="font-medium">{item.patient_name || item.patients?.full_name || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">رقم المريض</Label>
                    <p className="font-medium font-mono">{item.patient_acc_num || item.patient_mrn || item.patients?.mrn || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* معلومات الفحص */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">معلومات الفحص</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">نوع الفحص</Label>
                    <p className="font-medium">{item.exam_type || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">رقم الزيارة</Label>
                    <Badge variant="secondary" className="font-mono">
                      {item.accession_number || "—"}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الجهاز / الغرفة</Label>
                    <p className="font-medium">
                      {item.device_name || item.devices?.name || "—"}
                      {(item.device_room || item.devices?.room) && ` / ${item.device_room || item.devices?.room}`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الموعد</Label>
                    <p className="font-medium">
                      {item.scheduled_date
                        ? new Date(item.scheduled_date).toLocaleString("ar-EG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* معلومات الدفع */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  معلومات الدفع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">حالة الدفع</Label>
                    <Badge className={`${paymentStatusColor} mt-2`}>
                      {getPaymentStatusDisplay()}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">المبلغ المستحق</Label>
                    <p className="text-xl font-bold text-primary">
                      {billing?.amount_egp || paymentAmount || "—"} EGP
                    </p>
                  </div>
                </div>

                {/* أزرار تحديث حالة الدفع */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => handlePaymentStatusChange("paid")}
                    disabled={updating || billing?.status === "paid"}
                    variant={billing?.status === "paid" ? "secondary" : "default"}
                    className="flex-1 gap-2"
                  >
                    <Check className="w-4 h-4" />
                    تحديث: مدفوع
                  </Button>
                  <Button
                    onClick={() => handlePaymentStatusChange("pending")}
                    disabled={updating || billing?.status === "pending"}
                    variant={billing?.status === "pending" ? "secondary" : "outline"}
                    className="flex-1 gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    تحديث: معلق
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ملاحظات */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">ملاحظات</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أضف أي ملاحظات..."
                  className="min-h-24"
                />
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            إغلاق
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            طباعة التذكرة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
