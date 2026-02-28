import { Bell, Search, User, Moon, Sun, LogOut, Settings, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { api, USE_LOCAL_API } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { isOnline, setupConnectivityListeners } from "@/lib/offlineStorage";

export function Header() {
  const { user, userRole, signOut, isLocalMode } = useAuth();
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [online, setOnline] = useState(isOnline());

  const roleLabels: Record<string, string> = {
    admin: language === 'ar' ? "مدير النظام" : "Admin",
    radiologist: language === 'ar' ? "أخصائي أشعة" : "Radiologist",
    technician: language === 'ar' ? "فني" : "Technician",
    reception: language === 'ar' ? "استقبال" : "Reception",
    billing: language === 'ar' ? "محاسبة" : "Billing"
  };

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);

    // Setup online/offline listeners
    const cleanup = setupConnectivityListeners(
      () => setOnline(true),
      () => setOnline(false)
    );
    return cleanup;
  }, []);

  useEffect(() => {
    if (user) {
      fetchUnreadNotifications();
    }
  }, [user]);

  const fetchUnreadNotifications = async () => {
    if (isLocalMode) {
      try {
        const { count } = await api.getUnreadCount();
        setUnreadCount(count || 0);
      } catch (error) {
        setUnreadCount(0);
      }
    } else {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id)
        .eq("is_read", false);
      
      setUnreadCount(count || 0);
    }
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

  const getUserName = () => {
    if (isLocalMode && user) {
      return (user as any).fullName || (user as any).email?.split("@")[0] || (language === 'ar' ? "مستخدم" : "User");
    }
    if (user && 'user_metadata' in user && user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    return (user as any)?.email?.split("@")[0] || (language === 'ar' ? "مستخدم" : "User");
  };

  const getInitials = () => {
    const name = getUserName();
    if (name) {
      return name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <header className="h-16 bg-card/80 backdrop-blur-xl border-b border-border sticky top-0 z-40 flex items-center justify-between px-6">
      {/* Search */}
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={language === 'ar' ? "بحث سريع عن مرضى، طلبات، تقارير..." : "Quick search for patients, orders, reports..."}
          className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
          ⌘K
        </kbd>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Online/Offline indicator */}
        <div className="flex items-center gap-1">
          {online ? (
            <Wifi className="w-4 h-4 text-success" />
          ) : (
            <WifiOff className="w-4 h-4 text-warning" />
          )}
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {online ? (language === 'ar' ? 'متصل' : 'Online') : (language === 'ar' ? 'غير متصل' : 'Offline')}
          </span>
        </div>

        {/* Language switcher */}
        <LanguageSwitcher />

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>{t.notifications.title}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="flex flex-col items-start gap-1 py-3"
              onClick={() => navigate("/notifications")}
            >
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'عرض جميع الإشعارات' : 'View all notifications'}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">{getInitials()}</span>
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium">
                  {getUserName()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userRole ? roleLabels[userRole] : (language === 'ar' ? "مستخدم" : "User")}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{language === 'ar' ? 'حسابي' : 'My Account'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2">
              <Settings className="w-4 h-4" />
              {t.settings.title}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive gap-2" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              {t.common.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
