import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useI18n } from "@/lib/i18n";
import {
  LayoutDashboard,
  UserPlus,
  ClipboardList,
  Calendar,
  ListTodo,
  FileText,
  Receipt,
  Users,
  Bell,
  Settings,
  ChevronLeft,
  Activity,
  Scan,
  Shield,
  LogOut,
  Stethoscope,
  Monitor,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { userRole, signOut, user } = useAuth();
  const { canView } = useUserPermissions(user?.id || '');
  const { t, language } = useI18n();

  const baseMenuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: "Dashboard", labelAr: "لوحة التحكم", path: "/" },
    { id: 'patients', icon: UserPlus, label: "Patient Registration", labelAr: "تسجيل المرضى", path: "/patients" },
    { id: 'patients', icon: ClipboardList, label: "Order Entry", labelAr: "طلبات الأشعة", path: "/orders" },
    { id: 'scheduling', icon: Calendar, label: "Scheduling", labelAr: "الجدولة", path: "/scheduling" },
    { id: 'worklist', icon: ListTodo, label: "Worklist", labelAr: "قائمة العمل", path: "/worklist" },
    { id: 'reports', icon: FileText, label: "Reporting", labelAr: "التقارير", path: "/reporting" },
    { id: 'billing', icon: Receipt, label: "Billing", labelAr: "الفواتير", path: "/billing" },
    { id: 'users', icon: Users, label: "Users", labelAr: "المستخدمين", path: "/users" },
    { id: 'notifications', icon: Bell, label: "Notifications", labelAr: "الإشعارات", path: "/notifications" },
  ];

  // Admin-only menu items - Devices, Exam Types, Admin Panel
  const adminMenuItems = [
    { id: 'devices', icon: Monitor, label: "Devices Management", labelAr: "إدارة الأجهزة", path: "/devices" },
    { id: 'exam-types', icon: Stethoscope, label: "Exam Types", labelAr: "أنواع الفحوصات", path: "/exam-types" },
    { id: 'branding', icon: Palette, label: "Branding Settings", labelAr: "إدارة العلامة التجارية", path: "/admin/branding" },
    { id: 'users', icon: Shield, label: "Admin Panel", labelAr: "لوحة الأدمن", path: "/admin/users" },
  ];

  // Filter menu items based on permissions
  const visibleBaseItems = baseMenuItems.filter(item => canView(item.id));
  const visibleAdminItems = userRole === "admin" 
    ? adminMenuItems.filter(item => canView(item.id))
    : [];

  const menuItems = [...visibleBaseItems, ...visibleAdminItems];

  const getLabel = (item: { label: string; labelAr: string }) => {
    return language === 'ar' ? item.labelAr : item.label;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 z-50",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Scan className="w-6 h-6 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="font-bold text-lg text-sidebar-foreground">RadiologyRIS</h1>
              <p className="text-xs text-sidebar-foreground/60">
                {language === 'ar' ? 'نظام إدارة الأشعة' : 'Radiology System'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth group relative",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <span className="font-medium text-sm animate-fade-in">{getLabel(item)}</span>
            )}
            {collapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background rounded text-xs font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {getLabel(item)}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )
          }
        >
          <Settings className="w-5 h-5" />
          {!collapsed && <span className="font-medium text-sm">{t.settings.title}</span>}
        </NavLink>
        
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 py-2.5 text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="font-medium text-sm">{t.common.logout}</span>}
        </Button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center shadow-md hover:bg-muted transition-smooth"
      >
        <ChevronLeft
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            collapsed && "rotate-180"
          )}
        />
      </button>

      {/* User info */}
      <div className="p-4 border-t border-sidebar-border">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="relative">
            <Activity className="w-5 h-5 text-success" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse-soft" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <p className="text-xs font-medium text-sidebar-foreground truncate max-w-[140px]">
                {user?.email}
              </p>
              <p className="text-xs text-sidebar-foreground/50">
                {userRole ? `${userRole}` : (language === 'ar' ? 'متصل' : 'Connected')}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
