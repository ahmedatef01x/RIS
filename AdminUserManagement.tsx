import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Search, Plus, Shield, Edit, Trash2, MoreHorizontal,
  UserCheck, UserX, Activity, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { api, USE_LOCAL_API } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import UserPermissionsDialog from "@/components/UserPermissionsDialog";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";

type AppRole = "admin" | "radiologist" | "technician" | "reception" | "billing";

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
  role: AppRole | null;
}

export default function AdminUserManagement() {
  const { user: currentUser, hasRole, isLocalMode } = useAuth();
  const { t, language } = useI18n();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("reception");
  const [newUserDepartment, setNewUserDepartment] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");

  const roleConfig: Record<AppRole, { label: string; color: string }> = {
    admin: { label: language === 'ar' ? "مدير" : "Admin", color: "bg-destructive/10 text-destructive border-destructive/30" },
    radiologist: { label: language === 'ar' ? "أخصائي أشعة" : "Radiologist", color: "bg-primary/10 text-primary border-primary/30" },
    technician: { label: language === 'ar' ? "فني" : "Technician", color: "bg-info/10 text-info border-info/30" },
    reception: { label: language === 'ar' ? "استقبال" : "Reception", color: "bg-warning/10 text-warning border-warning/30" },
    billing: { label: language === 'ar' ? "محاسبة" : "Billing", color: "bg-success/10 text-success border-success/30" },
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (USE_LOCAL_API || isLocalMode) {
        const data = await api.getUsers();
        setUsers(data || []);
      } else {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (profilesError) throw profilesError;

        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("*");

        if (rolesError) throw rolesError;

        const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
          const userRole = roles?.find(r => r.user_id === profile.id);
          return {
            ...profile,
            role: userRole?.role as AppRole | null
          };
        });

        setUsers(usersWithRoles);
      }
    } catch (error: any) {
      toast.error(language === 'ar' ? "فشل في تحميل المستخدمين" : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserName) {
      toast.error(language === 'ar' ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
      return;
    }

    try {
      if (USE_LOCAL_API || isLocalMode) {
        await api.createUser({
          email: newUserEmail,
          password: newUserPassword,
          fullName: newUserName,
          role: newUserRole,
          department: newUserDepartment,
          phone: newUserPhone,
        });
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: newUserEmail,
          password: newUserPassword,
          options: {
            data: { full_name: newUserName }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error(language === 'ar' ? "فشل في إنشاء المستخدم" : "Failed to create user");

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            department: newUserDepartment || null,
            phone: newUserPhone || null
          })
          .eq("id", authData.user.id);

        if (profileError) throw profileError;

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: newUserRole
          });

        if (roleError) throw roleError;
      }

      toast.success(language === 'ar' ? "تم إنشاء المستخدم بنجاح" : "User created successfully");
      setIsAddDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || (language === 'ar' ? "فشل في إنشاء المستخدم" : "Failed to create user"));
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      if (USE_LOCAL_API || isLocalMode) {
        await api.updateUserRole(selectedUser.id, newUserRole);
      } else {
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("*")
          .eq("user_id", selectedUser.id)
          .maybeSingle();

        if (existingRole) {
          const { error } = await supabase
            .from("user_roles")
            .update({ role: newUserRole })
            .eq("user_id", selectedUser.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("user_roles")
            .insert({ user_id: selectedUser.id, role: newUserRole });
          if (error) throw error;
        }

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            department: newUserDepartment || null,
            phone: newUserPhone || null,
            is_active: selectedUser.is_active
          })
          .eq("id", selectedUser.id);

        if (profileError) throw profileError;
      }

      toast.success(language === 'ar' ? "تم تحديث المستخدم بنجاح" : "User updated successfully");
      setIsEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || (language === 'ar' ? "فشل في تحديث المستخدم" : "Failed to update user"));
    }
  };

  const handleToggleActive = async (user: UserWithRole) => {
    try {
      if (USE_LOCAL_API || isLocalMode) {
        await api.updateUserStatus(user.id, !user.is_active);
      } else {
        const { error } = await supabase
          .from("profiles")
          .update({ is_active: !user.is_active })
          .eq("id", user.id);

        if (error) throw error;
      }
      toast.success(user.is_active 
        ? (language === 'ar' ? "تم تعطيل المستخدم" : "User deactivated")
        : (language === 'ar' ? "تم تفعيل المستخدم" : "User activated")
      );
      fetchUsers();
    } catch (error: any) {
      toast.error(language === 'ar' ? "فشل في تحديث حالة المستخدم" : "Failed to update user status");
    }
  };

  const handleDeleteRole = async (userId: string) => {
    try {
      if (USE_LOCAL_API || isLocalMode) {
        await api.updateUserRole(userId, '');
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        if (error) throw error;
      }
      toast.success(language === 'ar' ? "تم إزالة الصلاحية" : "Role removed");
      fetchUsers();
    } catch (error: any) {
      toast.error(language === 'ar' ? "فشل في إزالة الصلاحية" : "Failed to remove role");
    }
  };

  const resetForm = () => {
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserName("");
    setNewUserRole("reception");
    setNewUserDepartment("");
    setNewUserPhone("");
    setSelectedUser(null);
  };

  const openEditDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setNewUserRole(user.role || "reception");
    setNewUserDepartment(user.department || "");
    setNewUserPhone(user.phone || "");
    setIsEditDialogOpen(true);
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    admins: users.filter(u => u.role === "admin").length
  };

  if (!hasRole("admin")) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="glass-card border-0 p-8 text-center">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            {language === 'ar' ? 'غير مصرح' : 'Unauthorized'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'ليس لديك صلاحية للوصول لهذه الصفحة' : 'You do not have permission to access this page'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.users.title}</h1>
          <p className="text-muted-foreground">{t.users.subtitle}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => resetForm()}>
              <Plus className="w-4 h-4" />
              {t.users.newUser}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{language === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User'}</DialogTitle>
              <DialogDescription>{language === 'ar' ? 'أدخل بيانات المستخدم الجديد' : 'Enter new user details'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الاسم الكامل' : 'Full Name'} *</Label>
                <Input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder={language === 'ar' ? "أحمد محمد" : "John Doe"} />
              </div>
              <div className="space-y-2">
                <Label>{t.common.email} *</Label>
                <Input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="email@hospital.com" />
              </div>
              <div className="space-y-2">
                <Label>{t.common.password} *</Label>
                <Input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>{t.users.role} *</Label>
                <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.users.department}</Label>
                <Input value={newUserDepartment} onChange={(e) => setNewUserDepartment(e.target.value)} placeholder={language === 'ar' ? "قسم الأشعة" : "Radiology"} />
              </div>
              <div className="space-y-2">
                <Label>{t.common.phone}</Label>
                <Input value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} placeholder="01xxxxxxxxx" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>{t.common.cancel}</Button>
              <Button onClick={handleAddUser}>{t.common.add}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 animate-slide-up">
        <Card className="glass-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <UserCheck className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.users.active}</p>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-destructive/10">
                <UserX className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.users.inactive}</p>
                <p className="text-2xl font-bold text-foreground">{stats.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-warning/10">
                <Shield className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المديرين' : 'Admins'}</p>
                <p className="text-2xl font-bold text-foreground">{stats.admins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="glass-card border-0">
        <CardContent className="py-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t.common.search + "..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-muted/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="glass-card border-0">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Activity className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">{language === 'ar' ? 'المستخدم' : 'User'}</TableHead>
                  <TableHead className="font-semibold">{t.users.role}</TableHead>
                  <TableHead className="font-semibold">{t.users.department}</TableHead>
                  <TableHead className="font-semibold">{t.common.status}</TableHead>
                  <TableHead className="font-semibold">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</TableHead>
                  <TableHead className="font-semibold w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const role = user.role ? roleConfig[user.role] : null;
                  
                  return (
                    <TableRow key={user.id} className="hover:bg-muted/30 transition-smooth">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{user.full_name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {role ? (
                          <Badge variant="outline" className={cn(role.color)}>
                            {role.label}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            {language === 'ar' ? 'بدون صلاحية' : 'No Role'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.department || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          user.is_active 
                            ? "bg-success/10 text-success border-success/30" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {user.is_active ? t.users.active : t.users.inactive}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(user)} className="gap-2">
                              <Edit className="w-4 h-4" />
                              {t.common.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedUser(user);
                                setIsChangePasswordDialogOpen(true);
                              }} 
                              className="gap-2"
                            >
                              <Lock className="w-4 h-4" />
                              {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedUser(user);
                                setIsPermissionsDialogOpen(true);
                              }} 
                              className="gap-2"
                            >
                              <Lock className="w-4 h-4" />
                              {language === 'ar' ? 'إدارة الصلاحيات' : 'Manage Permissions'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(user)} className="gap-2">
                              {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              {user.is_active 
                                ? (language === 'ar' ? 'تعطيل' : 'Deactivate')
                                : (language === 'ar' ? 'تفعيل' : 'Activate')
                              }
                            </DropdownMenuItem>
                            {user.role && (
                              <DropdownMenuItem onClick={() => handleDeleteRole(user.id)} className="gap-2 text-destructive">
                                <Trash2 className="w-4 h-4" />
                                {language === 'ar' ? 'إزالة الصلاحية' : 'Remove Role'}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تعديل المستخدم' : 'Edit User'}</DialogTitle>
            <DialogDescription>{selectedUser?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.users.role}</Label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.users.department}</Label>
              <Input value={newUserDepartment} onChange={(e) => setNewUserDepartment(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.common.phone}</Label>
              <Input value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleUpdateRole}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      {selectedUser && (
        <UserPermissionsDialog
          userId={selectedUser.id}
          userName={selectedUser.full_name}
          isOpen={isPermissionsDialogOpen}
          onOpenChange={setIsPermissionsDialogOpen}
          onSave={fetchUsers}
          language={language}
        />
      )}

      {/* Change Password Dialog */}
      {selectedUser && (
        <ChangePasswordDialog
          userId={selectedUser.id}
          userEmail={selectedUser.email}
          open={isChangePasswordDialogOpen}
          onOpenChange={setIsChangePasswordDialogOpen}
          onSuccess={fetchUsers}
        />
      )}
    </div>
  );
}
