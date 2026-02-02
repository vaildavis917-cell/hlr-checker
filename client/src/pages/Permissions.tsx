import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";
import { 
  Shield,
  ShieldCheck,
  Loader2,
  RotateCcw,
  Save,
  Users,
  Settings,
  FileText,
  Key,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

// Permission category icons
const categoryIcons: Record<string, React.ReactNode> = {
  hlr: <FileText className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  tools: <Settings className="h-4 w-4" />,
  admin: <Shield className="h-4 w-4" />,
};

// Group permissions by category
function groupPermissions(permissions: readonly string[]) {
  const groups: Record<string, string[]> = {};
  permissions.forEach(p => {
    const category = p.split('.')[0];
    if (!groups[category]) groups[category] = [];
    groups[category].push(p);
  });
  return groups;
}

export default function Permissions() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // State for editing role permissions
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Queries
  const availablePermissionsQuery = trpc.admin.getAvailablePermissions.useQuery();
  const rolePermissionsQuery = trpc.admin.getAllRolePermissions.useQuery();
  
  // Mutations
  const setRolePermissionsMutation = trpc.admin.setRolePermissions.useMutation();
  const resetRolePermissionsMutation = trpc.admin.resetRolePermissions.useMutation();
  
  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Shield className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t.admin?.accessDenied || "Доступ запрещен"}</h1>
          <p className="text-muted-foreground mb-4">
            {t.admin?.accessDeniedDesc || "Только администраторы могут управлять правами"}
          </p>
          <Button onClick={() => setLocation("/")}>
            {t.admin?.goToDashboard || "На главную"}
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  
  const permissions = availablePermissionsQuery.data?.permissions || [];
  const descriptions = availablePermissionsQuery.data?.descriptions || {};
  const defaults = availablePermissionsQuery.data?.defaults || {};
  const roleData = rolePermissionsQuery.data || [];
  
  const groupedPermissions = groupPermissions(permissions);
  
  const openEditDialog = (role: string, currentPermissions: string[]) => {
    setEditingRole(role);
    setEditingPermissions([...currentPermissions]);
    setIsDialogOpen(true);
  };
  
  const togglePermission = (permission: string) => {
    setEditingPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };
  
  const handleSavePermissions = async () => {
    if (!editingRole) return;
    
    try {
      await setRolePermissionsMutation.mutateAsync({
        role: editingRole,
        permissions: editingPermissions,
      });
      rolePermissionsQuery.refetch();
      setIsDialogOpen(false);
      toast.success(t.permissions?.saved || "Права сохранены");
    } catch (error: any) {
      toast.error(error.message || t.permissions?.saveError || "Ошибка сохранения");
    }
  };
  
  const handleResetPermissions = async (role: string) => {
    try {
      const result = await resetRolePermissionsMutation.mutateAsync({ role });
      rolePermissionsQuery.refetch();
      toast.success(t.permissions?.reset || "Права сброшены к значениям по умолчанию");
    } catch (error: any) {
      toast.error(error.message || t.permissions?.resetError || "Ошибка сброса");
    }
  };
  
  const getRoleName = (role: string) => {
    const names: Record<string, string> = {
      viewer: t.admin?.viewer || "Наблюдатель",
      user: t.admin?.user || "Пользователь",
      manager: t.admin?.manager || "Менеджер",
      admin: t.nav?.admin || "Администратор",
    };
    return names[role] || role;
  };
  
  const getPermissionName = (permission: string) => {
    const desc = descriptions[permission as keyof typeof descriptions] as Record<string, string> | undefined;
    if (desc) {
      return desc[language] || desc['en'] || permission;
    }
    return permission;
  };
  
  const getCategoryName = (category: string) => {
    const names: Record<string, Record<string, string>> = {
      hlr: { ru: "HLR проверки", uk: "HLR перевірки", en: "HLR Checks" },
      email: { ru: "Email проверки", uk: "Email перевірки", en: "Email Checks" },
      tools: { ru: "Инструменты", uk: "Інструменти", en: "Tools" },
      admin: { ru: "Администрирование", uk: "Адміністрування", en: "Administration" },
    };
    return names[category]?.[language] || names[category]?.en || category;
  };
  
  const isLoading = availablePermissionsQuery.isLoading || rolePermissionsQuery.isLoading;
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6" />
            {t.permissions?.title || "Управление правами"}
          </h1>
          <p className="text-muted-foreground">
            {t.permissions?.description || "Настройка прав доступа для каждой роли"}
          </p>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4">
            {roleData.map((role) => (
              <Card key={role.role}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        role.role === 'admin' ? 'bg-red-500/10 text-red-500' :
                        role.role === 'manager' ? 'bg-blue-500/10 text-blue-500' :
                        role.role === 'user' ? 'bg-green-500/10 text-green-500' :
                        'bg-gray-500/10 text-gray-500'
                      }`}>
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{getRoleName(role.role)}</CardTitle>
                        <CardDescription>
                          {role.permissions.length} {t.permissions?.permissionsCount || "разрешений"}
                          {role.isCustom && (
                            <Badge variant="outline" className="ml-2">
                              {t.permissions?.custom || "Изменено"}
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {role.isCustom && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetPermissions(role.role)}
                          disabled={resetRolePermissionsMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          {t.permissions?.resetToDefault || "Сбросить"}
                        </Button>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openEditDialog(role.role, role.permissions)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        {t.edit || "Изменить"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs">
                        {getPermissionName(p)}
                      </Badge>
                    ))}
                    {role.permissions.length === 0 && (
                      <span className="text-sm text-muted-foreground">
                        {t.permissions?.noPermissions || "Нет разрешений"}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Edit Permissions Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t.permissions?.editRole || "Редактирование прав"}: {editingRole && getRoleName(editingRole)}
              </DialogTitle>
              <DialogDescription>
                {t.permissions?.editRoleDesc || "Выберите разрешения для этой роли"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <Accordion type="multiple" defaultValue={Object.keys(groupedPermissions)} className="w-full">
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <AccordionItem key={category} value={category}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        {categoryIcons[category] || <Settings className="h-4 w-4" />}
                        <span>{getCategoryName(category)}</span>
                        <Badge variant="outline" className="ml-2">
                          {perms.filter(p => editingPermissions.includes(p)).length}/{perms.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pl-6">
                        {perms.map((permission) => (
                          <div key={permission} className="flex items-center space-x-3">
                            <Checkbox
                              id={permission}
                              checked={editingPermissions.includes(permission)}
                              onCheckedChange={() => togglePermission(permission)}
                            />
                            <label
                              htmlFor={permission}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {getPermissionName(permission)}
                            </label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t.cancel || "Отмена"}
              </Button>
              <Button 
                onClick={handleSavePermissions} 
                disabled={setRolePermissionsMutation.isPending}
              >
                {setRolePermissionsMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.loading || "Загрузка..."}</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />{t.save || "Сохранить"}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
