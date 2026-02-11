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
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useMemo } from "react";
import { 
  History as HistoryIcon, 
  Trash2, 
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ArrowUpDown,
  User as UserIcon
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import StickyScrollbar from "@/components/StickyScrollbar";

type SortField = "createdAt" | "userName" | "totalNumbers" | "validNumbers";
type SortDirection = "asc" | "desc";

export default function History() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";
  
  // State for admin filters
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  
  // Use different queries based on role
  const userBatchesQuery = trpc.hlr.listBatches.useQuery(undefined, { enabled: !isAdmin });
  const adminBatchesQuery = trpc.admin.listAllBatches.useQuery(undefined, { enabled: isAdmin });
  
  const batchesQuery = isAdmin ? adminBatchesQuery : userBatchesQuery;
  const deleteBatchMutation = trpc.hlr.deleteBatch.useMutation();

  // Get unique users for filter (admin only)
  const uniqueUsers = useMemo(() => {
    if (!isAdmin || !adminBatchesQuery.data) return [];
    const users = new Map<number, string>();
    adminBatchesQuery.data.forEach((batch: any) => {
      if (batch.userId && batch.userName) {
        users.set(batch.userId, batch.userName);
      }
    });
    return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
  }, [isAdmin, adminBatchesQuery.data]);

  // Filter and sort batches
  const filteredBatches = useMemo(() => {
    if (!batchesQuery.data) return [];
    
    let filtered = [...batchesQuery.data];
    
    if (isAdmin) {
      // Apply search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((batch: any) => 
          batch.name?.toLowerCase().includes(term) ||
          batch.userName?.toLowerCase().includes(term)
        );
      }
      
      // Apply user filter
      if (userFilter !== "all") {
        filtered = filtered.filter((batch: any) => batch.userId === parseInt(userFilter));
      }
      
      // Apply sorting
      filtered.sort((a: any, b: any) => {
        let aVal: any, bVal: any;
        switch (sortField) {
          case "createdAt":
            aVal = new Date(a.createdAt).getTime();
            bVal = new Date(b.createdAt).getTime();
            break;
          case "userName":
            aVal = a.userName || "";
            bVal = b.userName || "";
            break;
          case "totalNumbers":
            aVal = a.totalNumbers;
            bVal = b.totalNumbers;
            break;
          case "validNumbers":
            aVal = a.validNumbers;
            bVal = b.validNumbers;
            break;
          default:
            return 0;
        }
        if (sortDirection === "asc") {
          return aVal > bVal ? 1 : -1;
        }
        return aVal < bVal ? 1 : -1;
      });
    }
    
    return filtered;
  }, [batchesQuery.data, isAdmin, searchTerm, userFilter, sortField, sortDirection]);

  const handleDelete = async (batchId: number) => {
    try {
      await deleteBatchMutation.mutateAsync({ batchId });
      batchesQuery.refetch();
      toast.success(t.history.batchDeleted);
    } catch (error) {
      toast.error(t.history.batchDeleted);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success text-success-foreground">{t.history.completed}</Badge>;
      case "failed":
        return <Badge variant="destructive">{t.home.statusInvalid}</Badge>;
      case "processing":
        return <Badge variant="secondary">{t.home.processing}</Badge>;
      case "paused":
        return <Badge variant="outline">⏸ Пауза</Badge>;
      default:
        return <Badge variant="outline">{t.home.statusUnknown}</Badge>;
    }
  };

  const getContent = () => {
    if (language === "ru") {
      return {
        title: isAdmin ? "HLR История (Все пользователи)" : "HLR История",
        subtitle: isAdmin ? "Просмотр истории HLR проверок всех пользователей" : "Просмотр всех предыдущих HLR проверок",
        searchPlaceholder: "Поиск по названию или пользователю...",
        allUsers: "Все пользователи",
        user: "Пользователь",
        noResults: "Проверок не найдено",
      };
    } else if (language === "uk") {
      return {
        title: isAdmin ? "HLR Історія (Всі користувачі)" : "HLR Історія",
        subtitle: isAdmin ? "Перегляд історії HLR перевірок всіх користувачів" : "Перегляд всіх попередніх HLR перевірок",
        searchPlaceholder: "Пошук за назвою або користувачем...",
        allUsers: "Всі користувачі",
        user: "Користувач",
        noResults: "Перевірок не знайдено",
      };
    }
    return {
      title: isAdmin ? "HLR History (All Users)" : "HLR History",
      subtitle: isAdmin ? "View HLR check history from all users" : "View all previous HLR checks",
      searchPlaceholder: "Search by name or user...",
      allUsers: "All users",
      user: "User",
      noResults: "No checks found",
    };
  };

  const content = getContent();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <HistoryIcon className="h-8 w-8" />
            {content.title}
          </h1>
          <p className="text-muted-foreground">
            {content.subtitle}
          </p>
        </div>

        {/* Admin Filters */}
        {isAdmin && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={content.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder={content.allUsers} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{content.allUsers}</SelectItem>
                    {uniqueUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t.history.title}</CardTitle>
            <CardDescription>
              {filteredBatches.length} {t.history.total}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {batchesQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <HistoryIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">{content.noResults}</p>
                <p className="text-sm mt-1">{t.home.startByEntering}</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setLocation("/")}
                >
                  {t.nav.hlrChecker}
                </Button>
              </div>
            ) : (
              <StickyScrollbar className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.history.batchName}</TableHead>
                      {isAdmin && (
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 -ml-2"
                            onClick={() => handleSort("userName")}
                          >
                            {content.user}
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          </Button>
                        </TableHead>
                      )}
                      <TableHead>{t.status}</TableHead>
                      <TableHead className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSort("totalNumbers")}
                        >
                          {t.history.total}
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSort("validNumbers")}
                        >
                          {t.home.statusValid}
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-center">{t.home.statusInvalid}</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 -ml-2"
                          onClick={() => handleSort("createdAt")}
                        >
                          {t.date}
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>{t.history.completed}</TableHead>
                      <TableHead className="text-right">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBatches.map((batch: any) => (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(batch.status)}
                            <span className="font-medium">
                              {batch.name || `Batch #${batch.id}`}
                            </span>
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-muted-foreground" />
                              <span>{batch.userName || "—"}</span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>{getStatusBadge(batch.status)}</TableCell>
                        <TableCell className="text-center font-mono">
                          {batch.totalNumbers}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-success">{batch.validNumbers}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-destructive">{batch.invalidNumbers}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(batch.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {batch.completedAt 
                            ? new Date(batch.completedAt).toLocaleString()
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/?batch=${batch.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t.history.deleteConfirm}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t.history.deleteConfirmDesc}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(batch.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t.delete}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
      </div>
    </DashboardLayout>
  );
}
