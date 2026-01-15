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
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useMemo } from "react";
import { 
  History, 
  Search, 
  Loader2,
  Shield,
  Eye,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpDown,
  User as UserIcon
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import HealthScoreBadge from "@/components/HealthScoreBadge";
import { useLanguage } from "@/contexts/LanguageContext";

type SortField = "createdAt" | "userName" | "totalNumbers" | "validNumbers";
type SortDirection = "asc" | "desc";

export default function AdminHistory() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false);

  // Check if user is admin
  if (user && user.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="h-6 w-6" />
                {t.admin.accessDenied}
              </CardTitle>
              <CardDescription>
                {t.admin.accessDeniedDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation("/")} className="w-full">
                {t.admin.goToDashboard}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // API queries
  const allBatchesQuery = trpc.admin.listAllBatches.useQuery();
  const batchResultsQuery = trpc.admin.getBatchResults.useQuery(
    { batchId: selectedBatchId!, page: 1, pageSize: 100 },
    { enabled: selectedBatchId !== null }
  );

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
        case "totalNumbers":
          comparison = (a.totalNumbers || 0) - (b.totalNumbers || 0);
          break;
        case "validNumbers":
          comparison = (a.validNumbers || 0) - (b.validNumbers || 0);
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

  const handleExportCSV = () => {
    if (!batchResultsQuery.data?.results || batchResultsQuery.data.results.length === 0) {
      toast.error(t.home.noResultsMatch);
      return;
    }

    const headers = [
      t.fields.phoneNumber,
      t.fields.internationalFormat,
      t.fields.validNumber,
      t.fields.reachable,
      t.fields.countryName,
      t.fields.currentCarrierName,
      t.fields.ported,
      t.fields.roaming,
      t.fields.healthScore,
      t.fields.status
    ];

    const rows = batchResultsQuery.data.results.map(r => [
      r.phoneNumber,
      r.internationalFormat || "",
      r.validNumber || "",
      r.reachable || "",
      r.countryName || "",
      r.currentCarrierName || "",
      r.ported || "",
      r.roaming || "",
      r.healthScore?.toString() || "",
      r.status
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hlr-results-batch-${selectedBatchId}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.home.exportCSV);
  };

  const getStatusBadge = (validNumber: string | null) => {
    switch (validNumber) {
      case "valid":
        return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle2 className="w-3 h-3 mr-1" />{t.home.statusValid}</Badge>;
      case "invalid":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t.home.statusInvalid}</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />{t.home.statusUnknown}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            {t.adminHistory.title}
          </h1>
          <p className="text-muted-foreground">
            {t.adminHistory.subtitle}
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
                    placeholder={t.adminHistory.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t.adminHistory.filterByUser} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.adminHistory.allUsers}</SelectItem>
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
            <CardTitle>{t.adminHistory.checkHistory}</CardTitle>
            <CardDescription>
              {filteredBatches.length} {t.adminHistory.batchesFound}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allBatchesQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort("userName")}
                      >
                        <div className="flex items-center gap-1">
                          <UserIcon className="h-4 w-4" />
                          {t.admin.user}
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>{t.history.batchName}</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort("totalNumbers")}
                      >
                        <div className="flex items-center gap-1">
                          {t.history.total}
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort("validNumbers")}
                      >
                        <div className="flex items-center gap-1">
                          {t.home.valid}
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort("createdAt")}
                      >
                        <div className="flex items-center gap-1">
                          {t.date}
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t.history.noBatches}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBatches.map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {batch.userName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{batch.userName}</p>
                                <p className="text-xs text-muted-foreground">@{batch.userUsername}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {batch.name || `Batch #${batch.id}`}
                          </TableCell>
                          <TableCell>{batch.totalNumbers}</TableCell>
                          <TableCell>
                            <span className="text-green-600 font-medium">{batch.validNumbers}</span>
                            <span className="text-muted-foreground"> / </span>
                            <span className="text-red-600">{batch.invalidNumbers}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={batch.status === "completed" ? "default" : "secondary"}>
                              {batch.status === "completed" ? t.history.completed : batch.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(batch.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewResults(batch.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {t.view}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Dialog */}
        <Dialog open={isResultsDialogOpen} onOpenChange={setIsResultsDialogOpen}>
          <DialogContent className="max-w-7xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{t.adminHistory.batchResults}</span>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  {t.home.exportCSV}
                </Button>
              </DialogTitle>
              <DialogDescription>
                {batchResultsQuery.data?.batch?.name || `Batch #${selectedBatchId}`} - 
                {batchResultsQuery.data?.total || 0} {t.home.results}
              </DialogDescription>
            </DialogHeader>

            {batchResultsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.home.phoneNumber}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead>{t.home.reachable}</TableHead>
                      <TableHead>{t.home.health}</TableHead>
                      <TableHead>{t.home.country}</TableHead>
                      <TableHead>{t.home.operator}</TableHead>
                      <TableHead>{t.home.ported}</TableHead>
                      <TableHead>{t.home.roaming}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchResultsQuery.data?.results?.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-mono">
                          {result.internationalFormat || result.phoneNumber}
                        </TableCell>
                        <TableCell>{getStatusBadge(result.validNumber)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {result.reachable ? (t.reachableStatus as any)[result.reachable] || result.reachable : "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <HealthScoreBadge score={result.healthScore || 0} size="sm" />
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">{result.countryCode}</span>{" "}
                          {result.countryName}
                        </TableCell>
                        <TableCell>{result.currentCarrierName || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {result.ported ? (t.portedStatus as any)[result.ported] || result.ported : "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {result.roaming ? (t.roamingStatus as any)[result.roaming] || result.roaming : "-"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
