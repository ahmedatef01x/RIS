import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthProvider } from "@/hooks/useAuth";
import { I18nProvider } from "@/providers/I18nProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { HomeRedirect } from "@/components/HomeRedirect";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PatientRegistration from "./pages/PatientRegistration";
import OrderEntry from "./pages/OrderEntry";
import Scheduling from "./pages/Scheduling";
import Worklist from "./pages/Worklist";
import Reporting from "./pages/Reporting";
import Billing from "./pages/Billing";
import UserManagement from "./pages/UserManagement";
import AdminUserManagement from "./pages/AdminUserManagement";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import ExamTypesManagement from "./pages/ExamTypesManagement";
import DevicesManagement from "./pages/DevicesManagement";
import BrandingSettings from "./pages/BrandingSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  useEffect(() => {
    // Temporary workaround: remove opacity-0 class from animated elements
    // so UI is visible if animations/CSS didn't run. This is safe for local debugging.
    try {
      const els = document.querySelectorAll('.opacity-0');
      els.forEach(el => el.classList.remove('opacity-0'));
    } catch (e) {
      // ignore
    }
  }, []),
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ErrorBoundary>
              <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute requiredPage="dashboard"><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
              <Route path="/patients" element={<ProtectedRoute requiredPage="patients"><MainLayout><PatientRegistration /></MainLayout></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute requiredPage="patients"><MainLayout><OrderEntry /></MainLayout></ProtectedRoute>} />
              <Route path="/scheduling" element={<ProtectedRoute requiredPage="scheduling"><MainLayout><Scheduling /></MainLayout></ProtectedRoute>} />
              <Route path="/worklist" element={<ProtectedRoute requiredPage="worklist"><MainLayout><Worklist /></MainLayout></ProtectedRoute>} />
              <Route path="/reporting" element={<ProtectedRoute requiredPage="reports"><MainLayout><Reporting /></MainLayout></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute requiredPage="billing"><MainLayout><Billing /></MainLayout></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute requiredPage="users"><MainLayout><UserManagement /></MainLayout></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requiredPage="users"><MainLayout><AdminUserManagement /></MainLayout></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute requiredPage="notifications"><MainLayout><Notifications /></MainLayout></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute requiredPage="settings"><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
              <Route path="/exam-types" element={<ProtectedRoute requiredPage="exam-types"><MainLayout><ExamTypesManagement /></MainLayout></ProtectedRoute>} />
              <Route path="/devices" element={<ProtectedRoute requiredPage="devices"><MainLayout><DevicesManagement /></MainLayout></ProtectedRoute>} />
              <Route path="/admin/branding" element={<ProtectedRoute requiredPage="branding"><MainLayout><BrandingSettings /></MainLayout></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
