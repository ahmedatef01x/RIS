import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bell, CheckCheck, AlertTriangle, FileText, Calendar, User,
  Settings, Clock, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { api, USE_LOCAL_API } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const typeConfig: Record<string, { icon: any; color: string }> = {
  report: { icon: FileText, color: "text-info" },
  urgent: { icon: AlertTriangle, color: "text-destructive" },
  appointment: { icon: Calendar, color: "text-warning" },
  system: { icon: Settings, color: "text-muted-foreground" },
  user: { icon: User, color: "text-success" },
  info: { icon: Bell, color: "text-primary" },
};

export default function Notifications() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      if (USE_LOCAL_API) {
        const data = await api.getNotifications();
        setNotifications(data || []);
      } else {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .or(`user_id.eq.${user.id},user_id.is.null`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotifications(data || []);
      }
    } catch (error) {
      toast.error(language === 'ar' ? "خطأ في تحميل الإشعارات" : "Error loading notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      if (USE_LOCAL_API) {
        await api.markNotificationAsRead(id);
      } else {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id);
      }
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      toast.error(language === 'ar' ? "خطأ في تحديث الإشعار" : "Error updating notification");
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    
    try {
      if (USE_LOCAL_API) {
        await api.markAllNotificationsAsRead();
      } else {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .or(`user_id.eq.${user.id},user_id.is.null`)
          .eq('is_read', false);
      }
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success(t.notifications.markAllRead);
    } catch (error) {
      toast.error(language === 'ar' ? "خطأ في التحديث" : "Error updating");
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const urgentNotifications = notifications.filter(n => n.type === 'urgent');

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (language === 'ar') {
      if (minutes < 1) return "الآن";
      if (minutes < 60) return `منذ ${minutes} دقيقة`;
      if (hours < 24) return `منذ ${hours} ساعة`;
      return `منذ ${days} يوم`;
    } else {
      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes} min ago`;
      if (hours < 24) return `${hours} hours ago`;
      return `${days} days ago`;
    }
  };

  const renderNotificationList = (items: any[]) => (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t.common.noData}</p>
      ) : (
        items.map((notification) => {
          const config = typeConfig[notification.type] || typeConfig.info;
          const Icon = config.icon;
          
          return (
            <div
              key={notification.id}
              onClick={() => !notification.is_read && markAsRead(notification.id)}
              className={cn(
                "p-4 rounded-lg transition-smooth flex items-start gap-4 cursor-pointer",
                notification.is_read ? "bg-muted/20" : "bg-primary/5 border border-primary/20"
              )}
            >
              <div className={cn("p-2 rounded-lg bg-muted/50", config.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className={cn(
                      "font-medium",
                      !notification.is_read && "text-foreground"
                    )}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                  </div>
                  {notification.type === "urgent" && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                      {language === 'ar' ? 'عاجل' : 'Urgent'}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatTime(notification.created_at)}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.notifications.title}</h1>
          <p className="text-muted-foreground">{t.notifications.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllRead} className="gap-2">
              <CheckCheck className="w-4 h-4" />
              {t.notifications.markAllRead}
            </Button>
          )}
          <Badge variant="outline" className={cn(
            unreadCount > 0 ? "bg-primary/10 text-primary border-primary/30" : ""
          )}>
            {unreadCount} {t.notifications.unread}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="glass-card border-0 animate-slide-up opacity-0 stagger-1" style={{ animationFillMode: "forwards" }}>
            <CardHeader>
              <Tabs defaultValue="all">
                <TabsList className="bg-muted/50">
                  <TabsTrigger value="all">{t.common.all}</TabsTrigger>
                  <TabsTrigger value="unread">{t.notifications.unread}</TabsTrigger>
                  <TabsTrigger value="urgent">{t.notifications.urgentAlerts}</TabsTrigger>
                </TabsList>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <TabsContent value="all" className="mt-6">
                      {renderNotificationList(notifications)}
                    </TabsContent>

                    <TabsContent value="unread" className="mt-6">
                      {renderNotificationList(notifications.filter(n => !n.is_read))}
                    </TabsContent>

                    <TabsContent value="urgent" className="mt-6">
                      {renderNotificationList(urgentNotifications)}
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </CardHeader>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-card border-0 animate-slide-up opacity-0 stagger-2" style={{ animationFillMode: "forwards" }}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                {t.notifications.settings}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'تكوين طريقة استلام التنبيهات' : 'Configure how you receive alerts'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{language === 'ar' ? 'إشعارات التقارير' : 'Report Notifications'}</Label>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'عند جاهزية التقارير' : 'When reports are ready'}
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{language === 'ar' ? 'التنبيهات العاجلة' : 'Urgent Alerts'}</Label>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'حالات الطوارئ والعاجلة' : 'Emergency cases'}
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{language === 'ar' ? 'تذكيرات المواعيد' : 'Appointment Reminders'}</Label>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'الجداول القادمة' : 'Upcoming schedules'}
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{language === 'ar' ? 'تحديثات النظام' : 'System Updates'}</Label>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'الصيانة والتحديثات' : 'Maintenance & updates'}
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
