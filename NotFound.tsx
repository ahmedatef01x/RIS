import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useI18n();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const handleGoHome = () => {
    navigate("/");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
          </div>
        </div>

        {/* Error Code */}
        <h1 className="mb-2 text-6xl font-bold bg-gradient-to-r from-destructive to-orange-500 bg-clip-text text-transparent">
          404
        </h1>

        {/* Message */}
        <p className="mb-2 text-2xl font-bold text-foreground">
          {language === 'ar' ? 'الصفحة غير موجودة' : 'Page Not Found'}
        </p>
        <p className="mb-6 text-muted-foreground text-sm">
          {language === 'ar' 
            ? 'آسفين، الصفحة التي تبحث عنها غير موجودة أو تم نقلها'
            : 'Sorry, the page you\'re looking for doesn\'t exist or has been moved'
          }
        </p>

        {/* Route Info */}
        <div className="mb-6 p-3 bg-muted rounded-lg border border-border">
          <p className="text-xs text-muted-foreground break-all font-mono">
            {location.pathname}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-center">
          <Button
            onClick={handleGoBack}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === 'ar' ? 'رجوع' : 'Go Back'}
          </Button>
          <Button
            onClick={handleGoHome}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            {language === 'ar' ? 'الصفحة الرئيسية' : 'Home'}
          </Button>
        </div>

        {/* Additional Help */}
        <div className="mt-8 p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
          <p className="text-xs text-muted-foreground">
            {language === 'ar'
              ? 'إذا استمرت المشكلة، يرجى الاتصال بفريق الدعم'
              : 'If the issue persists, please contact support'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
