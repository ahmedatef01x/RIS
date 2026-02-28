import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Settings as SettingsIcon, User, Building, Bell, Shield, Database,
  Globe, Palette, Save, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { api, USE_LOCAL_API } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

export default function Settings() {
  const { user, isLocalMode } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "",
  });
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      if (USE_LOCAL_API || isLocalMode) {
        const data = await api.getProfile(user?.id || '');
        setProfile(data);
        setFormData({
          full_name: data?.full_name || "",
          email: data?.email || "",
          phone: data?.phone || "",
          department: data?.department || "",
        });
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user?.id)
          .single();

        if (error) throw error;
        setProfile(data);
        setFormData({
          full_name: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
          department: data.department || "",
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      if (USE_LOCAL_API || isLocalMode) {
        await api.updateProfile(user?.id || '', {
          full_name: formData.full_name,
          phone: formData.phone,
          department: formData.department,
        });
      } else {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            department: formData.department,
          })
          .eq('id', user?.id);

        if (error) throw error;
      }
      toast.success(language === 'ar' ? "تم حفظ الإعدادات بنجاح!" : "Settings saved successfully!");
    } catch (error: any) {
      toast.error(language === 'ar' ? "خطأ في الحفظ" : "Error saving", { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.error(language === 'ar' ? "كلمة المرور الجديدة غير متطابقة" : "Passwords don't match");
      return;
    }

    if (passwordData.new.length < 6) {
      toast.error(language === 'ar' ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      if (USE_LOCAL_API || isLocalMode) {
        await api.changePassword(passwordData.new);
      } else {
        const { error } = await supabase.auth.updateUser({
          password: passwordData.new
        });

        if (error) throw error;
      }
      
      toast.success(language === 'ar' ? "تم تغيير كلمة المرور بنجاح" : "Password changed successfully");
      setPasswordData({ current: "", new: "", confirm: "" });
    } catch (error: any) {
      toast.error(language === 'ar' ? "خطأ في تغيير كلمة المرور" : "Error changing password", { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">{t.settings.title}</h1>
        <p className="text-muted-foreground">{t.settings.subtitle}</p>
      </div>

      <Tabs defaultValue="profile" className="animate-slide-up opacity-0 stagger-1" style={{ animationFillMode: "forwards" }}>
        <TabsList className="glass-card p-1">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            {t.settings.profile}
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2">
            <Building className="w-4 h-4" />
            {t.settings.organization}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            {t.notifications.title}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            {t.settings.security}
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Database className="w-4 h-4" />
            {t.settings.system}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'معلومات الملف الشخصي' : 'Profile Information'}</CardTitle>
              <CardDescription>{language === 'ar' ? 'تحديث بياناتك الشخصية' : 'Update your personal information'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</Label>
                  <Input 
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="bg-muted/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.common.email}</Label>
                  <Input 
                    value={formData.email}
                    disabled
                    className="bg-muted/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.common.phone}</Label>
                  <Input 
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-muted/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.users.department}</Label>
                  <Select 
                    value={formData.department}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                  >
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue placeholder={language === 'ar' ? "اختر القسم" : "Select department"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="radiology">{language === 'ar' ? 'الأشعة' : 'Radiology'}</SelectItem>
                      <SelectItem value="ct">{language === 'ar' ? 'الأشعة المقطعية' : 'CT'}</SelectItem>
                      <SelectItem value="mri">{language === 'ar' ? 'الرنين المغناطيسي' : 'MRI'}</SelectItem>
                      <SelectItem value="xray">{language === 'ar' ? 'الأشعة السينية' : 'X-Ray'}</SelectItem>
                      <SelectItem value="ultrasound">{language === 'ar' ? 'الموجات فوق الصوتية' : 'Ultrasound'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveProfile} className="gap-2" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t.common.save}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="mt-6 space-y-6">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'تفاصيل المؤسسة' : 'Organization Details'}</CardTitle>
              <CardDescription>{language === 'ar' ? 'معلومات المستشفى والقسم' : 'Hospital and department information'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'اسم المستشفى' : 'Hospital Name'}</Label>
                  <Input defaultValue={language === 'ar' ? "مستشفى الملك فهد الطبية" : "King Fahd Medical Hospital"} className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>{t.users.department}</Label>
                  <Input defaultValue={language === 'ar' ? "قسم الأشعة" : "Radiology Department"} className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'العنوان' : 'Address'}</Label>
                  <Input defaultValue={language === 'ar' ? "القاهرة، مصر" : "Cairo, Egypt"} className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'رقم الاتصال' : 'Contact Number'}</Label>
                  <Input defaultValue="+20 XXX XXX XXXX" className="bg-muted/50" />
                </div>
              </div>
              <Button className="gap-2">
                <Save className="w-4 h-4" />
                {t.common.save}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>{t.notifications.settings}</CardTitle>
              <CardDescription>{language === 'ar' ? 'تكوين طريقة استلام الإشعارات' : 'Configure how you receive notifications'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{language === 'ar' ? 'إشعارات البريد الإلكتروني' : 'Email Notifications'}</Label>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'استلام التحديثات عبر البريد' : 'Receive updates via email'}</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{language === 'ar' ? 'تنبيهات SMS' : 'SMS Alerts'}</Label>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تنبيهات حرجة عبر SMS' : 'Critical alerts via SMS'}</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{language === 'ar' ? 'إشعارات المتصفح' : 'Browser Notifications'}</Label>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إشعارات سطح المكتب' : 'Desktop notifications'}</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-6">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'إعدادات الأمان' : 'Security Settings'}</CardTitle>
              <CardDescription>{language === 'ar' ? 'إدارة أمان حسابك' : 'Manage your account security'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.settings.newPassword}</Label>
                    <Input 
                      type="password" 
                      value={passwordData.new}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                      className="bg-muted/50" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.settings.confirmPassword}</Label>
                    <Input 
                      type="password" 
                      value={passwordData.confirm}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                      className="bg-muted/50" 
                    />
                  </div>
                </div>
                <Button onClick={handleChangePassword} disabled={saving || !passwordData.new}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t.settings.changePassword}
                </Button>
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{language === 'ar' ? 'المصادقة الثنائية' : 'Two-Factor Authentication'}</Label>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إضافة طبقة أمان إضافية' : 'Add extra security layer'}</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-6 space-y-6">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'إعدادات النظام' : 'System Settings'}</CardTitle>
              <CardDescription>{language === 'ar' ? 'الإعدادات العامة للنظام' : 'General system settings'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label>{t.settings.language}</Label>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'لغة النظام' : 'System language'}</p>
                  </div>
                </div>
                <Select value={language} onValueChange={(val) => setLanguage(val as 'ar' | 'en')}>
                  <SelectTrigger className="w-40 bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label>{language === 'ar' ? 'تنسيق التاريخ' : 'Date Format'}</Label>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'طريقة عرض التواريخ' : 'Date display format'}</p>
                  </div>
                </div>
                <Select defaultValue="dd/mm/yyyy">
                  <SelectTrigger className="w-40 bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label>{language === 'ar' ? 'تكامل PACS' : 'PACS Integration'}</Label>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الاتصال بخادم PACS' : 'Connect to PACS server'}</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SettingsIcon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label>{language === 'ar' ? 'تكامل HL7' : 'HL7 Integration'}</Label>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تفعيل رسائل HL7' : 'Enable HL7 messages'}</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
