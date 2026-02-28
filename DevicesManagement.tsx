import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Monitor, Plus, Edit, Trash2, Activity, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { api, USE_LOCAL_API } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

interface Device {
  id: string;
  name: string;
  type: string;
  room: string | null;
  status: string;
  created_at: string;
}

const deviceTypes = ['CT', 'MRI', 'X-Ray', 'Ultrasound', 'Fluoroscopy', 'Mammography', 'PET-CT'];
const statusOptions = ['available', 'busy', 'maintenance', 'offline'];

export default function DevicesManagement() {
  const { t, language } = useI18n();
  const { userRole } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    room: '',
    status: 'available'
  });

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      if (USE_LOCAL_API) {
        const data = await api.getDevices();
        setDevices(data || []);
      } else {
        const { data, error } = await supabase
          .from('devices')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDevices(data || []);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.type) {
      toast.error(language === 'ar' ? 'يرجى إدخال اسم ونوع الجهاز' : 'Please enter device name and type');
      return;
    }

    try {
      if (editingDevice) {
        // Update device
        if (USE_LOCAL_API) {
          await api.updateDevice(editingDevice.id, formData);
        } else {
          const { error } = await supabase
            .from('devices')
            .update(formData)
            .eq('id', editingDevice.id);
          if (error) throw error;
        }
        toast.success(language === 'ar' ? 'تم تحديث الجهاز بنجاح' : 'Device updated successfully');
      } else {
        // Create new device
        if (USE_LOCAL_API) {
          await api.createDevice(formData);
        } else {
          const { error } = await supabase
            .from('devices')
            .insert(formData);
          if (error) throw error;
        }
        toast.success(language === 'ar' ? 'تم إضافة الجهاز بنجاح' : 'Device added successfully');
      }

      setDialogOpen(false);
      setEditingDevice(null);
      setFormData({ name: '', type: '', room: '', status: 'available' });
      fetchDevices();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      type: device.type,
      room: device.room || '',
      status: device.status
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الجهاز؟' : 'Are you sure you want to delete this device?')) {
      return;
    }

    try {
      if (USE_LOCAL_API) {
        await api.deleteDevice(id);
      } else {
        const { error } = await supabase
          .from('devices')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }
      toast.success(language === 'ar' ? 'تم حذف الجهاز' : 'Device deleted');
      fetchDevices();
    } catch (error: any) {
      const message = error?.response?.data?.details || error.message;
      toast.error(message || (language === 'ar' ? 'فشل حذف الجهاز' : 'Failed to delete device'));
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; labelAr: string; className: string }> = {
      available: { label: 'Available', labelAr: 'متاح', className: 'bg-success/10 text-success border-success/30' },
      busy: { label: 'Busy', labelAr: 'مشغول', className: 'bg-warning/10 text-warning border-warning/30' },
      maintenance: { label: 'Maintenance', labelAr: 'صيانة', className: 'bg-destructive/10 text-destructive border-destructive/30' },
      offline: { label: 'Offline', labelAr: 'غير متصل', className: 'bg-muted text-muted-foreground' },
    };
    const statusInfo = config[status] || config.offline;
    return (
      <Badge variant="outline" className={statusInfo.className}>
        {language === 'ar' ? statusInfo.labelAr : statusInfo.label}
      </Badge>
    );
  };

  // Only admin can access this page
  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 text-center">
          <Settings className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {language === 'ar' ? 'غير مصرح' : 'Not Authorized'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'هذه الصفحة للمديرين فقط' : 'This page is for admins only'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.devices.title}</h1>
          <p className="text-muted-foreground">{t.devices.subtitle}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingDevice(null);
            setFormData({ name: '', type: '', room: '', status: 'available' });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {language === 'ar' ? 'إضافة جهاز' : 'Add Device'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDevice 
                  ? (language === 'ar' ? 'تعديل الجهاز' : 'Edit Device')
                  : (language === 'ar' ? 'إضافة جهاز جديد' : 'Add New Device')
                }
              </DialogTitle>
              <p className="sr-only">{editingDevice ? (language === 'ar' ? 'نموذج تعديل الجهاز' : 'Edit device form') : (language === 'ar' ? 'نموذج إضافة جهاز جديد' : 'Add new device form')}</p>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اسم الجهاز' : 'Device Name'}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={language === 'ar' ? 'مثال: جهاز CT 1' : 'e.g. CT Scanner 1'}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.devices.type}</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر النوع' : 'Select type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.devices.room}</Label>
                <Input
                  value={formData.room}
                  onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
                  placeholder={language === 'ar' ? 'مثال: غرفة 101' : 'e.g. Room 101'}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.common.status}</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem key={status} value={status}>
                        {language === 'ar' 
                          ? (status === 'available' ? 'متاح' : status === 'busy' ? 'مشغول' : status === 'maintenance' ? 'صيانة' : 'غير متصل')
                          : status.charAt(0).toUpperCase() + status.slice(1)
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSubmit} className="flex-1">
                  {editingDevice ? t.common.save : t.common.add}
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t.common.cancel}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 animate-slide-up opacity-0 stagger-1" style={{ animationFillMode: "forwards" }}>
        <Card className="glass-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Monitor className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الأجهزة' : 'Total Devices'}</p>
                <p className="text-2xl font-bold text-foreground">{devices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <Activity className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.devices.available}</p>
                <p className="text-2xl font-bold text-foreground">
                  {devices.filter(d => d.status === 'available').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-warning/10">
                <Activity className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.devices.busy}</p>
                <p className="text-2xl font-bold text-foreground">
                  {devices.filter(d => d.status === 'busy').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-destructive/10">
                <Settings className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.devices.maintenance}</p>
                <p className="text-2xl font-bold text-foreground">
                  {devices.filter(d => d.status === 'maintenance').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Devices Table */}
      <Card className="glass-card border-0 animate-slide-up opacity-0 stagger-2" style={{ animationFillMode: "forwards" }}>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Activity className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t.common.noData}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">{language === 'ar' ? 'اسم الجهاز' : 'Device Name'}</TableHead>
                  <TableHead className="font-semibold">{t.devices.type}</TableHead>
                  <TableHead className="font-semibold">{t.devices.room}</TableHead>
                  <TableHead className="font-semibold">{t.common.status}</TableHead>
                  <TableHead className="font-semibold w-24">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id} className="hover:bg-muted/30 transition-smooth">
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>{device.type}</TableCell>
                    <TableCell>{device.room || '-'}</TableCell>
                    <TableCell>{getStatusBadge(device.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(device)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(device.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}