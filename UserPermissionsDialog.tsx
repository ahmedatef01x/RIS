import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Permission {
  page_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const AVAILABLE_PAGES = [
  { id: 'dashboard', label: { ar: 'لوحة التحكم', en: 'Dashboard' } },
  { id: 'patients', label: { ar: 'المرضى', en: 'Patients' } },
  { id: 'worklist', label: { ar: 'قائمة العمل', en: 'Worklist' } },
  { id: 'scheduling', label: { ar: 'الجدولة', en: 'Scheduling' } },
  { id: 'reports', label: { ar: 'التقارير', en: 'Reports' } },
  { id: 'billing', label: { ar: 'الفواتير', en: 'Billing' } },
  { id: 'notifications', label: { ar: 'الإشعارات', en: 'Notifications' } },
  { id: 'users', label: { ar: 'المستخدمين', en: 'Users' } },
  { id: 'devices', label: { ar: 'الأجهزة', en: 'Devices' } },
  { id: 'exam-types', label: { ar: 'أنواع الفحوصات', en: 'Exam Types' } },
  { id: 'settings', label: { ar: 'الإعدادات', en: 'Settings' } },
];

interface Props {
  userId: string;
  userName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
  language: 'ar' | 'en';
}

export default function UserPermissionsDialog({
  userId,
  userName,
  isOpen,
  onOpenChange,
  onSave,
  language
}: Props) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [defaultHomepage, setDefaultHomepage] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPermissions();
    }
  }, [isOpen, userId]);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      // Load permissions - handle if table doesn't exist yet
      let perms: any[] = [];
      try {
        perms = await api.getUserPermissions(userId);
        console.log('Loaded permissions:', perms);
      } catch (permError) {
        console.warn('Could not load permissions (table may not exist):', permError);
        // Continue with empty permissions
      }
      
      // Initialize all pages with default (no permissions)
      const allPerms = AVAILABLE_PAGES.map(page => {
        const existing = Array.isArray(perms) ? perms.find((p: any) => p.page_name === page.id) : null;
        return existing || {
          page_name: page.id,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
        };
      });
      
      setPermissions(allPerms);

      // Load preferences
      try {
        const prefs = await api.getUserPreferences(userId);
        setDefaultHomepage(prefs?.default_homepage || 'dashboard');
      } catch (prefError) {
        console.warn('Could not load preferences:', prefError);
        setDefaultHomepage('dashboard');
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      // Initialize with defaults instead of showing error
      const defaultPerms = AVAILABLE_PAGES.map(page => ({
        page_name: page.id,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      }));
      setPermissions(defaultPerms);
      setDefaultHomepage('dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateUserPermissions(userId, permissions, defaultHomepage);
      toast.success('تم حفظ الصلاحيات بنجاح');
      onOpenChange(false);
      onSave?.();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('فشل حفظ الصلاحيات. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (pageName: string, permission: 'can_view' | 'can_create' | 'can_edit' | 'can_delete') => {
    setPermissions(prev =>
      prev.map(p =>
        p.page_name === pageName
          ? { ...p, [permission]: !p[permission] }
          : p
      )
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{language === 'ar' ? 'إدارة صلاحيات المستخدم' : 'Manage User Permissions'}</DialogTitle>
          <DialogDescription>{userName}</DialogDescription>
          <p className="sr-only">إدارة صلاحيات المستخدم والصفحات المسموح له رؤيتها</p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Default Homepage Selection */}
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-base">
                  {language === 'ar' ? 'الصفحة الرئيسية الافتراضية' : 'Default Homepage'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' 
                    ? 'الصفحة التي سيتم فتحها عند دخول المستخدم للنظام'
                    : 'The page that will open when user logs in'
                  }
                </p>
                <Select value={defaultHomepage} onValueChange={setDefaultHomepage}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_PAGES.map(page => (
                      <SelectItem key={page.id} value={page.id}>
                        {language === 'ar' ? page.label.ar : page.label.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Permissions Grid */}
            <div className="space-y-4">
              <h3 className="font-semibold">
                {language === 'ar' ? 'صلاحيات الصفحات' : 'Page Permissions'}
              </h3>
              {permissions.map(perm => {
                const page = AVAILABLE_PAGES.find(p => p.id === perm.page_name);
                return (
                  <Card key={perm.page_name}>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">
                          {language === 'ar' ? page?.label.ar : page?.label.en}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${perm.page_name}-view`}
                              checked={perm.can_view}
                              onCheckedChange={() => togglePermission(perm.page_name, 'can_view')}
                            />
                            <Label htmlFor={`${perm.page_name}-view`} className="cursor-pointer">
                              {language === 'ar' ? 'عرض' : 'View'}
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${perm.page_name}-create`}
                              checked={perm.can_create}
                              onCheckedChange={() => togglePermission(perm.page_name, 'can_create')}
                              disabled={!perm.can_view}
                            />
                            <Label htmlFor={`${perm.page_name}-create`} className="cursor-pointer">
                              {language === 'ar' ? 'إضافة' : 'Create'}
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${perm.page_name}-edit`}
                              checked={perm.can_edit}
                              onCheckedChange={() => togglePermission(perm.page_name, 'can_edit')}
                              disabled={!perm.can_view}
                            />
                            <Label htmlFor={`${perm.page_name}-edit`} className="cursor-pointer">
                              {language === 'ar' ? 'تعديل' : 'Edit'}
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${perm.page_name}-delete`}
                              checked={perm.can_delete}
                              onCheckedChange={() => togglePermission(perm.page_name, 'can_delete')}
                              disabled={!perm.can_view}
                            />
                            <Label htmlFor={`${perm.page_name}-delete`} className="cursor-pointer">
                              {language === 'ar' ? 'حذف' : 'Delete'}
                            </Label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="default"
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {language === 'ar' ? 'حفظ الصلاحيات' : 'Save Permissions'}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
