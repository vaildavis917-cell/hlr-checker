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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

type InviteCode = {
  id: number;
  code: string;
  email: string | null;
  createdBy: number;
  usedBy: number | null;
  usedAt: Date | null;
  expiresAt: Date | null;
  isActive: "yes" | "no";
  createdAt: Date;
};
import { useState } from "react";
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Shield,
  ShieldCheck,
  Copy,
  Check,
  Loader2,
  Mail,
  Key,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [inviteEmail, setInviteEmail] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Check if user is admin
  if (user && user.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="h-6 w-6" />
                Access Denied
              </CardTitle>
              <CardDescription>
                You don't have permission to access the admin panel.
                Only administrators can manage users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation("/")} className="w-full">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // API queries
  const usersQuery = trpc.admin.listUsers.useQuery();
  const invitesQuery = trpc.admin.listInvites.useQuery();
  const createInviteMutation = trpc.admin.createInvite.useMutation();
  const deleteUserMutation = trpc.admin.deleteUser.useMutation();
  const updateRoleMutation = trpc.admin.updateUserRole.useMutation();
  const deleteInviteMutation = trpc.admin.deleteInvite.useMutation();

  const handleCreateInvite = async () => {
    try {
      const result = await createInviteMutation.mutateAsync({
        email: inviteEmail || undefined,
      });
      invitesQuery.refetch();
      setInviteEmail("");
      setIsCreateDialogOpen(false);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(result.code);
      toast.success("Invite code created and copied to clipboard!");
    } catch (error) {
      toast.error("Failed to create invite code");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await deleteUserMutation.mutateAsync({ userId });
      usersQuery.refetch();
      toast.success("User deleted successfully");
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const handleUpdateRole = async (userId: number, role: "user" | "admin") => {
    try {
      await updateRoleMutation.mutateAsync({ userId, role });
      usersQuery.refetch();
      toast.success(`User role updated to ${role}`);
    } catch (error) {
      toast.error("Failed to update user role");
    }
  };

  const handleDeleteInvite = async (inviteId: number) => {
    try {
      await deleteInviteMutation.mutateAsync({ inviteId });
      invitesQuery.refetch();
      toast.success("Invite code deleted");
    } catch (error) {
      toast.error("Failed to delete invite code");
    }
  };

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">
            Manage users and invite codes for the HLR Checker
          </p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="invites" className="gap-2">
              <Key className="h-4 w-4" />
              Invite Codes
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  {usersQuery.data?.length || 0} registered users
                </CardDescription>
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
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Last Sign In</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersQuery.data?.map((u: User) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">
                                    {u.name?.charAt(0).toUpperCase() || "?"}
                                  </span>
                                </div>
                                <span className="font-medium">{u.name || "Unknown"}</span>
                                {u.id === user?.id && (
                                  <Badge variant="outline" className="text-xs">You</Badge>
                                )}
                              </div>
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
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(u.lastSignedIn).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {u.id !== user?.id && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete {u.name || "this user"}? 
                                        This will also delete all their HLR check history.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteUser(u.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invites Tab */}
          <TabsContent value="invites">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Invite Codes</CardTitle>
                  <CardDescription>
                    Create invite codes to allow new users to register
                  </CardDescription>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Invite
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Invite Code</DialogTitle>
                      <DialogDescription>
                        Generate a new invite code. Optionally specify an email to restrict who can use it.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email (optional)</Label>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="user@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Leave empty to create a code usable by anyone
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateInvite} disabled={createInviteMutation.isPending}>
                        {createInviteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Key className="h-4 w-4 mr-2" />
                        )}
                        Generate Code
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {invitesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : invitesQuery.data?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Key className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No invite codes yet</p>
                    <p className="text-sm mt-1">Create an invite code to allow new users to register</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Used</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitesQuery.data?.map((invite: InviteCode) => (
                          <TableRow key={invite.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                  {invite.code}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(invite.code)}
                                  disabled={invite.isActive === "no"}
                                >
                                  {copiedCode === invite.code ? (
                                    <Check className="h-4 w-4 text-success" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {invite.email || "Any"}
                            </TableCell>
                            <TableCell>
                              {invite.isActive === "yes" ? (
                                <Badge className="bg-success text-success-foreground">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Used</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(invite.createdAt).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {invite.usedAt ? new Date(invite.usedAt).toLocaleDateString() : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Invite Code</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this invite code?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteInvite(invite.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
