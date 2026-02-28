import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddNameDialogProps {
  open: boolean;
  arabicName: string;
  onOpenChange: (open: boolean) => void;
  onAddName: (arabicName: string, englishName: string) => Promise<void>;
  isLoading: boolean;
}

export function AddNameDialog({
  open,
  arabicName,
  onOpenChange,
  onAddName,
  isLoading,
}: AddNameDialogProps) {
  const [englishName, setEnglishName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!englishName.trim()) {
      toast.error("يرجى إدخال الاسم بالإنجليزية");
      return;
    }

    setSubmitting(true);
    try {
      await onAddName(arabicName, englishName);
      toast.success("تم إضافة الاسم إلى القاموس");
      setEnglishName("");
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "فشل في إضافة الاسم";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>إضافة اسم جديد</DialogTitle>
          <DialogDescription>
            لم نجد "{arabicName}" في القاموس. يرجى إضافة الترجمة الإنجليزية للاسم.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="arabic-name">الاسم بالعربية</Label>
            <Input
              id="arabic-name"
              value={arabicName}
              disabled
              className="bg-muted/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="english-name">الاسم بالإنجليزية *</Label>
            <Input
              id="english-name"
              placeholder="مثال: Muhammad"
              value={englishName}
              onChange={(e) => setEnglishName(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={submitting || isLoading}>
              {submitting || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الإضافة...
                </>
              ) : (
                "إضافة الاسم"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
