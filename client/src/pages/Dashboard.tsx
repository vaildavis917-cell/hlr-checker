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
import { Activity, CheckCircle, XCircle, Clock, TrendingUp, Wallet, Eye, User, FileText, Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import HealthScoreBadge from "@/components/HealthScoreBadge";
import { toast } from "sonner";

// GSM Error codes mapping
const GSM_CODES: Record<string, { meaning: string; recommendation: string }> = {
  "0": { meaning: "Успешно - номер валиден", recommendation: "Можно использовать" },
  "1": { meaning: "Неизвестный абонент", recommendation: "Удалить из базы" },
  "6": { meaning: "Абонент отсутствует", recommendation: "Повторить позже" },
  "7": { meaning: "Входящие запрещены", recommendation: "Проверить вручную" },
  "8": { meaning: "Роуминг запрещен", recommendation: "Номер в роуминге" },
  "11": { meaning: "Teleservice не поддерживается", recommendation: "Проверить тип номера" },
  "13": { meaning: "Вызов заблокирован", recommendation: "Номер заблокирован" },
  "21": { meaning: "Нет ответа от сети", recommendation: "Повторить позже" },
  "27": { meaning: "Абонент недоступен", recommendation: "Телефон выключен" },
  "31": { meaning: "Сетевая ошибка", recommendation: "Повторить позже" },
};

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const { data: stats } = trpc.hlr.getUserStats.useQuery();
  const { data: balance } = trpc.hlr.getBalance.useQuery();

  const dailyLimit = stats?.limits?.dailyLimit || 0;
  const monthlyLimit = stats?.limits?.monthlyLimit || 0;
  const checksToday = stats?.checksToday || 0;
  const checksThisMonth = stats?.checksThisMonth || 0;
  
  const dailyProgress = dailyLimit > 0 ? (checksToday / dailyLimit) * 100 : 0;
  const monthlyProgress = monthlyLimit > 0 ? (checksThisMonth / monthlyLimit) * 100 : 0;
  
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
              <CardTitle className="text-sm font-medium">{t.statistics?.invalidNumbers || "Invalid"}</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats?.invalidNumbers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalChecks ? ((stats.invalidNumbers / stats.totalChecks) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.home.apiBalance}</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${balance?.balance?.toFixed(2) || "0.00"}</div>
              <p className="text-xs text-muted-foreground">
                ~{estimatedChecks.toLocaleString()} {t.home.estimatedChecks || "checks available"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Limits */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
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
                  <Progress value={dailyProgress} className="h-3" />
                  {dailyProgress >= 100 && (
                    <p className="text-sm text-destructive mt-2">{t.home.dailyLimitReached}</p>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">{t.home.unlimited}</div>
              )}
            </CardContent>
          </Card>

          <Card>
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
                  <Progress value={monthlyProgress} className="h-3" />
                  {monthlyProgress >= 100 && (
                    <p className="text-sm text-destructive mt-2">{t.home.monthlyLimitReached}</p>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">{t.home.unlimited}</div>
              )}
            </CardContent>
          </Card>
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
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedBatchId(batch.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t.view}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {t.adminHistory?.batchResults || "Отчёт"}: {batch.name || `Batch #${batch.id}`}
                            <Badge variant="outline" className="ml-2">
                              <User className="h-3 w-3 mr-1" />
                              {batch.userName}
                            </Badge>
                          </DialogTitle>
                        </DialogHeader>
                        <BatchResultsView batchId={batch.id} batchName={batch.name} />
                      </DialogContent>
                    </Dialog>
                    
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
  const { data, isLoading } = trpc.admin.getBatchResults.useQuery({ 
    batchId, 
    page: 1, 
    pageSize: 1000 
  });

  const handleExportCSV = () => {
    if (!data?.results || data.results.length === 0) {
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
      "Дата проверки"
    ];

    const rows = data.results.map((r: any) => [
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
      r.createdAt ? new Date(r.createdAt).toLocaleString() : ""
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hlr-report-${batchId}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Отчёт экспортирован");
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

  return (
    <div className="space-y-4">
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
        
        {/* Row 2: Quality based on Health Score */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-green-500/50 bg-green-500/5">
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
          <Card className="border-yellow-500/50 bg-yellow-500/5">
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
          <Card className="border-red-500/50 bg-red-500/5">
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

      {/* Export button */}
      <div className="flex justify-end">
        <Button onClick={handleExportCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Экспорт CSV
        </Button>
      </div>

      {/* Results table - compact view without horizontal scroll */}
      <div className="rounded-md border max-h-[500px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[140px]">Номер</TableHead>
              <TableHead className="w-[100px]">Статус</TableHead>
              <TableHead className="w-[120px]">Оператор</TableHead>
              <TableHead className="w-[60px]">Страна</TableHead>
              <TableHead className="w-[50px]">GSM</TableHead>
              <TableHead className="w-[70px]">Качество</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.results.map((result: any) => {
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
                      <Badge 
                        variant={result.gsmCode === "0" ? "default" : "secondary"} 
                        className="text-[10px] px-1 py-0"
                        title={GSM_CODES[result.gsmCode]?.meaning || result.gsmMessage}
                      >
                        {result.gsmCode}
                      </Badge>
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
    </div>
  );
}
