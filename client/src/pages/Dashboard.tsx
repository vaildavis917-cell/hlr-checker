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
import { Activity, CheckCircle, XCircle, Clock, TrendingUp, Wallet, Eye, User, FileText, Download } from "lucide-react";
import { useState } from "react";
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
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  
  const { data: allBatches, isLoading } = trpc.admin.listAllBatches.useQuery();
  
  // Get unique users from batches
  const users = allBatches 
    ? Array.from(new Set(allBatches.map((b: any) => b.userName))).filter(Boolean)
    : [];
  
  // Filter batches by user
  const filteredBatches = allBatches?.filter((b: any) => 
    userFilter === "all" || b.userName === userFilter
  ) || [];

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
      {/* User filter */}
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Все пользователи" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все пользователи</SelectItem>
            {users.map((userName: any) => (
              <SelectItem key={userName} value={userName}>{userName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-2">
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
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedBatchId(batch.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Просмотр
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Отчёт: {batch.name || `Batch #${batch.id}`}
                          <Badge variant="outline" className="ml-2">
                            <User className="h-3 w-3 mr-1" />
                            {batch.userName}
                          </Badge>
                        </DialogTitle>
                      </DialogHeader>
                      <BatchResultsView batchId={batch.id} batchName={batch.name} />
                    </DialogContent>
                  </Dialog>
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

  // Calculate stats
  const validCount = data.results.filter((r: any) => r.validNumber === "valid").length;
  const invalidCount = data.results.filter((r: any) => r.validNumber === "invalid").length;
  const unknownCount = data.results.length - validCount - invalidCount;

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{data.results.length}</div>
            <p className="text-xs text-muted-foreground">Всего номеров</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">{validCount}</div>
            <p className="text-xs text-muted-foreground">Валидных</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">{invalidCount}</div>
            <p className="text-xs text-muted-foreground">Невалидных</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">{unknownCount}</div>
            <p className="text-xs text-muted-foreground">Неизвестно</p>
          </CardContent>
        </Card>
      </div>

      {/* Export button */}
      <div className="flex justify-end">
        <Button onClick={handleExportCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Экспорт CSV
        </Button>
      </div>

      {/* Results table */}
      <div className="rounded-md border max-h-[500px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Номер</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Достижимость</TableHead>
              <TableHead>Оператор</TableHead>
              <TableHead>Страна</TableHead>
              <TableHead>GSM код</TableHead>
              <TableHead>Health</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.results.map((result: any) => (
              <TableRow key={result.id}>
                <TableCell className="font-mono text-sm">
                  {result.internationalFormat || result.phoneNumber}
                </TableCell>
                <TableCell>
                  <Badge variant={result.validNumber === "valid" ? "default" : result.validNumber === "invalid" ? "destructive" : "secondary"}>
                    {result.validNumber === "valid" ? "Valid" : result.validNumber === "invalid" ? "Invalid" : "Unknown"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {result.reachable || "-"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{result.currentCarrierName || "-"}</p>
                    <p className="text-xs text-muted-foreground">{result.currentNetworkType || ""}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{result.countryCode}</span>
                    <span className="text-xs text-muted-foreground">{result.countryName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {result.gsmCode ? (
                    <div className="flex items-center gap-1">
                      <Badge variant={result.gsmCode === "0" ? "default" : "secondary"} className="text-xs">
                        {result.gsmCode}
                      </Badge>
                      <span className="text-xs text-muted-foreground" title={GSM_CODES[result.gsmCode]?.recommendation}>
                        {GSM_CODES[result.gsmCode]?.meaning || result.gsmMessage || ""}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <HealthScoreBadge score={result.healthScore || 0} size="sm" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
