import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Activity, CheckCircle, XCircle, Clock, TrendingUp, Wallet, Eye, User, FileText, Download, Trash2, Mail, CreditCard } from "lucide-react";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import HealthScoreBadge from "@/components/HealthScoreBadge";
import { toast } from "sonner";

// GSM Error codes mapping with short labels
const GSM_CODES: Record<string, { meaning: string; shortLabel: string; recommendation: string }> = {
  "0": { meaning: "Delivered - номер активен", shortLabel: "OK", recommendation: "Можно использовать" },
  "1": { meaning: "Unknown Subscriber - неизвестный абонент", shortLabel: "Bad Number", recommendation: "Удалить из базы" },
  "5": { meaning: "Unidentified Subscriber - неопознанный абонент", shortLabel: "Bad Number", recommendation: "Удалить из базы" },
  "6": { meaning: "Absent Subscriber - абонент отсутствует", shortLabel: "Absent", recommendation: "Телефон выключен, повторить позже" },
  "7": { meaning: "Unknown Equipment - неизвестное оборудование", shortLabel: "Bad Device", recommendation: "Проверить вручную" },
  "8": { meaning: "Roaming Not Allowed - роуминг запрещен", shortLabel: "Roaming", recommendation: "Номер в роуминге" },
  "9": { meaning: "Illegal Subscriber - нелегальный абонент", shortLabel: "Blocked", recommendation: "Номер заблокирован" },
  "10": { meaning: "Bearer Service Not Provisioned - услуга не подключена", shortLabel: "No Service", recommendation: "Проверить тип номера" },
  "11": { meaning: "Teleservice Not Provisioned - услуга не поддерживается", shortLabel: "No Service", recommendation: "Проверить тип номера" },
  "12": { meaning: "Illegal Equipment - нелегальное оборудование", shortLabel: "Blocked", recommendation: "Устройство заблокировано" },
  "13": { meaning: "Call Barred - вызов заблокирован", shortLabel: "Barred", recommendation: "Номер заблокирован" },
  "21": { meaning: "Facility Not Supported - функция не поддерживается", shortLabel: "No Support", recommendation: "Повторить позже" },
  "27": { meaning: "Absent Subscriber SM - абонент недоступен для SMS", shortLabel: "Absent", recommendation: "Телефон выключен" },
  "31": { meaning: "System Failure - системная ошибка", shortLabel: "Error", recommendation: "Повторить позже" },
  "32": { meaning: "Data Missing - данные отсутствуют", shortLabel: "No Data", recommendation: "Повторить позже" },
  "34": { meaning: "System Failure - сбой системы", shortLabel: "Error", recommendation: "Повторить позже" },
  "35": { meaning: "Data Missing - данные отсутствуют", shortLabel: "No Data", recommendation: "Повторить позже" },
  "36": { meaning: "Unexpected Data Value - неожиданные данные", shortLabel: "Error", recommendation: "Повторить позже" },
};

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const { data: stats } = trpc.hlr.getUserStats.useQuery();
  const { data: balance } = trpc.hlr.getBalance.useQuery();
  const { data: emailBalance } = trpc.email.getBalance.useQuery();
  const { data: emailStats } = trpc.email.getStats.useQuery();

  const dailyLimit = stats?.limits?.dailyLimit ?? 0;
  const weeklyLimit = stats?.limits?.weeklyLimit ?? 0;
  const monthlyLimit = stats?.limits?.monthlyLimit ?? 0;
  const batchLimit = stats?.limits?.batchLimit ?? 0;
  const checksToday = stats?.checksToday || 0;
  const checksThisWeek = stats?.checksThisWeek || 0;
  const checksThisMonth = stats?.checksThisMonth || 0;
  
  const dailyProgress = dailyLimit > 0 ? (checksToday / dailyLimit) * 100 : 0;
  const weeklyProgress = weeklyLimit > 0 ? (checksThisWeek / weeklyLimit) * 100 : 0;
  const monthlyProgress = monthlyLimit > 0 ? (checksThisMonth / monthlyLimit) * 100 : 0;
  
  // Check if any limit is close to being reached (>80%)
  const isDailyWarning = dailyLimit > 0 && dailyProgress >= 80 && dailyProgress < 100;
  const isWeeklyWarning = weeklyLimit > 0 && weeklyProgress >= 80 && weeklyProgress < 100;
  const isMonthlyWarning = monthlyLimit > 0 && monthlyProgress >= 80 && monthlyProgress < 100;
  const hasWarning = isDailyWarning || isWeeklyWarning || isMonthlyWarning;
  
  // Estimate available checks based on balance (assuming ~$0.01 per check)
  const estimatedChecks = balance?.balance ? Math.floor(balance.balance / 0.01) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t.nav.dashboard}</h1>
          <p className="text-muted-foreground">{t.home.subtitle}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.statistics?.totalChecked || "Total Checked"}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalChecks || 0}</div>
              <p className="text-xs text-muted-foreground">
                {t.home.monthlyUsage}: {checksThisMonth}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.statistics?.validNumbers || "Valid"}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats?.validNumbers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalChecks ? ((stats.validNumbers / stats.totalChecks) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.home.apiBalance} (HLR)</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{balance?.balance?.toFixed(2) || "0.00"} EUR</div>
              <p className="text-xs text-muted-foreground">
                ~{estimatedChecks.toLocaleString()} {t.home.estimatedChecks || "checks available"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.home.apiBalance} (Email)</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{emailBalance?.credits?.toLocaleString() || "0"}</div>
              <p className="text-xs text-muted-foreground">
                {t.email?.credits || "credits available"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Limits */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Daily Limit */}
          <Card className={dailyProgress >= 100 ? "border-destructive" : isDailyWarning ? "border-yellow-500" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t.home.dailyUsage}
              </CardTitle>
              <CardDescription>
                {dailyLimit > 0 
                  ? `${checksToday} / ${dailyLimit} ${t.statistics?.checksUsed || "checks used"}`
                  : `${checksToday} ${t.statistics?.checksUsed || "checks"} (${t.home.unlimited})`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dailyLimit > 0 ? (
                <>
                  <Progress 
                    value={dailyProgress} 
                    className={`h-3 ${dailyProgress >= 100 ? '[&>div]:bg-destructive' : isDailyWarning ? '[&>div]:bg-yellow-500' : ''}`} 
                  />
                  {dailyProgress >= 100 && (
                    <p className="text-sm text-destructive mt-2">{t.home.dailyLimitReached}</p>
                  )}
                  {isDailyWarning && (
                    <p className="text-sm text-yellow-500 mt-2">{t.home.limitWarning || "Приближается к лимиту"}</p>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">{t.home.unlimited}</div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Limit */}
          {weeklyLimit > 0 && (
            <Card className={weeklyProgress >= 100 ? "border-destructive" : isWeeklyWarning ? "border-yellow-500" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t.home.weeklyUsage}
                </CardTitle>
                <CardDescription>
                  {checksThisWeek} / {weeklyLimit} {t.statistics?.checksUsed || "checks used"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress 
                  value={weeklyProgress} 
                  className={`h-3 ${weeklyProgress >= 100 ? '[&>div]:bg-destructive' : isWeeklyWarning ? '[&>div]:bg-yellow-500' : ''}`} 
                />
                {weeklyProgress >= 100 && (
                  <p className="text-sm text-destructive mt-2">{t.home.weeklyLimitReached}</p>
                )}
                {isWeeklyWarning && (
                  <p className="text-sm text-yellow-500 mt-2">{t.home.limitWarning || "Приближается к лимиту"}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Monthly Limit */}
          <Card className={monthlyProgress >= 100 ? "border-destructive" : isMonthlyWarning ? "border-yellow-500" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t.home.monthlyUsage}
              </CardTitle>
              <CardDescription>
                {monthlyLimit > 0 
                  ? `${checksThisMonth} / ${monthlyLimit} ${t.statistics?.checksUsed || "checks used"}`
                  : `${checksThisMonth} ${t.statistics?.checksUsed || "checks"} (${t.home.unlimited})`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyLimit > 0 ? (
                <>
                  <Progress 
                    value={monthlyProgress} 
                    className={`h-3 ${monthlyProgress >= 100 ? '[&>div]:bg-destructive' : isMonthlyWarning ? '[&>div]:bg-yellow-500' : ''}`} 
                  />
                  {monthlyProgress >= 100 && (
                    <p className="text-sm text-destructive mt-2">{t.home.monthlyLimitReached}</p>
                  )}
                  {isMonthlyWarning && (
                    <p className="text-sm text-yellow-500 mt-2">{t.home.limitWarning || "Приближается к лимиту"}</p>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">{t.home.unlimited}</div>
              )}
            </CardContent>
          </Card>

          {/* Batch Limit Info */}
          {batchLimit > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t.home.batchLimit}
                </CardTitle>
                <CardDescription>
                  {t.admin?.batchLimit || "Максимум номеров в одной партии"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{batchLimit}</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity - Admin sees all users, regular users see only their own */}
        <Card>
          <CardHeader>
            <CardTitle>{t.home.checkHistory}</CardTitle>
            <CardDescription>
              {isAdmin 
                ? "Просмотр и управление проверками всех пользователей"
                : t.home.checkHistoryDesc
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin ? <AdminBatchesView /> : <RecentBatches />}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function RecentBatches() {
  const { t } = useLanguage();
  const { data: batches } = trpc.hlr.listBatches.useQuery();

  if (!batches || batches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t.home.noChecksYet}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {batches.slice(0, 5).map((batch: any) => (
        <div key={batch.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className={`h-2 w-2 rounded-full ${batch.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <div>
              <p className="font-medium">{batch.name || `Batch #${batch.id}`}</p>
              <p className="text-sm text-muted-foreground">
                {batch.totalNumbers} {t.home.numbersDetected}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-sm font-medium ${batch.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>
              {batch.status === 'completed' ? t.status : `${batch.progress}%`}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(batch.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Admin view - shows all batches from all users
function AdminBatchesView() {
  const { t } = useLanguage();
  const [userFilter, setUserFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateSort, setDateSort] = useState<string>("newest");
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<number | null>(null);
  const [viewingBatch, setViewingBatch] = useState<{ id: number; name: string; userName: string } | null>(null);
  
  const utils = trpc.useUtils();
  const { data: allBatches, isLoading } = trpc.admin.listAllBatches.useQuery();
  
  const deleteBatchMutation = trpc.admin.deleteBatch.useMutation({
    onSuccess: () => {
      toast.success(t.adminHistory?.batchDeleted || "Отчёт удалён");
      utils.admin.listAllBatches.invalidate();
      setDeletingBatchId(null);
    },
    onError: () => {
      toast.error(t.adminHistory?.deleteError || "Ошибка при удалении");
      setDeletingBatchId(null);
    },
  });
  
  const handleDeleteBatch = (batchId: number) => {
    setDeletingBatchId(batchId);
    deleteBatchMutation.mutate({ batchId });
  };
  
  // Get unique users from batches
  const users = allBatches 
    ? Array.from(new Set(allBatches.map((b: any) => b.userName))).filter(Boolean)
    : [];
  
  // Filter and sort batches
  const filteredBatches = allBatches
    ?.filter((b: any) => {
      const matchesUser = userFilter === "all" || b.userName === userFilter;
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "completed" && b.status === "completed") ||
        (statusFilter === "in_progress" && b.status !== "completed");
      return matchesUser && matchesStatus;
    })
    ?.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateSort === "newest" ? dateB - dateA : dateA - dateB;
    }) || [];

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Загрузка...
      </div>
    );
  }

  if (!allBatches || allBatches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t.home.noChecksYet}
      </div>
    );
  }

  // If viewing a batch, show results inline instead of list
  if (viewingBatch) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setViewingBatch(null)}>
            ← Назад
          </Button>
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t.adminHistory?.batchResults || "Результаты проверки"}: {viewingBatch.name}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              {viewingBatch.userName}
            </p>
          </div>
        </div>
        <BatchResultsView batchId={viewingBatch.id} batchName={viewingBatch.name} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* User filter */}
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Все пользователи" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все пользователи</SelectItem>
              {users.map((userName: any) => (
                <SelectItem key={userName} value={userName}>{userName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="completed">Завершено</SelectItem>
              <SelectItem value="in_progress">В процессе</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Date sort */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Select value={dateSort} onValueChange={setDateSort}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Сначала новые</SelectItem>
              <SelectItem value="oldest">Сначала старые</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <span className="text-sm text-muted-foreground ml-auto">
          {filteredBatches.length} проверок
        </span>
      </div>

      {/* Batches table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Пользователь</TableHead>
              <TableHead>Номеров</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBatches.slice(0, 20).map((batch: any) => (
              <TableRow key={batch.id}>
                <TableCell className="font-mono">#{batch.id}</TableCell>
                <TableCell>{batch.name || `Batch #${batch.id}`}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    <User className="h-3 w-3 mr-1" />
                    {batch.userName || "Unknown"}
                  </Badge>
                </TableCell>
                <TableCell>{batch.totalNumbers}</TableCell>
                <TableCell>
                  <Badge variant={batch.status === 'completed' ? 'default' : 'secondary'}>
                    {batch.status === 'completed' ? 'Завершено' : `${batch.progress}%`}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(batch.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setViewingBatch({ 
                        id: batch.id, 
                        name: batch.name || `Batch #${batch.id}`,
                        userName: batch.userName 
                      })}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {t.view}
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={deletingBatchId === batch.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t.adminHistory?.deleteBatch || "Удалить отчёт"}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t.adminHistory?.deleteBatchConfirm || "Вы уверены, что хотите удалить этот отчёт?"}
                            <br />
                            <strong>{batch.name || `Batch #${batch.id}`}</strong> ({batch.totalNumbers} {t.home.numbersDetected})
                            <br /><br />
                            {t.adminHistory?.deleteBatchDesc || "Все результаты будут удалены."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteBatch(batch.id)}
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
      </div>
      
      {filteredBatches.length > 20 && (
        <p className="text-sm text-muted-foreground text-center">
          Показано 20 из {filteredBatches.length} проверок
        </p>
      )}
    </div>
  );
}

// Batch results view with GSM codes
function BatchResultsView({ batchId, batchName }: { batchId: number; batchName?: string }) {
  const [qualityFilter, setQualityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [sortColumn, setSortColumn] = useState<"healthScore" | "status" | "operator" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  const { data, isLoading } = trpc.admin.getBatchResults.useQuery({ 
    batchId, 
    page: 1, 
    pageSize: 1000 
  });

  // Export function that respects current filter
  const handleExportCSV = (exportFiltered: boolean = false) => {
    const resultsToExport = exportFiltered ? filteredResults : data?.results;
    
    if (!resultsToExport || resultsToExport.length === 0) {
      toast.error("Нет результатов для экспорта");
      return;
    }

    const headers = [
      "Номер телефона",
      "Международный формат",
      "Валидность",
      "Достижимость",
      "Страна",
      "Код страны",
      "Текущий оператор",
      "Тип сети",
      "Оригинальный оператор",
      "Портирован",
      "Роуминг",
      "GSM код",
      "GSM сообщение",
      "Оценка качества",
      "Уровень качества",
      "Дата проверки"
    ];

    const rows = resultsToExport.map((r: any) => {
      const score = r.healthScore || 0;
      const qualityLevel = score >= 60 ? "Высокое" : score >= 40 ? "Среднее" : "Низкое";
      return [
        r.phoneNumber,
        r.internationalFormat || "",
        r.validNumber || "",
        r.reachable || "",
        r.countryName || "",
        r.countryCode || "",
        r.currentCarrierName || "",
        r.currentNetworkType || "",
        r.originalCarrierName || "",
        r.ported || "",
        r.roaming || "",
        r.gsmCode || "",
        r.gsmMessage || "",
        r.healthScore?.toString() || "",
        qualityLevel,
        r.createdAt ? new Date(r.createdAt).toLocaleString() : ""
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    
    // Add filter info to filename if filtered
    const filterSuffix = exportFiltered && qualityFilter !== "all" ? `-${qualityFilter}` : "";
    a.href = url;
    a.download = `hlr-report-${batchId}${filterSuffix}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    const exportCount = resultsToExport.length;
    const filterText = exportFiltered && qualityFilter !== "all" 
      ? ` (фильтр: ${qualityFilter === "high" ? "высокое" : qualityFilter === "medium" ? "среднее" : "низкое"} качество)`
      : "";
    toast.success(`Экспортировано ${exportCount} номеров${filterText}`);
  };

  if (isLoading) {
    return <div className="text-center py-8">Загрузка результатов...</div>;
  }

  if (!data?.results || data.results.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Нет результатов</div>;
  }

  // Calculate stats - validity from API
  const validCount = data.results.filter((r: any) => r.validNumber === "valid").length;
  const invalidCount = data.results.filter((r: any) => r.validNumber === "invalid").length;
  const unknownCount = data.results.length - validCount - invalidCount;
  
  // Calculate quality stats based on Health Score
  const highQuality = data.results.filter((r: any) => (r.healthScore || 0) >= 60).length;
  const mediumQuality = data.results.filter((r: any) => (r.healthScore || 0) >= 40 && (r.healthScore || 0) < 60).length;
  const lowQuality = data.results.filter((r: any) => (r.healthScore || 0) < 40).length;
  
  // Filter results by quality
  const filteredByQuality = data.results.filter((r: any) => {
    const score = r.healthScore || 0;
    if (qualityFilter === "all") return true;
    if (qualityFilter === "high") return score >= 60;
    if (qualityFilter === "medium") return score >= 40 && score < 60;
    if (qualityFilter === "low") return score < 40;
    return true;
  });
  
  // Sort results
  const filteredResults = [...filteredByQuality].sort((a: any, b: any) => {
    if (!sortColumn) return 0;
    
    let aValue: any;
    let bValue: any;
    
    switch (sortColumn) {
      case "healthScore":
        aValue = a.healthScore || 0;
        bValue = b.healthScore || 0;
        break;
      case "status":
        // Sort order: valid > unknown > invalid
        const statusOrder: Record<string, number> = { valid: 3, unknown: 2, invalid: 1 };
        aValue = statusOrder[a.validNumber] || 0;
        bValue = statusOrder[b.validNumber] || 0;
        break;
      case "operator":
        aValue = (a.currentCarrierName || "").toLowerCase();
        bValue = (b.currentCarrierName || "").toLowerCase();
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
  
  // Handle column header click for sorting
  const handleSort = (column: "healthScore" | "status" | "operator") => {
    if (sortColumn === column) {
      // Toggle direction or reset
      if (sortDirection === "desc") {
        setSortDirection("asc");
      } else {
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };
  
  // Pagination
  const totalPages = Math.ceil(filteredResults.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedResults = filteredResults.slice(startIndex, endIndex);
  
  // Reset to page 1 when filter or page size changes
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };
  
  const handleFilterChange = (filter: "all" | "high" | "medium" | "low") => {
    setQualityFilter(filter);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden space-y-4">
      {/* Stats summary - two rows */}
      <div className="space-y-3">
        {/* Row 1: Validity from API */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="bg-muted/30">
            <CardContent className="pt-3 pb-2">
              <div className="text-xl font-bold">{data.results.length}</div>
              <p className="text-[10px] text-muted-foreground">Всего</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/30">
            <CardContent className="pt-3 pb-2">
              <div className="text-xl font-bold text-green-500">{validCount}</div>
              <p className="text-[10px] text-muted-foreground">Валидных (API)</p>
            </CardContent>
          </Card>
          <Card className="border-red-500/30">
            <CardContent className="pt-3 pb-2">
              <div className="text-xl font-bold text-red-500">{invalidCount}</div>
              <p className="text-[10px] text-muted-foreground">Невалидных (API)</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/30">
            <CardContent className="pt-3 pb-2">
              <div className="text-xl font-bold text-yellow-500">{unknownCount}</div>
              <p className="text-[10px] text-muted-foreground">Неизвестно</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Row 2: Quality based on Health Score - clickable for filtering */}
        <div className="grid grid-cols-3 gap-3">
          <Card 
            className={`border-green-500/50 bg-green-500/5 cursor-pointer transition-all hover:scale-[1.02] ${qualityFilter === "high" ? "ring-2 ring-green-500" : ""}`}
            onClick={() => handleFilterChange(qualityFilter === "high" ? "all" : "high")}
          >
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-green-500">{highQuality}</div>
                  <p className="text-[10px] text-muted-foreground">Высокое качество</p>
                </div>
                <div className="text-green-500 text-lg">↑</div>
              </div>
              <p className="text-[9px] text-green-600/70 mt-1">Health Score ≥ 60</p>
            </CardContent>
          </Card>
          <Card 
            className={`border-yellow-500/50 bg-yellow-500/5 cursor-pointer transition-all hover:scale-[1.02] ${qualityFilter === "medium" ? "ring-2 ring-yellow-500" : ""}`}
            onClick={() => handleFilterChange(qualityFilter === "medium" ? "all" : "medium")}
          >
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-yellow-500">{mediumQuality}</div>
                  <p className="text-[10px] text-muted-foreground">Среднее качество</p>
                </div>
                <div className="text-yellow-500 text-lg">→</div>
              </div>
              <p className="text-[9px] text-yellow-600/70 mt-1">Health Score 40-59</p>
            </CardContent>
          </Card>
          <Card 
            className={`border-red-500/50 bg-red-500/5 cursor-pointer transition-all hover:scale-[1.02] ${qualityFilter === "low" ? "ring-2 ring-red-500" : ""}`}
            onClick={() => handleFilterChange(qualityFilter === "low" ? "all" : "low")}
          >
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-red-500">{lowQuality}</div>
                  <p className="text-[10px] text-muted-foreground">Низкое качество</p>
                </div>
                <div className="text-red-500 text-lg">↓</div>
              </div>
              <p className="text-[9px] text-red-600/70 mt-1">Health Score &lt; 40</p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Filter indicator */}
      {qualityFilter !== "all" && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Фильтр:</span>
          <Badge 
            variant="outline" 
            className={`cursor-pointer ${
              qualityFilter === "high" ? "border-green-500 text-green-500" :
              qualityFilter === "medium" ? "border-yellow-500 text-yellow-500" :
              "border-red-500 text-red-500"
            }`}
            onClick={() => setQualityFilter("all")}
          >
            {qualityFilter === "high" ? "Высокое" : qualityFilter === "medium" ? "Среднее" : "Низкое"} качество ×
          </Badge>
          <span className="text-muted-foreground">({filteredResults.length} из {data.results.length})</span>
        </div>
      )}

      {/* Export buttons */}
      <div className="flex justify-end gap-2">
        {qualityFilter !== "all" && (
          <Button onClick={() => handleExportCSV(true)} variant="default" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Экспорт отфильтрованных ({filteredResults.length})
          </Button>
        )}
        <Button onClick={() => handleExportCSV(false)} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Экспорт всех ({data.results.length})
        </Button>
      </div>

      {/* Results table - compact view without horizontal scroll */}
      <div className="rounded-md border max-h-[500px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[140px]">Номер</TableHead>
              <TableHead 
                className="w-[100px] cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1">
                  Статус
                  {sortColumn === "status" && (
                    <span className="text-primary">{sortDirection === "desc" ? "↓" : "↑"}</span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="w-[120px] cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort("operator")}
              >
                <div className="flex items-center gap-1">
                  Оператор
                  {sortColumn === "operator" && (
                    <span className="text-primary">{sortDirection === "desc" ? "↓" : "↑"}</span>
                  )}
                </div>
              </TableHead>
              <TableHead className="w-[60px]">Страна</TableHead>
              <TableHead className="w-[80px]">GSM Статус</TableHead>
              <TableHead 
                className="w-[70px] cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort("healthScore")}
              >
                <div className="flex items-center gap-1">
                  Качество
                  {sortColumn === "healthScore" && (
                    <span className="text-primary">{sortDirection === "desc" ? "↓" : "↑"}</span>
                  )}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedResults.map((result: any) => {
              const healthScore = result.healthScore || 0;
              const qualityStatus = healthScore >= 60 ? "high" : healthScore >= 40 ? "medium" : "low";
              const qualityColor = qualityStatus === "high" ? "text-green-500" : qualityStatus === "medium" ? "text-yellow-500" : "text-red-500";
              const qualityBg = qualityStatus === "high" ? "bg-green-500/10" : qualityStatus === "medium" ? "bg-yellow-500/10" : "bg-red-500/10";
              
              return (
                <TableRow key={result.id}>
                  <TableCell className="font-mono text-xs py-2">
                    <div className="flex flex-col">
                      <span>{result.internationalFormat || result.phoneNumber}</span>
                      {result.reachable && (
                        <span className="text-[10px] text-muted-foreground">{result.reachable}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge 
                      variant={result.validNumber === "valid" ? "default" : result.validNumber === "invalid" ? "destructive" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {result.validNumber === "valid" ? "✓" : result.validNumber === "invalid" ? "✗" : "?"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="text-xs truncate max-w-[120px]" title={result.currentCarrierName}>
                      {result.currentCarrierName || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-xs font-medium">{result.countryCode || "-"}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    {result.gsmCode ? (
                      <div className="flex flex-col">
                        <Badge 
                          variant={result.gsmCode === "0" ? "default" : result.gsmCode === "1" || result.gsmCode === "5" ? "destructive" : "secondary"} 
                          className="text-[10px] px-1 py-0 whitespace-nowrap"
                          title={GSM_CODES[result.gsmCode]?.meaning || result.gsmMessage}
                        >
                          {GSM_CODES[result.gsmCode]?.shortLabel || "Unknown"} ({result.gsmCode})
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${qualityBg} ${qualityColor}`}>
                      <span>{healthScore}</span>
                      <span className="text-[10px]">
                        {qualityStatus === "high" ? "↑" : qualityStatus === "medium" ? "→" : "↓"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination controls */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Показывать:</span>
          <Select value={pageSize.toString()} onValueChange={(v) => handlePageSizeChange(Number(v))}>
            <SelectTrigger className="w-[80px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="1000">1000</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {startIndex + 1}-{Math.min(endIndex, filteredResults.length)} из {filteredResults.length}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            «
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ‹
          </Button>
          <span className="px-3 text-sm">
            {currentPage} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            ›
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage >= totalPages}
          >
            »
          </Button>
        </div>
      </div>
    </div>
  );
}
