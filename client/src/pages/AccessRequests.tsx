import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, X, Trash2, Mail, Phone, User, Calendar, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

type AccessRequest = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  telegram: string | null;
  status: "pending" | "approved" | "rejected";
  processedBy: number | null;
  adminComment: string | null;
  processedAt: Date | null;
  createdUserId: number | null;
  createdAt: Date;
};

export default function AccessRequests() {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | undefined>(undefined);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  
  // Approve form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin" | "manager" | "viewer">("user");
  const [approveComment, setApproveComment] = useState("");
  
  // Reject form state
  const [rejectComment, setRejectComment] = useState("");

  const requestsQuery = trpc.admin.getAccessRequests.useQuery({ status: statusFilter });
  const pendingCountQuery = trpc.admin.getPendingRequestsCount.useQuery();
  const approveMutation = trpc.admin.approveAccessRequest.useMutation();
  const rejectMutation = trpc.admin.rejectAccessRequest.useMutation();
  const deleteMutation = trpc.admin.deleteAccessRequest.useMutation();

  const handleOpenApprove = (request: AccessRequest) => {
    setSelectedRequest(request);
    // Generate username from name
    const nameSlug = request.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    setNewUsername(nameSlug);
    setNewPassword("");
    setNewRole("user");
    setApproveComment("");
    setApproveDialogOpen(true);
  };

  const handleOpenReject = (request: AccessRequest) => {
    setSelectedRequest(request);
    setRejectComment("");
    setRejectDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    if (!newUsername || newUsername.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      await approveMutation.mutateAsync({
        requestId: selectedRequest.id,
        username: newUsername,
        password: newPassword,
        role: newRole,
        comment: approveComment || undefined,
      });
      toast.success(t.accessRequest?.approved || "Request approved");
      setApproveDialogOpen(false);
      requestsQuery.refetch();
      pendingCountQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Error approving request");
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      await rejectMutation.mutateAsync({
        requestId: selectedRequest.id,
        comment: rejectComment || undefined,
      });
      toast.success(t.accessRequest?.rejected || "Request rejected");
      setRejectDialogOpen(false);
      requestsQuery.refetch();
      pendingCountQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Error rejecting request");
    }
  };

  const handleDelete = async (requestId: number) => {
    if (!confirm("Delete this request?")) return;
    
    try {
      await deleteMutation.mutateAsync({ requestId });
      toast.success("Request deleted");
      requestsQuery.refetch();
      pendingCountQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Error deleting request");
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">{t.accessRequest?.pending || "Pending"}</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">{t.accessRequest?.approved || "Approved"}</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">{t.accessRequest?.rejected || "Rejected"}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t.accessRequest?.requests || "Access Requests"}</h1>
            <p className="text-muted-foreground">
              {pendingCountQuery.data !== undefined && pendingCountQuery.data > 0 && (
                <span className="text-yellow-500 font-medium">{pendingCountQuery.data} {t.accessRequest?.pending || "pending"}</span>
              )}
            </p>
          </div>
        </div>

        <Tabs defaultValue="all" onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v as any)}>
          <TabsList>
            <TabsTrigger value="all">{t.all || "All"}</TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              {t.accessRequest?.pending || "Pending"}
              {pendingCountQuery.data !== undefined && pendingCountQuery.data > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-500 text-white rounded-full">
                  {pendingCountQuery.data}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">{t.accessRequest?.approved || "Approved"}</TabsTrigger>
            <TabsTrigger value="rejected">{t.accessRequest?.rejected || "Rejected"}</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <RequestsList />
          </TabsContent>
          <TabsContent value="pending" className="mt-4">
            <RequestsList />
          </TabsContent>
          <TabsContent value="approved" className="mt-4">
            <RequestsList />
          </TabsContent>
          <TabsContent value="rejected" className="mt-4">
            <RequestsList />
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.accessRequest?.approve || "Approve Request"}</DialogTitle>
            <DialogDescription>
              {selectedRequest?.name} ({selectedRequest?.email})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.accessRequest?.createUsername || "Username"}</Label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="username"
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t.accessRequest?.createPassword || "Password"}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t.accessRequest?.selectRole || "Role"}</Label>
              <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>{t.accessRequest?.comment || "Comment"}</Label>
              <Textarea
                value={approveComment}
                onChange={(e) => setApproveComment(e.target.value)}
                placeholder="Optional comment..."
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              {t.cancel || "Cancel"}
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Check className="h-4 w-4 mr-2" />
              {t.accessRequest?.approve || "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.accessRequest?.reject || "Reject Request"}</DialogTitle>
            <DialogDescription>
              {selectedRequest?.name} ({selectedRequest?.email})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.accessRequest?.comment || "Comment"}</Label>
              <Textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t.cancel || "Cancel"}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <X className="h-4 w-4 mr-2" />
              {t.accessRequest?.reject || "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );

  function RequestsList() {
    if (requestsQuery.isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!requestsQuery.data || requestsQuery.data.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t.accessRequest?.noRequests || "No requests"}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4">
        {requestsQuery.data.map((request) => (
          <Card key={request.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {request.name}
                    {getStatusBadge(request.status)}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {request.email}
                    </span>
                    {request.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {request.phone}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {request.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => handleOpenApprove(request)}>
                        <Check className="h-4 w-4 mr-1" />
                        {t.accessRequest?.approve || "Approve"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleOpenReject(request)}>
                        <X className="h-4 w-4 mr-1" />
                        {t.accessRequest?.reject || "Reject"}
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(request.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {request.telegram && (
                <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <p className="text-sm">Telegram: {request.telegram}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(request.createdAt)}
                </span>
                {request.processedAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Processed: {formatDate(request.processedAt)}
                  </span>
                )}
                {request.adminComment && (
                  <span className="italic">"{request.adminComment}"</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
}
