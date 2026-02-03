import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { 
  Shield,
  ShieldPlus,
  Loader2,
  Pencil,
  Trash2,
  Plus,
  Users,
  Settings,
  FileText,
  Mail,
  Lock,
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

// Predefined colors for roles
const roleColors = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#94a3b8", // slate
];

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

// Translations
const translations = {
  en: {
    title: "Roles Management",
    description: "Create and manage custom roles with specific permissions",
    createRole: "Create Role",
    editRole: "Edit Role",
    deleteRole: "Delete Role",
    roleName: "Role Name",
    roleDescription: "Description",
    roleColor: "Color",
    permissions: "Permissions",
    systemRole: "System Role",
    customRole: "Custom Role",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this role?",
    confirmDeleteDesc: "This action cannot be undone. Users with this role will need to be reassigned.",
    noRoles: "No custom roles yet",
    createFirst: "Create your first custom role",
    roleCreated: "Role created successfully",
    roleUpdated: "Role updated successfully",
    roleDeleted: "Role deleted successfully",
    cannotEditSystem: "System roles cannot be edited",
    cannotDeleteSystem: "System roles cannot be deleted",
    accessDenied: "Access Denied",
    accessDeniedDesc: "Only administrators can manage roles",
    goToDashboard: "Go to Dashboard",
    loading: "Loading...",
    usersCount: "users",
  },
  ru: {
    title: "Управление ролями",
    description: "Создание и управление кастомными ролями с определенными правами",
    createRole: "Создать роль",
    editRole: "Редактировать роль",
    deleteRole: "Удалить роль",
    roleName: "Название роли",
    roleDescription: "Описание",
    roleColor: "Цвет",
    permissions: "Права доступа",
    systemRole: "Системная роль",
    customRole: "Кастомная роль",
    save: "Сохранить",
    cancel: "Отмена",
    delete: "Удалить",
    confirmDelete: "Вы уверены, что хотите удалить эту роль?",
    confirmDeleteDesc: "Это действие нельзя отменить. Пользователям с этой ролью нужно будет назначить другую роль.",
    noRoles: "Пока нет кастомных ролей",
    createFirst: "Создайте свою первую кастомную роль",
    roleCreated: "Роль успешно создана",
    roleUpdated: "Роль успешно обновлена",
    roleDeleted: "Роль успешно удалена",
    cannotEditSystem: "Системные роли нельзя редактировать",
    cannotDeleteSystem: "Системные роли нельзя удалить",
    accessDenied: "Доступ запрещен",
    accessDeniedDesc: "Только администраторы могут управлять ролями",
    goToDashboard: "На главную",
    loading: "Загрузка...",
    usersCount: "пользователей",
  },
  uk: {
    title: "Управління ролями",
    description: "Створення та управління кастомними ролями з певними правами",
    createRole: "Створити роль",
    editRole: "Редагувати роль",
    deleteRole: "Видалити роль",
    roleName: "Назва ролі",
    roleDescription: "Опис",
    roleColor: "Колір",
    permissions: "Права доступу",
    systemRole: "Системна роль",
    customRole: "Кастомна роль",
    save: "Зберегти",
    cancel: "Скасувати",
    delete: "Видалити",
    confirmDelete: "Ви впевнені, що хочете видалити цю роль?",
    confirmDeleteDesc: "Цю дію не можна скасувати. Користувачам з цією роллю потрібно буде призначити іншу роль.",
    noRoles: "Поки немає кастомних ролей",
    createFirst: "Створіть свою першу кастомну роль",
    roleCreated: "Роль успішно створена",
    roleUpdated: "Роль успішно оновлена",
    roleDeleted: "Роль успішно видалена",
    cannotEditSystem: "Системні ролі не можна редагувати",
    cannotDeleteSystem: "Системні ролі не можна видалити",
    accessDenied: "Доступ заборонено",
    accessDeniedDesc: "Тільки адміністратори можуть керувати ролями",
    goToDashboard: "На головну",
    loading: "Завантаження...",
    usersCount: "користувачів",
  },
};

