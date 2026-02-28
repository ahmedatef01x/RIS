import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users, Search, Plus, Shield, Edit, Trash2, MoreHorizontal,
  UserCheck, UserX
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const users = [
  { id: 1, name: "Dr. Ahmed Hassan", email: "ahmed.hassan@hospital.com", role: "radiologist", department: "Radiology", status: "active", lastActive: "2 min ago" },
  { id: 2, name: "Sara Mohammed", email: "sara.m@hospital.com", role: "technician", department: "CT", status: "active", lastActive: "5 min ago" },
  { id: 3, name: "Fatima Ali", email: "fatima.ali@hospital.com", role: "reception", department: "Front Desk", status: "active", lastActive: "1 hour ago" },
  { id: 4, name: "Omar Khaled", email: "omar.k@hospital.com", role: "admin", department: "IT", status: "active", lastActive: "Online" },
  { id: 5, name: "Layla Youssef", email: "layla.y@hospital.com", role: "billing", department: "Finance", status: "inactive", lastActive: "2 days ago" },
  { id: 6, name: "Karim Saeed", email: "karim.s@hospital.com", role: "technician", department: "MRI", status: "active", lastActive: "30 min ago" },
];

const roleConfig = {
  admin: { label: "Admin", color: "bg-destructive/10 text-destructive border-destructive/30" },
  radiologist: { label: "Radiologist", color: "bg-primary/10 text-primary border-primary/30" },
  technician: { label: "Technician", color: "bg-info/10 text-info border-info/30" },
  reception: { label: "Reception", color: "bg-warning/10 text-warning border-warning/30" },
  billing: { label: "Billing", color: "bg-success/10 text-success border-success/30" },
};

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage users and access permissions</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 animate-slide-up opacity-0 stagger-1" style={{ animationFillMode: "forwards" }}>
        <Card className="glass-card border-0">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{users.length}</p>
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
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-foreground">{users.filter(u => u.status === "active").length}</p>
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
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-foreground">{users.filter(u => u.status === "inactive").length}</p>
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
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold text-foreground">{users.filter(u => u.role === "admin").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="glass-card border-0 animate-slide-up opacity-0 stagger-2" style={{ animationFillMode: "forwards" }}>
        <CardContent className="py-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-muted/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="glass-card border-0 animate-slide-up opacity-0 stagger-3" style={{ animationFillMode: "forwards" }}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">User</TableHead>
                <TableHead className="font-semibold">Role</TableHead>
                <TableHead className="font-semibold">Department</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Last Active</TableHead>
                <TableHead className="font-semibold w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const role = roleConfig[user.role as keyof typeof roleConfig];
                
                return (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-smooth">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(role.color)}>
                        {role.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.department}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        user.status === "active" 
                          ? "bg-success/10 text-success border-success/30" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.lastActive}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2">
                            <Edit className="w-4 h-4" /> Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Shield className="w-4 h-4" /> Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive">
                            <Trash2 className="w-4 h-4" /> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
