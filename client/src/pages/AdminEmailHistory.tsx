import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useMemo } from "react";
import { 
  Mail, 
  Search, 
  Loader2,
  Shield,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ArrowUpDown,
  User as UserIcon,
  Trash2,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import StickyScrollbar from "@/components/StickyScrollbar";

type SortField = "createdAt" | "userName" | "totalEmails" | "validEmails";
type SortDirection = "asc" | "desc";

export default function AdminEmailHistory() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Check if user is admin
  if (user && user.role !== "admin" && user.role !== "manager") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="h-6 w-6" />
                {t.admin?.accessDenied || "Access Denied"}
              </CardTitle>
              <CardDescription>
                {t.admin?.accessDeniedDesc || "You don't have permission to view this page."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation("/")} className="w-full">
                {t.admin?.goToDashboard || "Go to Dashboard"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // API queries
  const allBatchesQuery = trpc.email.listAllBatches.useQuery();
  const batchResultsQuery = trpc.email.getBatch.useQuery(
    { batchId: selectedBatchId! },
    { enabled: selectedBatchId !== null && isResultsDialogOpen }
  );

  // Delete mutation
  const deleteMutation = trpc.email.adminDeleteBatch.useMutation({
    onSuccess: () => {
      toast.success(t.delete || "Deleted successfully");
      utils.email.listAllBatches.invalidate();
      setDeleteConfirmId(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Export mutation
  const exportMutation = trpc.email.exportXlsx.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t.home?.exportCSV || "Exported successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    if (!allBatchesQuery.data) return [];
    const users = new Map<string, string>();
    allBatchesQuery.data.forEach(batch => {
      users.set(batch.userUsername, batch.userName);
    });
    return Array.from(users.entries()).map(([username, name]) => ({ username, name }));
  }, [allBatchesQuery.data]);

  // Filter and sort batches
  const filteredBatches = useMemo(() => {
    if (!allBatchesQuery.data) return [];
    
    let filtered = [...allBatchesQuery.data];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(b => 
        b.name?.toLowerCase().includes(term) ||
        b.userName.toLowerCase().includes(term) ||
        b.userUsername.toLowerCase().includes(term)
      );
    }
    
    // Apply user filter
    if (userFilter !== "all") {
      filtered = filtered.filter(b => b.userUsername === userFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "userName":
          comparison = a.userName.localeCompare(b.userName);
          break;
        case "totalEmails":
          comparison = (a.totalEmails || 0) - (b.totalEmails || 0);
          break;
        case "validEmails":
          comparison = (a.validEmails || 0) - (b.validEmails || 0);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  }, [allBatchesQuery.data, searchTerm, userFilter, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleViewResults = (batchId: number) => {
    setSelectedBatchId(batchId);
    setIsResultsDialogOpen(true);
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case "good":
        return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Good</Badge>;
      case "bad":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Bad</Badge>;
      case "risky":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300"><AlertTriangle className="w-3 h-3 mr-1" />Risky</Badge>;
      default:
        return <Badge variant="secondary"><HelpCircle className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 border-green-300">{t.history?.completed || "Completed"}</Badge>;
      case "processing":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300">{"Processing"}</Badge>;
      case "failed":
        return <Badge variant="destructive">{"Failed"}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Mail className="h-8 w-8 text-primary" />
{language === "ru" ? "Email История (Все пользователи)" : language === "uk" ? "Email Історія (Всі користувачі)" : "Email History (All Users)"}
          </h1>
          <p className="text-muted-foreground">
{language === "ru" ? "Просмотр истории email проверок всех пользователей" : language === "uk" ? "Перегляд історії email перевірок всіх користувачів" : "View email validation history from all users"}
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t.adminHistory?.searchPlaceholder || "Search by name or user..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t.adminHistory?.filterByUser || "Filter by user"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.adminHistory?.allUsers || "All users"}</SelectItem>
                  {uniqueUsers.map((u) => (
                    <SelectItem key={u.username} value={u.username}>
                      {u.name} (@{u.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Batches Table */}
        <Card>
          <CardHeader>
<CardTitle>{language === "ru" ? "История email проверок" : language === "uk" ? "Історія email перевірок" : "Email Check History"}</CardTitle>
            <CardDescription>
              {filteredBatches.length} {t.adminHistory?.batchesFound || "batches found"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allBatchesQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mb-4 opacity-50" />
                <p>{t.history?.noBatches || "No email checks found"}</p>
              </div>
            ) : (
              <StickyScrollbar className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort("userName")}
                      >
                        <div className="flex items-center gap-1">
                          <UserIcon className="h-4 w-4" />
                          {t.admin?.user || "User"}
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>{t.history?.batchName || "Batch Name"}</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort("totalEmails")}
                      >
                        <div className="flex items-center gap-1">
                          {t.history?.total || "Total"}
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort("validEmails")}
                      >
                        <div className="flex items-center gap-1">
                          {"Valid"}
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>{"Invalid"}</TableHead>
                      <TableHead>{t.status || "Status"}</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort("createdAt")}
                      >
                        <div className="flex items-center gap-1">
                          {t.date || "Date"}
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">{t.actions || "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{batch.userName}</span>
                            <span className="text-xs text-muted-foreground">@{batch.userUsername}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{batch.name}</TableCell>
                        <TableCell>{batch.totalEmails || 0}</TableCell>
                        <TableCell className="text-green-600">{batch.validEmails || 0}</TableCell>
                        <TableCell className="text-red-600">{batch.invalidEmails || 0}</TableCell>
                        <TableCell>{getStatusBadge(batch.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(batch.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewResults(batch.id)}
                              title={"View Results"}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => exportMutation.mutate({ batchId: batch.id })}
                              disabled={exportMutation.isPending}
                              title={t.exportWord || "Export"}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirmId(batch.id)}
                              className="text-destructive hover:text-destructive"
                              title={t.delete || "Delete"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </StickyScrollbar>
            )}
          </CardContent>
        </Card>

        {/* Results Dialog */}
        <Dialog open={isResultsDialogOpen} onOpenChange={setIsResultsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {"Email Results"}
              </DialogTitle>
              <DialogDescription>
                {batchResultsQuery.data?.batch?.name} - {batchResultsQuery.data?.results?.length || 0} {t.email?.emails || "emails"}
              </DialogDescription>
            </DialogHeader>
            
            {batchResultsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : batchResultsQuery.data?.results ? (
              <StickyScrollbar className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>{"Quality"}</TableHead>
                      <TableHead>{t.email?.result || "Result"}</TableHead>
                      <TableHead>{t.email?.subresult || "Details"}</TableHead>
                      <TableHead>{t.email?.freeProvider || "Free"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchResultsQuery.data.results.map((result, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">{result.email}</TableCell>
                        <TableCell>{getQualityBadge(result.quality || "unknown")}</TableCell>
                        <TableCell>{result.result}</TableCell>
                        <TableCell className="text-muted-foreground">{result.subresult || "-"}</TableCell>
                        <TableCell>{result.isFree ? "Yes" : "No"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </StickyScrollbar>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResultsDialogOpen(false)}>
                {t.close || "Close"}
              </Button>
              {selectedBatchId && (
                <Button onClick={() => exportMutation.mutate({ batchId: selectedBatchId })}>
                  <Download className="h-4 w-4 mr-2" />
                  {t.home?.exportCSV || "Export"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.adminHistory?.deleteBatchConfirm || "Confirm Delete"}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.adminHistory?.deleteBatchDesc || "Are you sure you want to delete this batch? This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel || "Cancel"}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirmId && deleteMutation.mutate({ batchId: deleteConfirmId })}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {t.delete || "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
