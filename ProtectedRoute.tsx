import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Activity } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPage?: string; // e.g., 'dashboard', 'patients', 'worklist'
}

export default function ProtectedRoute({ children, requiredPage }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { loading: permLoading, canView } = useUserPermissions(user?.id || '');

  if (loading || permLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Activity className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If a specific page is required, check if user has view permission
  if (requiredPage && !canView(requiredPage)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">لا توجد صلاحيات لعرض هذه الصفحة</p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
