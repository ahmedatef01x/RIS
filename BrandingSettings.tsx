import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  Trash2,
  Edit,
  Save,
  X,
  Image,
  Settings,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { USE_LOCAL_API } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface BrandingData {
  id?: string;
  clinic_name: string;
  clinic_name_en: string;
  logo_path: string;
  logo_mobile_path?: string;
  favicon_path: string;
  hero_image_path: string;
  primary_color: string;
  secondary_color: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  footer_text: string;
  about_text: string;
}

interface MediaItem {
  id: string;
  title: string;
  description: string;
  image_path: string;
  category: string;
  display_order: number;
  is_active: boolean;
}

export default function BrandingSettings() {
  const { user } = useAuth();
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<BrandingData>({
    clinic_name: "",
    clinic_name_en: "",
    logo_path: "",
    logo_mobile_path: "",
    favicon_path: "",
    hero_image_path: "",
    primary_color: "#0066FF",
    secondary_color: "#FF6B6B",
    address: "",
    phone: "",
    email: "",
    website: "",
    footer_text: "",
    about_text: "",
  });

  const [mediaFormData, setMediaFormData] = useState({
    title: "",
    description: "",
    category: "other",
    image_path: "",
  });

  useEffect(() => {
    fetchBranding();
    fetchMedia();
  }, []);

  const fetchBranding = async () => {
    try {
      if (USE_LOCAL_API) {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('http://localhost:3001/api/branding', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) throw new Error('Failed to fetch branding');
        
        const data = await response.json();
        setBranding(data);
        if (data) {
          setFormData({
            clinic_name: data.clinic_name || "",
            clinic_name_en: data.clinic_name_en || "",
            logo_path: data.logo_path || "",
            favicon_path: data.favicon_path || "",
            hero_image_path: data.hero_image_path || "",
            primary_color: data.primary_color || "#0066FF",
            secondary_color: data.secondary_color || "#FF6B6B",
            address: data.address || "",
            phone: data.phone || "",
            email: data.email || "",
            website: data.website || "",
            footer_text: data.footer_text || "",
            about_text: data.about_text || "",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching branding:", error);
      toast.error("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const fetchMedia = async () => {
    try {
      if (USE_LOCAL_API) {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('http://localhost:3001/api/media', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) throw new Error('Failed to fetch media');
        
        const data = await response.json();
        setMedia(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
      toast.error("فشل تحميل الصور");
    }
  };

  const handleSaveBranding = async () => {
    try {
      if (USE_LOCAL_API) {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('http://localhost:3001/api/branding', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
        
        if (!response.ok) throw new Error('Failed to save branding');
        
        toast.success("تم حفظ معلومات المركز بنجاح");
        setEditDialogOpen(false);
        fetchBranding();
      }
    } catch (error) {
      console.error("Error saving branding:", error);
      toast.error("فشل حفظ المعلومات");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
        setMediaFormData((prev) => ({
          ...prev,
          image_path: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadMedia = async () => {
    if (!mediaFormData.title || !mediaFormData.image_path) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      if (USE_LOCAL_API) {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('http://localhost:3001/api/media', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mediaFormData),
        });
        
        if (!response.ok) throw new Error('Failed to upload media');
        
        toast.success("تم رفع الصورة بنجاح");
        setUploadDialogOpen(false);
        setMediaFormData({
          title: "",
          description: "",
          category: "other",
          image_path: "",
        });
        setMediaPreview(null);
        setMediaFile(null);
        fetchMedia();
      }
    } catch (error) {
      console.error("Error uploading media:", error);
      toast.error("فشل رفع الصورة");
    }
  };

  const handleDeleteMedia = async (id: string) => {
    try {
      if (USE_LOCAL_API) {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`http://localhost:3001/api/media/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) throw new Error('Failed to delete media');
        
        toast.success("تم حذف الصورة بنجاح");
        fetchMedia();
      }
    } catch (error) {
      console.error("Error deleting media:", error);
      toast.error("فشل حذف الصورة");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">إدارة العلامة التجارية</h1>
          <p className="text-muted-foreground">إدارة معلومات المركز والصور والشعارات</p>
        </div>
      </div>

      {/* معلومات المركز */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            معلومات المركز
          </CardTitle>
          <Button
            onClick={() => setEditDialogOpen(true)}
            size="sm"
            className="gap-2"
          >
            <Edit className="w-4 h-4" />
            تعديل
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">اسم المركز (عربي)</Label>
              <p className="font-medium text-lg">{formData.clinic_name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Clinic Name (English)</Label>
              <p className="font-medium text-lg">{formData.clinic_name_en}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">العنوان</Label>
              <p className="text-sm">{formData.address || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">الهاتف</Label>
              <p className="text-sm">{formData.phone || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">البريد الإلكتروني</Label>
              <p className="text-sm">{formData.email || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">الموقع الإلكتروني</Label>
              <p className="text-sm">{formData.website || "—"}</p>
            </div>
          </div>

          {formData.logo_path && (
            <div className="border-t pt-4">
              <Label className="text-muted-foreground">الشعار الحالي</Label>
              <img
                src={formData.logo_path}
                alt="logo"
                className="h-16 mt-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* معرض الصور */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            معرض الصور ({media.length})
          </CardTitle>
          <Button
            onClick={() => setUploadDialogOpen(true)}
            size="sm"
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            رفع صورة
          </Button>
        </CardHeader>
        <CardContent>
          {media.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد صور بعد. ابدأ برفع صور جديدة!
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {media.map((item) => (
                <div key={item.id} className="relative group">
                  <img
                    src={item.image_path}
                    alt={item.title}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDeleteMedia(item.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {item.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog تعديل البيانات */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل معلومات المركز</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>اسم المركز (عربي)</Label>
                <Input
                  value={formData.clinic_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      clinic_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Clinic Name (English)</Label>
                <Input
                  value={formData.clinic_name_en}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      clinic_name_en: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>العنوان</Label>
                <Input
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder="مثال: شارع النيل، القاهرة"
                />
              </div>
              <div>
                <Label>الهاتف</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="مثال: +201234567890"
                />
              </div>
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  type="email"
                />
              </div>
              <div>
                <Label>الموقع الإلكتروني</Label>
                <Input
                  value={formData.website}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      website: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>اللون الأساسي</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        primary_color: e.target.value,
                      }))
                    }
                    className="h-10 w-20"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        primary_color: e.target.value,
                      }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label>اللون الثانوي</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        secondary_color: e.target.value,
                      }))
                    }
                    className="h-10 w-20"
                  />
                  <Input
                    value={formData.secondary_color}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        secondary_color: e.target.value,
                      }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* مسارات الصور */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-sm">مسارات الصور</h3>
              
              <div>
                <Label>مسار الشعار (Logo)</Label>
                <Input
                  value={formData.logo_path}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      logo_path: e.target.value,
                    }))
                  }
                  placeholder="مثال: /images/logo.png"
                />
                {formData.logo_path && (
                  <img src={formData.logo_path} alt="logo preview" className="h-12 mt-2" />
                )}
              </div>

              <div>
                <Label>مسار الشعار للجوال (Mobile Logo)</Label>
                <Input
                  value={formData.logo_mobile_path || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      logo_mobile_path: e.target.value,
                    }))
                  }
                  placeholder="مثال: /images/logo-mobile.png"
                />
              </div>

              <div>
                <Label>مسار Favicon</Label>
                <Input
                  value={formData.favicon_path}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      favicon_path: e.target.value,
                    }))
                  }
                  placeholder="مثال: /images/favicon.ico"
                />
              </div>

              <div>
                <Label>مسار صورة البطل (Hero Image)</Label>
                <Input
                  value={formData.hero_image_path}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      hero_image_path: e.target.value,
                    }))
                  }
                  placeholder="مثال: /images/hero.jpg"
                />
                {formData.hero_image_path && (
                  <img src={formData.hero_image_path} alt="hero preview" className="w-full h-24 object-cover mt-2 rounded" />
                )}
              </div>
            </div>

            <div>
              <Label>نص التذييل</Label>
              <Textarea
                value={formData.footer_text}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    footer_text: e.target.value,
                  }))
                }
                placeholder="نص يظهر في تذييل الموقع"
                rows={3}
              />
            </div>

            <div>
              <Label>نص عن المركز</Label>
              <Textarea
                value={formData.about_text}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    about_text: e.target.value,
                  }))
                }
                placeholder="معلومات عن المركز"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveBranding} className="gap-2">
              <Save className="w-4 h-4" />
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog رفع صورة */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>رفع صورة جديدة</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>عنوان الصورة</Label>
              <Input
                value={mediaFormData.title}
                onChange={(e) =>
                  setMediaFormData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="مثال: الأجهزة الطبية"
              />
            </div>

            <div>
              <Label>الفئة</Label>
              <Select
                value={mediaFormData.category}
                onValueChange={(value) =>
                  setMediaFormData((prev) => ({
                    ...prev,
                    category: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipment">الأجهزة</SelectItem>
                  <SelectItem value="facility">المنشأة</SelectItem>
                  <SelectItem value="team">الفريق</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>الوصف</Label>
              <Textarea
                value={mediaFormData.description}
                onChange={(e) =>
                  setMediaFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="وصف الصورة"
                rows={3}
              />
            </div>

            <div>
              <Label>الصورة</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">اضغط لاختيار صورة</p>
                </label>
              </div>

              {mediaPreview && (
                <div className="mt-4">
                  <img
                    src={mediaPreview}
                    alt="preview"
                    className="w-full max-h-48 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setMediaPreview(null);
              }}
            >
              إلغاء
            </Button>
            <Button onClick={handleUploadMedia} className="gap-2">
              <Upload className="w-4 h-4" />
              رفع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
