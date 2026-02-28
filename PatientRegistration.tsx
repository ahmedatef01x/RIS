import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Search, History, FileText, Phone, MapPin, Shield, Building, Activity, ChevronDown, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { api, USE_LOCAL_API } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useNamesDictionary } from "@/hooks/useNamesDictionary";
import { useI18n } from "@/lib/i18n";
import { AddNameDialog } from "@/components/AddNameDialog";

interface Patient {
  id: string;
  mrn: string;
  national_id?: string | null;
  date_of_birth?: string | null;
  full_name: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  insurance_number: string | null;
  referral_source: string | null;
  created_at: string;
}

export default function PatientRegistration() {
  const { user, isLocalMode } = useAuth();
  const { canCreate, canEdit } = useUserPermissions(user?.id || '');
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [formData, setFormData] = useState({
    mrn: "",
    nationalId: "",
    dateOfBirth: "",
    firstName_ar: "",
    secondName_ar: "",
    thirdName_ar: "",
    fourthName_ar: "",
    firstName_en: "",
    secondName_en: "",
    thirdName_en: "",
    fourthName_en: "",
    age: "",
    gender: "",
    phone: "",
    address: "",
    insuranceNumber: "",
    referralSource: "",
    medicalHistory: "",
  });
  
  // Names dictionary states for each name field
  const nameField1 = useNamesDictionary();
  const nameField2 = useNamesDictionary();
  const nameField3 = useNamesDictionary();
  const nameField4 = useNamesDictionary();
  
  const [showAddNameDialog, setShowAddNameDialog] = useState(false);
  const [pendingArabicName, setPendingArabicName] = useState("");
  const [activeNameField, setActiveNameField] = useState<1|2|3|4>(1);
  const [showSuggestions, setShowSuggestions] = useState<{[key: number]: boolean}>({
    1: false,
    2: false,
    3: false,
    4: false,
  });
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentPatients();
  }, []);

  const fetchRecentPatients = async () => {
    try {
      if (isLocalMode) {
        const data = await api.getPatients();
        setPatients((data || []).slice(0, 10));
      } else {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        setPatients(data || []);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm) return;
    
    setSearchLoading(true);
    try {
      if (isLocalMode) {
        const data = await api.getPatients(searchTerm);
        setPatients(data || []);
      } else {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .or(`mrn.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,national_id.ilike.%${searchTerm}%`)
          .limit(20);

        if (error) throw error;
        setPatients(data || []);
      }
    } catch (error) {
      toast.error("فشل في البحث");
    } finally {
      setSearchLoading(false);
    }
  };

  // Load patient data for editing
  const loadPatientForEdit = async (patientId: string) => {
    try {
      let patient: any;
      
      if (isLocalMode) {
        patient = await api.getPatient(patientId);
      } else {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .eq("id", patientId)
          .single();
        
        if (error) throw error;
        patient = data;
      }

      if (!patient) {
        toast.error("فشل في تحميل بيانات المريض");
        return;
      }

      // Load patient data into form
      setFormData({
        mrn: patient.mrn || "",
        nationalId: patient.national_id || "",
        dateOfBirth: patient.date_of_birth ? patient.date_of_birth.split('T')[0] : "",
        firstName_ar: patient.firstName_ar || "",
        secondName_ar: patient.secondName_ar || "",
        thirdName_ar: patient.thirdName_ar || "",
        fourthName_ar: patient.fourthName_ar || "",
        firstName_en: patient.firstName_en || "",
        secondName_en: patient.secondName_en || "",
        thirdName_en: patient.thirdName_en || "",
        fourthName_en: patient.fourthName_en || "",
        age: patient.age ? String(patient.age) : "",
        gender: patient.gender || "",
        phone: patient.phone || "",
        address: patient.address || "",
        insuranceNumber: patient.insurance_number || "",
        referralSource: patient.referral_source || "",
        medicalHistory: patient.medical_history || "",
      });

      // Update the patients list to reflect the selected patient
      setPatients(prevPatients => 
        prevPatients.map(p => p.id === patientId ? patient : p)
      );

      setEditingPatientId(patientId);
      
      // Scroll to form
      setTimeout(() => {
        document.querySelector('[data-patient-form]')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      toast.info("تم تحميل بيانات المريض");
    } catch (error: any) {
      toast.error(error.message || "فشل في تحميل بيانات المريض");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName_ar || !formData.phone) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }

    setLoading(true);
    try {
      let mrn = formData.mrn;
      if (!mrn) {
        if (isLocalMode) {
          const gen = await api.generateMRN();
          mrn = gen?.mrn || '1';
        } else {
          const { data: lastPatients } = await supabase
            .from('patients')
            .select('mrn')
            .order('created_at', { ascending: false })
            .limit(200);
          let maxNum = 0;
          (lastPatients || []).forEach((p: any) => {
            const m = String(p.mrn || '').match(/^\d+$/);
            if (m) {
              const n = parseInt(m[0], 10);
              if (n > maxNum) maxNum = n;
            }
          });
          mrn = String(maxNum + 1 || 1);
        }
      }
      
      // Combine all name parts
      const fullName_ar = [formData.firstName_ar, formData.secondName_ar, formData.thirdName_ar, formData.fourthName_ar]
        .filter(n => n)
        .join(" ");
      const fullName_en = [formData.firstName_en, formData.secondName_en, formData.thirdName_en, formData.fourthName_en]
        .filter(n => n)
        .join(" ");
      const fullName = fullName_en ? `${fullName_ar} (${fullName_en})` : fullName_ar;
      
      const patientData = {
        mrn,
        national_id: formData.nationalId || null,
        date_of_birth: formData.dateOfBirth || null,
        full_name: fullName,
        firstName_ar: formData.firstName_ar,
        secondName_ar: formData.secondName_ar,
        thirdName_ar: formData.thirdName_ar,
        fourthName_ar: formData.fourthName_ar,
        firstName_en: formData.firstName_en,
        secondName_en: formData.secondName_en,
        thirdName_en: formData.thirdName_en,
        fourthName_en: formData.fourthName_en,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        phone: formData.phone,
        address: formData.address || null,
        insurance_number: formData.insuranceNumber || null,
        referral_source: formData.referralSource || null,
        medical_history: formData.medicalHistory || null,
        created_by: user?.id
      };

      if (editingPatientId) {
        // Update existing patient
        if (isLocalMode) {
          await api.updatePatient(editingPatientId, patientData);
        } else {
          const { error } = await supabase
            .from("patients")
            .update(patientData)
            .eq("id", editingPatientId);
          if (error) throw error;
        }
        
        toast.success(t.patients.updatePatient, {
          description: `${t.patients.registeredPatientFile}${mrn}`,
        });
      } else {
        // Create new patient
        if (isLocalMode) {
          await api.createPatient(patientData);
        } else {
          const { error } = await supabase
            .from("patients")
            .insert([patientData]);
          if (error) throw error;
        }
        
        toast.success(t.patients.registeredPatient, {
          description: `${t.patients.registeredPatientFile}${mrn}`,
        });
      }
      
      setFormData({
        mrn: "",
        nationalId: "",
        dateOfBirth: "",
        firstName_ar: "",
        secondName_ar: "",
        thirdName_ar: "",
        fourthName_ar: "",
        firstName_en: "",
        secondName_en: "",
        thirdName_en: "",
        fourthName_en: "",
        age: "",
        gender: "",
        phone: "",
        address: "",
        insuranceNumber: "",
        referralSource: "",
        medicalHistory: "",
      });
      
      setEditingPatientId(null);
      setShowSuggestions({1: false, 2: false, 3: false, 4: false});
      fetchRecentPatients();
    } catch (error: any) {
      toast.error(error.message || "فشل في تسجيل المريض");
    } finally {
      setLoading(false);
    }
  };

  // Clear form and exit edit mode
  const handleClearForm = () => {
    setFormData({
      mrn: "",
      nationalId: "",
      dateOfBirth: "",
      firstName_ar: "",
      secondName_ar: "",
      thirdName_ar: "",
      fourthName_ar: "",
      firstName_en: "",
      secondName_en: "",
      thirdName_en: "",
      fourthName_en: "",
      age: "",
      gender: "",
      phone: "",
      address: "",
      insuranceNumber: "",
      referralSource: "",
      medicalHistory: "",
    });
    setEditingPatientId(null);
    setShowSuggestions({1: false, 2: false, 3: false, 4: false});
  };

  const calculateAgeFromDOB = (dobValue: string) => {
    if (!dobValue) return '';
    const dob = new Date(dobValue);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
    return String(age >= 0 ? age : '');
  };

  const generateMRN = async () => {
    try {
      if (isLocalMode) {
        const gen = await api.generateMRN();
        const mrn = gen?.mrn || '1';
        setFormData({ ...formData, mrn });
        toast.info(t.patients.mrnGenerated, { description: mrn });
      } else {
        const { data: lastPatients } = await supabase
          .from('patients')
          .select('mrn')
          .order('created_at', { ascending: false })
          .limit(200);
        let maxNum = 0;
        (lastPatients || []).forEach((p: any) => {
          const m = String(p.mrn || '').match(/^\d+$/);
          if (m) {
            const n = parseInt(m[0], 10);
            if (n > maxNum) maxNum = n;
          }
        });
        const mrn = String(maxNum + 1 || 1);
        setFormData({ ...formData, mrn });
        toast.info(t.patients.mrnGenerated, { description: mrn });
      }
    } catch (err) {
      toast.error('فشل في توليد MRN');
    }
  };

  // Get the appropriate hook instance based on field number
  const getNameFieldHook = (fieldNum: 1|2|3|4) => {
    switch(fieldNum) {
      case 1: return nameField1;
      case 2: return nameField2;
      case 3: return nameField3;
      case 4: return nameField4;
    }
  };

  // Get the appropriate form field name based on field number and language
  const getFieldName = (fieldNum: 1|2|3|4, lang: 'ar'|'en'): keyof typeof formData => {
    const names: {[key: string]: keyof typeof formData} = {
      '1_ar': 'firstName_ar',
      '1_en': 'firstName_en',
      '2_ar': 'secondName_ar',
      '2_en': 'secondName_en',
      '3_ar': 'thirdName_ar',
      '3_en': 'thirdName_en',
      '4_ar': 'fourthName_ar',
      '4_en': 'fourthName_en',
    };
    return names[`${fieldNum}_${lang}`];
  };

  // Handle name field input with dictionary search
  const handleNameFieldChange = async (fieldNum: 1|2|3|4, lang: 'ar'|'en', value: string) => {
    const fieldName = getFieldName(fieldNum, lang);
    setFormData({ ...formData, [fieldName]: value });
    
    if (lang === 'ar' && value.trim().length > 0) {
      setShowSuggestions({...showSuggestions, [fieldNum]: true});
      const hook = getNameFieldHook(fieldNum);
      await hook.searchNames(value);
    } else if (value.trim().length === 0) {
      setShowSuggestions({...showSuggestions, [fieldNum]: false});
    }
  };

  // Handle selecting a name from suggestions
  const handleNameFieldSelect = async (fieldNum: 1|2|3|4, name: { arabicName: string; englishName: string }) => {
    const arField = getFieldName(fieldNum, 'ar');
    const enField = getFieldName(fieldNum, 'en');
    setFormData({
      ...formData,
      [arField]: name.arabicName,
      [enField]: name.englishName,
    });
    setShowSuggestions({...showSuggestions, [fieldNum]: false});
  };

  // Handle name field blur event - look up exact name
  const handleNameFieldBlur = async (fieldNum: 1|2|3|4) => {
    const arField = getFieldName(fieldNum, 'ar');
    const arabicName = formData[arField] as string;
    
    if (!arabicName.trim()) {
      setShowSuggestions({...showSuggestions, [fieldNum]: false});
      return;
    }

    const hook = getNameFieldHook(fieldNum);
    const found = await hook.lookupName(arabicName);
    
    if (found) {
      const enField = getFieldName(fieldNum, 'en');
      setFormData({
        ...formData,
        [enField]: found.englishName,
      });
    } else {
      // Name not found - show dialog to add it
      setPendingArabicName(arabicName);
      setActiveNameField(fieldNum);
      setShowAddNameDialog(true);
    }
    setShowSuggestions({...showSuggestions, [fieldNum]: false});
  };

  // Handle adding a new name to dictionary for specific field
  const handleAddNameForField = async (arabicName: string, englishName: string) => {
    const hook = getNameFieldHook(activeNameField);
    const result = await hook.addName(arabicName, englishName);
    if (result) {
      const arField = getFieldName(activeNameField, 'ar');
      const enField = getFieldName(activeNameField, 'en');
      setFormData({
        ...formData,
        [arField]: result.arabicName,
        [enField]: result.englishName,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.patients.pageTitle}</h1>
          <p className="text-muted-foreground">{t.patients.pageSubtitle}</p>
        </div>
        {!canCreate('patients') && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <Lock className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-600">{t.patients.noPermissions}</span>
          </div>
        )}
        <Button 
          onClick={generateMRN} 
          variant="outline" 
          className="gap-2"
          disabled={!canCreate('patients')}
        >
          <FileText className="w-4 h-4" />
          {t.patients.generateMRN}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="new" className="animate-slide-up opacity-0 stagger-1" style={{ animationFillMode: "forwards" }}>
            <TabsList className="glass-card p-1">
              <TabsTrigger value="new" className="gap-2" disabled={!canCreate('patients')}>
                <UserPlus className="w-4 h-4" />
                {t.patients.newPatient}
              </TabsTrigger>
              <TabsTrigger value="search" className="gap-2">
                <Search className="w-4 h-4" />
                {t.patients.searchPatient}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="mt-6">
              <form onSubmit={handleSubmit} className="space-y-6" data-patient-form>
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-primary" />
                      {editingPatientId ? t.patients.editPatient : t.patients.personalData}
                    </CardTitle>
                    <CardDescription>
                      {editingPatientId ? t.patients.editPatientDesc : t.patients.personalDataDesc}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="mrn">{t.patients.mrnFull}</Label>
                        <Input
                          id="mrn"
                          placeholder={t.patients.mrnPlaceholder}
                          value={formData.mrn}
                          onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
                          className="bg-muted/50"
                        />
                      </div>
                    </div>

                    {/* 4-Part Name Fields */}
                    <div className="border-t pt-4">
                      <Label className="text-base font-semibold mb-4 block">{t.patients.fourPartName}</Label>
                      
                      {[1, 2, 3, 4].map((fieldNum) => {
                        const fieldNumTyped = fieldNum as 1|2|3|4;
                        const arField = getFieldName(fieldNumTyped, 'ar');
                        const enField = getFieldName(fieldNumTyped, 'en');
                        const hook = getNameFieldHook(fieldNumTyped);
                        
                        const getArabicLabel = (num: number) => {
                          switch(num) {
                            case 1: return t.patients.firstNameAr;
                            case 2: return t.patients.secondNameAr;
                            case 3: return t.patients.thirdNameAr;
                            case 4: return t.patients.fourthNameAr;
                            default: return '';
                          }
                        };
                        
                        const getEnglishLabel = (num: number) => {
                          switch(num) {
                            case 1: return t.patients.firstNameEn;
                            case 2: return t.patients.secondNameEn;
                            case 3: return t.patients.thirdNameEn;
                            case 4: return t.patients.fourthNameEn;
                            default: return '';
                          }
                        };
                        
                        return (
                          <div key={fieldNum} className="grid grid-cols-2 gap-4 mb-3">
                            {/* Arabic Name Field */}
                            <div className="space-y-2">
                              <Label htmlFor={`firstName_ar_${fieldNum}`} className="text-sm">
                                {getArabicLabel(fieldNum)}
                                {fieldNum === 1 && " *"}
                              </Label>
                              <div className="relative">
                                <Input
                                  id={`firstName_ar_${fieldNum}`}
                                  placeholder={fieldNum === 1 ? t.patients.firstNameArabicPlaceholder : t.patients.optionalPlaceholder}
                                  value={formData[arField] as string}
                                  onChange={(e) => handleNameFieldChange(fieldNumTyped, 'ar', e.target.value)}
                                  onFocus={() => (formData[arField] as string).trim() && setShowSuggestions({...showSuggestions, [fieldNum]: true})}
                                  onBlur={() => handleNameFieldBlur(fieldNumTyped)}
                                  className="bg-muted/50"
                                  required={fieldNum === 1}
                                />
                                {showSuggestions[fieldNum] && (formData[arField] as string) && hook.searchResults.length > 0 && (
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-50 max-h-48 overflow-y-auto">
                                    {hook.searchResults.map((name) => (
                                      <button
                                        key={name.id}
                                        type="button"
                                        onClick={() => handleNameFieldSelect(fieldNumTyped, name)}
                                        className="w-full px-4 py-2 text-right hover:bg-accent transition-colors flex justify-between items-center"
                                      >
                                        <span className="text-xs text-muted-foreground">{name.englishName}</span>
                                        <span className="font-medium">{name.arabicName}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* English Name Field */}
                            <div className="space-y-2">
                              <Label htmlFor={`firstName_en_${fieldNum}`} className="text-sm">
                                {getEnglishLabel(fieldNum)}
                              </Label>
                              <Input
                                id={`firstName_en_${fieldNum}`}
                                placeholder={t.patients.autoFill}
                                value={formData[enField] as string}
                                onChange={(e) => handleNameFieldChange(fieldNumTyped, 'en', e.target.value)}
                                className="bg-muted/50"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">{t.patients.dateOfBirth || 'تاريخ الميلاد'}</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          placeholder={t.patients.dateOfBirthPlaceholder || ''}
                          value={formData.dateOfBirth}
                          onChange={(e) => {
                            const dob = e.target.value;
                            setFormData({ ...formData, dateOfBirth: dob, age: calculateAgeFromDOB(dob) });
                          }}
                          className="bg-muted/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="age">{t.patients.age}</Label>
                        <Input
                          id="age"
                          type="number"
                          placeholder={t.patients.agePlaceholder}
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                          className="bg-muted/50"
                          readOnly
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">{t.patients.gender}</Label>
                        <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                          <SelectTrigger className="bg-muted/50">
                            <SelectValue placeholder={t.patients.genderPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">{t.patients.male}</SelectItem>
                            <SelectItem value="female">{t.patients.female}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t.patients.phone}</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            placeholder={t.patients.phonePlaceholder}
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="bg-muted/50 pl-10"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      {t.patients.addressAndInsurance}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">{t.patients.address}</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Textarea
                          id="address"
                          placeholder={t.patients.addressPlaceholder}
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="bg-muted/50 pl-10 min-h-[80px]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nationalId">{t.patients.nationalId || 'الرقم القومى'}</Label>
                        <Input
                          id="nationalId"
                          placeholder={t.patients.nationalIdPlaceholder || ''}
                          value={formData.nationalId}
                          onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                          className="bg-muted/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="insuranceNumber">{t.patients.insurance}</Label>
                        <Input
                          id="insuranceNumber"
                          placeholder={t.patients.insurancePlaceholder}
                          value={formData.insuranceNumber}
                          onChange={(e) => setFormData({ ...formData, insuranceNumber: e.target.value })}
                          className="bg-muted/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="referralSource">{t.patients.referral}</Label>
                        <Select value={formData.referralSource} onValueChange={(v) => setFormData({ ...formData, referralSource: v })}>
                          <SelectTrigger className="bg-muted/50">
                            <SelectValue placeholder={t.patients.referralPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="internal">{t.patients.referralInternal}</SelectItem>
                            <SelectItem value="external">{t.patients.referralExternal}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="medicalHistory">{t.patients.medicalHistory}</Label>
                      <Textarea
                        id="medicalHistory"
                        placeholder={t.patients.medicalHistoryPlaceholder}
                        value={formData.medicalHistory}
                        onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                        className="bg-muted/50 min-h-[100px]"
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setFormData({
                      mrn: "",
                      firstName_ar: "",
                      secondName_ar: "",
                      thirdName_ar: "",
                      fourthName_ar: "",
                      firstName_en: "",
                      secondName_en: "",
                      thirdName_en: "",
                      fourthName_en: "",
                      age: "",
                      gender: "",
                      phone: "",
                      address: "",
                      insuranceNumber: "",
                      referralSource: "",
                      medicalHistory: "",
                    });
                    setEditingPatientId(null);
                    setShowSuggestions({1: false, 2: false, 3: false, 4: false});
                  }}>
                    {t.patients.cancel}
                  </Button>
                  <Button 
                    type="submit" 
                    className="gap-2" 
                    disabled={loading || (editingPatientId ? !canEdit('patients') : !canCreate('patients'))}
                  >
                    {loading ? <Activity className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {editingPatientId ? t.patients.submitUpdate : t.patients.submitNew}
                  </Button>
                </div>
              </form>

              <AddNameDialog
                open={showAddNameDialog}
                arabicName={pendingArabicName}
                onOpenChange={setShowAddNameDialog}
                onAddName={handleAddNameForField}
                isLoading={nameField1.loading}
              />
            </TabsContent>

            <TabsContent value="search" className="mt-6">
              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle>{t.patients.searchPatient}</CardTitle>
                  <CardDescription>{t.patients.searchPatientDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder={t.patients.searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-12 h-12 text-lg bg-muted/50"
                    />
                  </div>
                  <Button onClick={handleSearch} className="w-full" disabled={searchLoading}>
                    {searchLoading ? <Activity className="w-4 h-4 animate-spin mr-2" /> : null}
                    {t.patients.search}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6 animate-slide-up opacity-0 stagger-2" style={{ animationFillMode: "forwards" }}>
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                {t.patients.recentPatients}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {patients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t.patients.noPatients}</p>
              ) : (
                patients.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => loadPatientForEdit(patient.id)}
                    className={cn(
                      "p-3 rounded-lg transition-all cursor-pointer group",
                      editingPatientId === patient.id
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-muted/30 hover:bg-muted/50 border-2 border-transparent"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{patient.full_name}</p>
                        <p className="text-sm text-muted-foreground">{patient.mrn}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {patient.gender === "male" ? t.patients.male : patient.gender === "female" ? t.patients.female : "-"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{patient.phone}</span>
                      <span>{new Date(patient.created_at).toLocaleDateString("ar-EG")}</span>
                    </div>
                    {editingPatientId === patient.id && (
                      <div className="mt-2 pt-2 border-t border-primary/20">
                        <p className="text-xs text-primary font-medium">{t.patients.editInProgress}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