interface CustomRole {
  id: number;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function RolesManagement() {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.ru;
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("#6366f1");
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  
  // Queries
  const rolesQuery = trpc.admin.listRoles.useQuery();
  const permissionsQuery = trpc.admin.getAvailablePermissions.useQuery();
  
  // Mutations
  const createRoleMutation = trpc.admin.createRole.useMutation({
    onSuccess: () => {
      toast.success(t.roleCreated);
      setIsCreateDialogOpen(false);
      resetForm();
      rolesQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateRoleMutation = trpc.admin.updateRole.useMutation({
    onSuccess: () => {
      toast.success(t.roleUpdated);
      setIsEditDialogOpen(false);
      resetForm();
      rolesQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteRoleMutation = trpc.admin.deleteRole.useMutation({
    onSuccess: () => {
      toast.success(t.roleDeleted);
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
      rolesQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormColor("#6366f1");
    setFormPermissions([]);
    setSelectedRole(null);
  };
  
  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };
  
  const openEditDialog = (role: CustomRole) => {
    if (role.isSystem) {
      toast.error(t.cannotEditSystem);
      return;
    }
    setSelectedRole(role);
    setFormName(role.name);
    setFormDescription(role.description || "");
    setFormColor(role.color || "#6366f1");
    setFormPermissions([...role.permissions]);
    setIsEditDialogOpen(true);
  };
  
  const openDeleteDialog = (role: CustomRole) => {
    if (role.isSystem) {
      toast.error(t.cannotDeleteSystem);
      return;
    }
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };
  
  const togglePermission = (permission: string) => {
    setFormPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };
  
  const handleCreate = () => {
    createRoleMutation.mutate({
      name: formName,
      description: formDescription || undefined,
      permissions: formPermissions,
      color: formColor,
    });
  };
  
  const handleUpdate = () => {
    if (!selectedRole) return;
    updateRoleMutation.mutate({
      id: selectedRole.id,
      name: formName,
      description: formDescription || undefined,
      permissions: formPermissions,
      color: formColor,
    });
  };
  
  const handleDelete = () => {
    if (!selectedRole) return;
    deleteRoleMutation.mutate({ id: selectedRole.id });
  };
  
  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Shield className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t.accessDenied}</h1>
          <p className="text-muted-foreground mb-4">{t.accessDeniedDesc}</p>
          <Button onClick={() => setLocation("/")}>
            {t.goToDashboard}
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  
  if (rolesQuery.isLoading || permissionsQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }
  
  const roles = rolesQuery.data || [];
  const permissions = permissionsQuery.data?.permissions || [];
  const descriptions = permissionsQuery.data?.descriptions || {};
  const groupedPermissions = groupPermissions(permissions);
  
  const systemRoles = roles.filter(r => r.isSystem);
  const customRoles = roles.filter(r => !r.isSystem);
  
  const PermissionsSelector = () => (
    <Accordion type="multiple" className="w-full">
      {Object.entries(groupedPermissions).map(([category, perms]) => (
        <AccordionItem key={category} value={category}>
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2">
              {categoryIcons[category] || <Settings className="h-4 w-4" />}
              <span className="capitalize">{category}</span>
              <Badge variant="secondary" className="ml-2">
                {formPermissions.filter(p => p.startsWith(category + '.')).length}/{perms.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pl-6">
              {perms.map(permission => {
                const desc = descriptions[permission as keyof typeof descriptions] as { en: string; ru: string; uk: string } | undefined;
                const label = desc ? (desc[language as keyof typeof desc] || desc.en) : permission;
                return (
                  <div key={permission} className="flex items-center space-x-2">
                    <Checkbox
                      id={permission}
                      checked={formPermissions.includes(permission)}
                      onCheckedChange={() => togglePermission(permission)}
                    />
                    <Label htmlFor={permission} className="text-sm cursor-pointer">
                      {label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldPlus className="h-6 w-6" />
              {t.title}
            </h1>
            <p className="text-muted-foreground">{t.description}</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t.createRole}
          </Button>
        </div>
        
        {/* System Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {t.systemRole}
            </CardTitle>
            <CardDescription>
              {language === "ru" ? "Встроенные роли системы (нельзя изменить)" : 
               language === "uk" ? "Вбудовані ролі системи (не можна змінити)" :
               "Built-in system roles (cannot be modified)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.roleName}</TableHead>
                  <TableHead>{t.roleDescription}</TableHead>
                  <TableHead>{t.permissions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systemRoles.map(role => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: role.color || "#6366f1" }}
                        />
                        <span className="font-medium">{role.name}</span>
                        <Badge variant="outline" className="text-xs">
                          <Lock className="h-3 w-3 mr-1" />
                          {t.systemRole}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {role.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {role.permissions.length} {t.permissions.toLowerCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Custom Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t.customRole}
            </CardTitle>
            <CardDescription>
              {language === "ru" ? "Пользовательские роли с настраиваемыми правами" : 
               language === "uk" ? "Користувацькі ролі з налаштовуваними правами" :
               "User-defined roles with customizable permissions"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customRoles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShieldPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t.noRoles}</p>
                <p className="text-sm">{t.createFirst}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.roleName}</TableHead>
                    <TableHead>{t.roleDescription}</TableHead>
                    <TableHead>{t.permissions}</TableHead>
                    <TableHead className="text-right">
                      {language === "ru" ? "Действия" : language === "uk" ? "Дії" : "Actions"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customRoles.map(role => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: role.color || "#6366f1" }}
                          />
                          <span className="font-medium">{role.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {role.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {role.permissions.length} {t.permissions.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(role)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(role)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.createRole}</DialogTitle>
              <DialogDescription>
                {language === "ru" ? "Создайте новую роль с определенными правами доступа" :
                 language === "uk" ? "Створіть нову роль з певними правами доступу" :
                 "Create a new role with specific permissions"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t.roleName}</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={language === "ru" ? "Например: Оператор" : 
                               language === "uk" ? "Наприклад: Оператор" : 
                               "e.g., Operator"}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">{t.roleDescription}</Label>
                <Textarea
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={language === "ru" ? "Описание роли..." : 
                               language === "uk" ? "Опис ролі..." : 
                               "Role description..."}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t.roleColor}</Label>
                <div className="flex flex-wrap gap-2">
                  {roleColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formColor === color ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormColor(color)}
                    />
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>{t.permissions}</Label>
                <PermissionsSelector />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                {t.cancel}
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={!formName || createRoleMutation.isPending}
              >
                {createRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.editRole}</DialogTitle>
              <DialogDescription>
                {language === "ru" ? "Измените настройки роли" :
                 language === "uk" ? "Змініть налаштування ролі" :
                 "Modify role settings"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t.roleName}</Label>
                <Input
                  id="edit-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">{t.roleDescription}</Label>
                <Textarea
                  id="edit-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t.roleColor}</Label>
                <div className="flex flex-wrap gap-2">
                  {roleColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formColor === color ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormColor(color)}
                    />
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>{t.permissions}</Label>
                <PermissionsSelector />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {t.cancel}
              </Button>
              <Button 
                onClick={handleUpdate}
                disabled={!formName || updateRoleMutation.isPending}
              >
                {updateRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.confirmDeleteDesc}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
