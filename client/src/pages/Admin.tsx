import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Shield,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  UserX,
  UserCheck,
  KeyRound,
  Settings2
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

type User = {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  role: "user" | "admin" | "manager" | "viewer";
  isActive: "yes" | "no";
  dailyLimit: number | null;
  weeklyLimit?: number | null;
  monthlyLimit: number | null;
  batchLimit?: number | null;
  customPermissions?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

export default function Admin() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // New user form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin" | "manager" | "viewer">("user");
  
  // Limits dialog state
  const [isLimitsDialogOpen, setIsLimitsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dailyLimit, setDailyLimit] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(0);

  const usersQuery = trpc.admin.listUsers.useQuery();
  const createUserMutation = trpc.admin.createUser.useMutation();
  const deleteUserMutation = trpc.admin.deleteUser.useMutation();
  const updateRoleMutation = trpc.admin.updateUserRole.useMutation();
  const toggleActiveMutation = trpc.admin.toggleUserActive.useMutation();
  const resetPasswordMutation = trpc.admin.resetUserPassword.useMutation();
  const updateLimitsMutation = trpc.admin.updateUserLimits.useMutation();

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Shield className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t.admin.accessDenied}</h1>
          <p className="text-muted-foreground mb-4">
            {t.admin.accessDeniedDesc}
          </p>
          <Button onClick={() => setLocation("/")}>
            {t.admin.goToDashboard}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleCreateUser = async () => {
    if (!newUsername || !newPassword) {
      toast.error(t.admin.usernameRequired);
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t.admin.minChars);
      return;
    }

    try {
      await createUserMutation.mutateAsync({
        username: newUsername,
        password: newPassword,
        name: newName || undefined,
        email: newEmail || undefined,
        role: newRole,
      });
      usersQuery.refetch();
      setIsCreateDialogOpen(false);
      setNewUsername("");
      setNewPassword("");
      setNewName("");
      setNewEmail("");
      setNewRole("user");
      toast.success(t.admin.userCreated);
    } catch (error: any) {
      toast.error(error.message || t.admin.usernameExists);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (userId === user?.id) {
      toast.error(t.admin.cannotDeleteSelf);
      return;
    }
    try {
      await deleteUserMutation.mutateAsync({ userId });
      usersQuery.refetch();
      toast.success(t.admin.userDeleted);
    } catch (error) {
      toast.error(t.admin.userDeleted);
    }
  };

  const handleUpdateRole = async (userId: number, role: "user" | "admin" | "manager" | "viewer") => {
    if (userId === user?.id && role !== "admin") {
      toast.error(t.admin.cannotDemoteSelf);
      return;
    }
    try {
      await updateRoleMutation.mutateAsync({ userId, role });
      usersQuery.refetch();
      toast.success(t.admin.roleUpdated);
    } catch (error) {
      toast.error(t.admin.roleUpdated);
    }
  };

  const handleToggleActive = async (userId: number, isActive: "yes" | "no") => {
    try {
      await toggleActiveMutation.mutateAsync({ userId, isActive });
      usersQuery.refetch();
      toast.success(isActive === "yes" ? t.admin.userActivated : t.admin.userDeactivated);
    } catch (error) {
      toast.error(t.admin.userDeactivated);
    }
  };

  const handleResetPassword = async (userId: number, username: string) => {
    const newPassword = prompt(`${t.admin.enterNewPassword} ${username} (${t.admin.minChars}):`);
    if (!newPassword) return;
    if (newPassword.length < 6) {
      toast.error(t.admin.minChars);
      return;
    }
    try {
      await resetPasswordMutation.mutateAsync({ userId, newPassword });
      toast.success(t.admin.passwordReset);
    } catch (error) {
      toast.error(t.admin.passwordReset);
    }
  };

  const openLimitsDialog = (u: User) => {
    setSelectedUser(u);
    setDailyLimit(u.dailyLimit || 0);
    setMonthlyLimit(u.monthlyLimit || 0);
    setIsLimitsDialogOpen(true);
  };

  const handleUpdateLimits = async () => {
    if (!selectedUser) return;
    try {
      await updateLimitsMutation.mutateAsync({
        userId: selectedUser.id,
        dailyLimit,
        monthlyLimit,
      });
      usersQuery.refetch();
      setIsLimitsDialogOpen(false);
      toast.success(t.admin.limitsUpdated);
    } catch (error) {
      toast.error(t.admin.limitsUpdated);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            {t.admin.title}
          </h1>
          <p className="text-muted-foreground">
            {t.admin.subtitle}
          </p>
        </div>

        {/* Users Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t.admin.allUsers}
              </CardTitle>
              <CardDescription>
                {usersQuery.data?.length || 0} {t.admin.registeredUsers}
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t.admin.createUser}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.admin.createNewUser}</DialogTitle>
                  <DialogDescription>
                    {t.admin.createNewUserDesc}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">{t.admin.usernameRequired}</Label>
                    <Input
                      id="username"
                      placeholder={t.auth.enterUsername}
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">{t.admin.passwordRequired}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={`${t.auth.enterPassword} (${t.admin.minChars})`}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">{t.admin.displayName} ({t.admin.optional})</Label>
                    <Input
                      id="name"
                      placeholder={t.admin.displayName}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t.admin.email} ({t.admin.optional})</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">{t.admin.role}</Label>
                    <Select value={newRole} onValueChange={(v: "user" | "admin") => setNewRole(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">{t.admin.user}</SelectItem>
                        <SelectItem value="admin">{t.nav.admin}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    {t.cancel}
                  </Button>
                  <Button 
                    onClick={handleCreateUser}
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    {t.admin.createUser}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {usersQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.admin.user}</TableHead>
                      <TableHead>{t.auth.username}</TableHead>
                      <TableHead>{t.admin.email}</TableHead>
                      <TableHead>{t.admin.role}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead>{t.admin.lastSignIn}</TableHead>
                      <TableHead className="text-right">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersQuery.data?.map((u: User) => (
                      <TableRow key={u.id} className={u.isActive === "no" ? "opacity-50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {(u.name || u.username).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{u.name || u.username}</span>
                            {u.id === user?.id && (
                              <Badge variant="outline" className="text-xs">{t.admin.you}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {u.username}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.email || "-"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            onValueChange={(value: "user" | "admin") => handleUpdateRole(u.id, value)}
                            disabled={u.id === user?.id}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">{t.admin.user}</SelectItem>
                              <SelectItem value="admin">{t.nav.admin}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.isActive === "yes" ? "default" : "secondary"}>
                            {u.isActive === "yes" ? t.admin.active : t.admin.inactive}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(u.lastSignedIn).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {u.id !== user?.id && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResetPassword(u.id, u.username)}
                                  title={t.admin.resetPassword}
                                >
                                  <KeyRound className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openLimitsDialog(u)}
                                  title={t.admin.setLimits}
                                >
                                  <Settings2 className="h-4 w-4 text-purple-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleActive(u.id, u.isActive === "yes" ? "no" : "yes")}
                                  title={u.isActive === "yes" ? t.admin.deactivateUser : t.admin.activateUser}
                                >
                                  {u.isActive === "yes" ? (
                                    <UserX className="h-4 w-4 text-orange-500" />
                                  ) : (
                                    <UserCheck className="h-4 w-4 text-green-500" />
                                  )}
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t.admin.deleteUser}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t.admin.deleteUserConfirm} {u.name || u.username}? 
                                        {t.admin.deleteUserDesc}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteUser(u.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        {t.delete}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!usersQuery.data || usersQuery.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t.admin.allUsers}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Limits Dialog */}
        <Dialog open={isLimitsDialogOpen} onOpenChange={setIsLimitsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.admin.setUserLimits}</DialogTitle>
              <DialogDescription>
                {t.admin.setUserLimitsDesc} {selectedUser?.name || selectedUser?.username}.
                {t.admin.zeroUnlimited}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dailyLimit">{t.admin.dailyLimit}</Label>
                <Input
                  id="dailyLimit"
                  type="number"
                  min="0"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(parseInt(e.target.value) || 0)}
                  placeholder={t.admin.zeroUnlimited}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyLimit">{t.admin.monthlyLimit}</Label>
                <Input
                  id="monthlyLimit"
                  type="number"
                  min="0"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(parseInt(e.target.value) || 0)}
                  placeholder={t.admin.zeroUnlimited}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLimitsDialogOpen(false)}>
                {t.cancel}
              </Button>
              <Button onClick={handleUpdateLimits} disabled={updateLimitsMutation.isPending}>
                {updateLimitsMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.loading}</>
                ) : (
                  t.save
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
