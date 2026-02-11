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
  Mail, 
  Trash2, 
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ArrowUpDown,
  User as UserIcon,
  Eye,
  PlayCircle
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import StickyScrollbar from "@/components/StickyScrollbar";

type SortField = "createdAt" | "userName" | "totalEmails" | "validEmails";
type SortDirection = "asc" | "desc";

export default function EmailHistory() {
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
  const userBatchesQuery = trpc.email.listBatches.useQuery(undefined, { enabled: !isAdmin });
  const adminBatchesQuery = trpc.email.listAllBatches.useQuery(undefined, { enabled: isAdmin });
  
  const batchesQuery = isAdmin ? adminBatchesQuery : userBatchesQuery;
  const deleteBatchMutation = trpc.email.deleteBatch.useMutation();

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
          case "totalEmails":
            aVal = a.totalEmails;
            bVal = b.totalEmails;
            break;
          case "validEmails":
            aVal = a.validEmails;
            bVal = b.validEmails;
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
      toast.success(language === "ru" ? "Проверка удалена" : language === "uk" ? "Перевірку видалено" : "Batch deleted");
    } catch (error) {
      toast.error(language === "ru" ? "Ошибка удаления" : language === "uk" ? "Помилка видалення" : "Delete error");
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
        return <Badge className="bg-success text-success-foreground">{t.history?.completed || "Completed"}</Badge>;
      case "failed":
        return <Badge variant="destructive">{t.home?.statusInvalid || "Failed"}</Badge>;
      case "processing":
        return <Badge variant="secondary">{t.home?.processing || "Processing"}</Badge>;
      default:
        return <Badge variant="outline">{t.home?.statusUnknown || "Unknown"}</Badge>;
    }
  };

  const getContent = () => {
    if (language === "ru") {
      return {
        title: isAdmin ? "Email История (Все пользователи)" : "Email История",
        subtitle: isAdmin ? "Просмотр истории email проверок всех пользователей" : "История ваших email проверок",
        searchPlaceholder: "Поиск по названию или пользователю...",
        allUsers: "Все пользователи",
        user: "Пользователь",
        noBatches: "Нет проверок",
        startChecking: "Начните проверку email адресов",
        goToChecker: "Email Проверка",
        total: "проверок",
        batchName: "Название",
        status: "Статус",
        totalEmails: "Всего",
        valid: "Валидные",
        invalid: "Невалидные",
        risky: "Рискованные",
        date: "Дата",
        actions: "Действия",
        deleteConfirm: "Удалить проверку?",
        deleteDesc: "Это действие нельзя отменить. Все результаты будут удалены.",
        cancel: "Отмена",
        deleteBtn: "Удалить",
      };
    } else if (language === "uk") {
      return {
        title: isAdmin ? "Email Історія (Всі користувачі)" : "Email Історія",
        subtitle: isAdmin ? "Перегляд історії email перевірок всіх користувачів" : "Історія ваших email перевірок",
        searchPlaceholder: "Пошук за назвою або користувачем...",
        allUsers: "Всі користувачі",
        user: "Користувач",
        noBatches: "Немає перевірок",
        startChecking: "Почніть перевірку email адрес",
        goToChecker: "Email Перевірка",
        total: "перевірок",
        batchName: "Назва",
        status: "Статус",
        totalEmails: "Всього",
        valid: "Валідні",
        invalid: "Невалідні",
        risky: "Ризиковані",
        date: "Дата",
        actions: "Дії",
        deleteConfirm: "Видалити перевірку?",
        deleteDesc: "Цю дію не можна скасувати. Всі результати будуть видалені.",
        cancel: "Скасувати",
        deleteBtn: "Видалити",
      };
    }
    return {
      title: isAdmin ? "Email History (All Users)" : "Email History",
      subtitle: isAdmin ? "View email check history from all users" : "Your email verification history",
      searchPlaceholder: "Search by name or user...",
      allUsers: "All users",
      user: "User",
      noBatches: "No batches",
      startChecking: "Start checking emails",
      goToChecker: "Email Check",
      total: "batches",
      batchName: "Name",
      status: "Status",
      totalEmails: "Total",
      valid: "Valid",
      invalid: "Invalid",
      risky: "Risky",
      date: "Date",
      actions: "Actions",
      deleteConfirm: "Delete batch?",
      deleteDesc: "This action cannot be undone. All results will be deleted.",
      cancel: "Cancel",
      deleteBtn: "Delete",
    };
  };

  const content = getContent();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Mail className="h-8 w-8 text-primary" />
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
            <CardTitle>{content.title}</CardTitle>
            <CardDescription>
              {filteredBatches.length} {content.total}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {batchesQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">{content.noBatches}</p>
                <p className="text-sm mt-1">{content.startChecking}</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setLocation("/email")}
                >
                  {content.goToChecker}
                </Button>
              </div>
            ) : (
              <StickyScrollbar className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{content.batchName}</TableHead>
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
                      <TableHead>{content.status}</TableHead>
                      <TableHead className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSort("totalEmails")}
                        >
                          {content.totalEmails}
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSort("validEmails")}
                        >
                          {content.valid}
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-center">{content.invalid}</TableHead>
                      <TableHead className="text-center">{content.risky}</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 -ml-2"
                          onClick={() => handleSort("createdAt")}
                        >
                          {content.date}
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">{content.actions}</TableHead>
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
                          {batch.totalEmails}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-success">{batch.validEmails}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-destructive">{batch.invalidEmails}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-yellow-500">{batch.riskyEmails}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(batch.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/email?batch=${batch.id}`)}
                              title={language === "ru" ? "Просмотр" : language === "uk" ? "Перегляд" : "View"}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {batch.status !== "completed" && batch.status !== "processing" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLocation(`/email?resume=${batch.id}`)}
                                title={language === "ru" ? "Возобновить" : language === "uk" ? "Відновити" : "Resume"}
                                className="text-primary hover:text-primary"
                              >
                                <PlayCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{content.deleteConfirm}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {content.deleteDesc}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{content.cancel}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(batch.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {content.deleteBtn}
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
