import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Activity, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

/**
 * Component that redirects user to their default homepage
 * Shows loading state while fetching preferences
 */
export function HomeRedirect() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDelayed, setIsDelayed] = useState(false);

  useEffect(() => {
    const redirectToHome = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!user || !('id' in user)) {
          console.log('No user, redirecting to dashboard');
          navigate('/dashboard', { replace: true });
          return;
        }

        console.log(`🔍 Loading preferences for user: ${user.id}`);

        // Create a timeout that shows warning after 5 seconds
        const delayedWarningTimeout = setTimeout(() => {
          setIsDelayed(true);
        }, 5000);

        // Create an abort timeout after 10 seconds
        const abortTimeout = setTimeout(() => {
          console.error('❌ Preferences fetch timeout after 10 seconds');
          setError('انتهت مهلة الانتظار. جاري إعادة التوجيه إلى لوحة البيانات...');
          setIsLoading(false);
          
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);
        }, 10000);

        // Get user preferences to find their default homepage
        const prefs = await api.getUserPreferences(user.id);
        
        clearTimeout(delayedWarningTimeout);
        clearTimeout(abortTimeout);
        
        const homepage = prefs?.default_homepage || 'dashboard';
        
        // Map homepage name to actual route
        const routeMap: Record<string, string> = {
          dashboard: '/dashboard',
          patients: '/patients',
          worklist: '/worklist',
          scheduling: '/scheduling',
          reports: '/reporting',
          billing: '/billing',
          notifications: '/notifications',
          users: '/users',
          devices: '/devices',
          'exam-types': '/exam-types',
          settings: '/settings'
        };

        const route = routeMap[homepage] || '/dashboard';
        console.log(`🏠 Redirecting user to: ${homepage} (${route})`);
        
        setIsLoading(false);
        setTimeout(() => {
          navigate(route, { replace: true });
        }, 300);
      } catch (error) {
        console.error('❌ Error fetching user preferences:', error);
        setError('حدث خطأ أثناء تحميل التفضيلات. جاري إعادة التوجيه...');
        setIsLoading(false);
        
        // Try to default to dashboard after a short delay
        setTimeout(() => {
          console.log('Defaulting to dashboard');
          navigate('/dashboard', { replace: true });
        }, 2000);
      }
    };

    redirectToHome();
  }, [user, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Alert variant="destructive" className="border-red-600 bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800 ml-2">
              {error}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Show loading state
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-muted-foreground/20"></div>
            <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-spin" />
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-foreground">جاري التحميل...</h2>
            <p className="text-sm text-muted-foreground">جاري جلب تفضيلاتك</p>
          </div>
        </div>

        {isDelayed && (
          <Alert className="border-yellow-600 bg-yellow-50">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-800 ml-2">
              استغرق التحميل وقتاً طويلاً. قد يكون هناك انقطاع في الاتصال. سيتم إعادة التوجيه قريباً...
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
