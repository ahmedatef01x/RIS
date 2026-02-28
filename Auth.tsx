import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Mail, Lock, User, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import { useI18n } from "@/lib/i18n";

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const emailSchema = z.string().email(language === 'ar' ? "البريد الإلكتروني غير صالح" : "Invalid email");
  const passwordSchema = z.string().min(6, language === 'ar' ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error(language === 'ar' ? "بيانات تسجيل الدخول غير صحيحة" : "Invalid login credentials");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success(language === 'ar' ? "تم تسجيل الدخول بنجاح" : "Logged in successfully");
      navigate("/");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
      if (!signupName.trim()) {
        toast.error(language === 'ar' ? "الاسم مطلوب" : "Name is required");
        return;
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes("already registered")) {
        toast.error(language === 'ar' ? "هذا البريد مسجل بالفعل" : "Email already registered");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success(language === 'ar' 
        ? "تم إنشاء الحساب بنجاح. يرجى التواصل مع المسؤول لتفعيل صلاحياتك."
        : "Account created. Please contact admin for permissions."
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Language Toggle */}
        <div className="flex justify-end mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="gap-2"
          >
            <Globe className="w-4 h-4" />
            {language === 'ar' ? 'English' : 'العربية'}
          </Button>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-info shadow-lg">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">RadiologyRIS</h1>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'نظام إدارة الأشعة' : 'Radiology Information System'}
            </p>
          </div>
        </div>

        <Card className="glass-card border-0 shadow-2xl">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-1 mb-4">
                <TabsTrigger value="login">{t.common.login}</TabsTrigger>
              </TabsList>
            
            <TabsContent value="login">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">
                  {language === 'ar' ? 'مرحباً بعودتك' : 'Welcome Back'}
                </CardTitle>
                <CardDescription>{t.auth.subtitle}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t.auth.email}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="example@hospital.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t.auth.password}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading 
                      ? (language === 'ar' ? "جارٍ تسجيل الدخول..." : "Signing in...") 
                      : t.auth.loginButton
                    }
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
            
            <TabsContent value="signup">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">
                  {language === 'ar' ? 'إنشاء الحساب معطل' : 'Account Creation Disabled'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'يرجى التواصل مع المسؤول لإنشاء حساب.' : 'Please contact your administrator to create an account.'}
                </CardDescription>
              </CardHeader>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
