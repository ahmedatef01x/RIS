import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ChangePasswordDialogProps {
  userId: string;
  userEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ChangePasswordDialog({
  userId,
  userEmail,
  open,
  onOpenChange,
  onSuccess
}: ChangePasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerateTempPassword = async () => {
    try {
      setLoading(true);
      const response = await api.resetUserPassword(userId);
      setTempPassword(response.tempPassword);
      toast({
        title: 'نجح',
        description: 'تم إنشاء كلمة مرور مؤقتة',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل إنشاء كلمة المرور المؤقتة',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validate
    if (!newPassword.trim()) {
      toast({
        title: 'خطأ',
        description: 'الرجاء إدخال كلمة المرور الجديدة',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'خطأ',
        description: 'كلمات المرور غير متطابقة',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await api.changeUserPassword(userId, newPassword);
      
      toast({
        title: 'نجح',
        description: 'تم تحديث كلمة المرور بنجاح',
      });

      // Reset form
      setNewPassword('');
      setConfirmPassword('');
      setTempPassword(null);
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل تحديث كلمة المرور',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (tempPassword) {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>تغيير كلمة المرور</DialogTitle>
          <DialogDescription>
            {userEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Option 1: Generate Temp Password */}
          <div className="border rounded-lg p-4 space-y-3 bg-blue-50">
            <h3 className="font-semibold text-sm text-blue-900">الخيار 1: إنشاء كلمة مرور مؤقتة</h3>
            <p className="text-sm text-blue-800">
              سيتم إنشاء كلمة مرور عشوائية يمكن إرسالها للمستخدم
            </p>
            
            {tempPassword && (
              <Alert className="border-green-600 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 ml-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{tempPassword}</span>
                    <Button
                      size="sm"
                      variant={copied ? 'default' : 'outline'}
                      onClick={copyToClipboard}
                      className="ml-2"
                    >
                      {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleGenerateTempPassword}
              disabled={loading || !!tempPassword}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              إنشاء كلمة مرور مؤقتة
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">أو</span>
            </div>
          </div>

          {/* Option 2: Set Custom Password */}
          <div className="border rounded-lg p-4 space-y-3 bg-purple-50">
            <h3 className="font-semibold text-sm text-purple-900">الخيار 2: تعيين كلمة مرور محددة</h3>
            
            <div>
              <Label htmlFor="new-password" className="text-sm">كلمة المرور الجديدة</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="أدخل كلمة المرور الجديدة"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="confirm-password" className="text-sm">تأكيد كلمة المرور</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="أعد إدخال كلمة المرور"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="mt-1"
              />
            </div>

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>كلمات المرور غير متطابقة</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleChangePassword}
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              تحديث كلمة المرور
            </Button>
          </div>

          {/* Warning */}
          <Alert className="border-orange-600 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 ml-2">
              تأكد من إرسال كلمة المرور الجديدة للمستخدم بشكل آمن
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
