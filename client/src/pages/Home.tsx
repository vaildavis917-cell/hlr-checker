import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useMemo, useEffect } from "react";
import { 
  Phone, 
  Upload, 
  Search, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  Wallet,
  ArrowUpDown,
  Filter,
  BarChart3,
  User as UserIcon
} from "lucide-react";
import { toast } from "sonner";
import CostCalculator from "@/components/CostCalculator";
import HealthScoreBadge from "@/components/HealthScoreBadge";
import ExportTemplatesDialog from "@/components/ExportTemplatesDialog";
import FileDropZone from "@/components/FileDropZone";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearch } from "wouter";

type SortField = "phoneNumber" | "validNumber" | "currentCarrierName" | "countryName" | "roaming" | "ported" | "healthScore";
type SortDirection = "asc" | "desc";

export default function Home() {
  const { t } = useLanguage();
  const searchString = useSearch();
  const [phoneInput, setPhoneInput] = useState("");
  const [batchName, setBatchName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState<number | null>(null);

  // Handle batch parameter from URL (from History page)
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const batchParam = params.get('batch');
    if (batchParam) {
      const batchId = parseInt(batchParam, 10);
      if (!isNaN(batchId) && batchId > 0) {
        setCurrentBatchId(batchId);
      }
    }
  }, [searchString]);

  // SEO: Set page title and meta description
  useEffect(() => {
    document.title = "DataCheck Pro - HLR и Email проверка номеров";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Сервис HLR проверки телефонных номеров, информации об операторе, статуса роуминга и портирования.');
    }
  }, []);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [operatorFilter, setOperatorFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");
  const [exportFilter, setExportFilter] = useState<string>("all"); // all, valid, invalid
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>("phoneNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Auth
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  // Single check state
  const [singlePhone, setSinglePhone] = useState("");
  const [singleResult, setSingleResult] = useState<any>(null);
  const [isSingleChecking, setIsSingleChecking] = useState(false);
  const [resumingBatchId, setResumingBatchId] = useState<number | null>(null);
  const singleCheckMutation = trpc.hlr.checkSingle.useMutation();
  
  // API queries
  const userStatsQuery = trpc.hlr.getUserStats.useQuery();
  
  // Check if any batch is currently processing
  const batchesQuery = trpc.hlr.listBatches.useQuery(undefined, {
    refetchInterval: (data) => {
      // Auto-refresh every 2 seconds if any batch is processing
      const hasProcessing = data?.state?.data?.some((b: any) => b.status === "processing");
      return hasProcessing ? 2000 : false;
    },
  });
  const incompleteBatchesQuery = trpc.hlr.getIncompleteBatches.useQuery();
  const resultsQuery = trpc.hlr.getResults.useQuery(
    currentBatchId !== null ? { batchId: currentBatchId, page: 1, pageSize: 1000 } : { batchId: -1, page: 1, pageSize: 1000 },
    { enabled: currentBatchId !== null && currentBatchId > 0 }
  );
  
  // Get batch info (including owner for admin)
  const batchQuery = trpc.hlr.getBatch.useQuery(
    { batchId: currentBatchId! },
    { enabled: currentBatchId !== null && currentBatchId > 0 }
  );
  
  // Extract results array from paginated response
  const resultsData = resultsQuery.data?.results || [];
  const startBatchMutation = trpc.hlr.startBatch.useMutation();
  const resumeBatchMutation = trpc.hlr.resumeBatch.useMutation();

  // Parse phone numbers from input
  const parsePhoneNumbers = (input: string): string[] => {
    return input
      .split(/[,\n]+/)
      .map(num => num.trim())
      .filter(num => num.length > 0);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Parse CSV - assume first column is phone number
      const lines = text.split("\n");
      const numbers: string[] = [];
      
      lines.forEach((line, index) => {
        if (index === 0 && line.toLowerCase().includes("phone")) return; // Skip header
        const parts = line.split(/[,;]/);
        if (parts[0]) {
          const num = parts[0].trim().replace(/['"]/g, "");
          if (num) numbers.push(num);
        }
      });
      
      setPhoneInput(numbers.join("\n"));
      toast.success(`Загружено ${numbers.length} номеров из файла`);
    };
    reader.readAsText(file);
  };

  // Start HLR check
  const handleStartCheck = async () => {
    const numbers = parsePhoneNumbers(phoneInput);
    if (numbers.length === 0) {
      toast.error("Введите хотя бы один номер телефона");
      return;
    }

    // No limit on number of phones

    setIsProcessing(true);
    try {
      const result = await startBatchMutation.mutateAsync({
        name: batchName || undefined,
        phoneNumbers: numbers,
      });
      
      setCurrentBatchId(result.batchId);
      setPhoneInput("");
      setBatchName("");
      batchesQuery.refetch();
      resultsQuery.refetch();
      toast.success(`Обработано ${result.totalProcessed} номеров`);
    } catch (error) {
      toast.error("Не удалось обработать номера");
    } finally {
      setIsProcessing(false);
    }
  };

  // Resume interrupted batch
  const handleResumeBatch = async (batchId: number) => {
    setResumingBatchId(batchId);
    try {
      const result = await resumeBatchMutation.mutateAsync({ batchId });
      
      setCurrentBatchId(batchId);
      batchesQuery.refetch();
      incompleteBatchesQuery.refetch();
      resultsQuery.refetch();
      
      if (!result.resumed) {
        toast.info(t.home.batchAlreadyComplete || "Проверка уже завершена");
      } else {
        const processed = result.newlyChecked || 0;
        toast.success(
          `${t.home.resumeSuccessPrefix || "Проверка возобновлена. Обработано:"} ${processed}`
        );
      }
    } catch (error: any) {
      const message = error?.message || t.home.resumeErrorMsg || "Не удалось возобновить проверку";
      toast.error(message);
    } finally {
      setResumingBatchId(null);
    }
  };

  // Export results to CSV
  const handleExportCSV = () => {
    if (!resultsData || resultsData.length === 0) {
      toast.error("Нет результатов для экспорта");
      return;
    }

    // Apply export filter
    let dataToExport = resultsData;
    if (exportFilter === "valid") {
      dataToExport = resultsData.filter(r => r.validNumber === "valid");
    } else if (exportFilter === "invalid") {
      dataToExport = resultsData.filter(r => r.validNumber !== "valid");
    }

    if (dataToExport.length === 0) {
      toast.error(t.home.noResultsToExport || "Нет результатов для экспорта");
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
      "Статус",
      "Оценка качества"
    ];

    const rows = dataToExport.map(r => [
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
      r.status,
      r.healthScore?.toString() || ""
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hlr-results-${currentBatchId}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Результаты успешно экспортированы");
  };

  // Export results to XLSX (Excel)
  const handleExportXLSX = async () => {
    if (!resultsData || resultsData.length === 0) {
      toast.error(t.home.noResultsToExport || "Нет результатов для экспорта");
      return;
    }

    // Apply export filter
    let dataToExport = resultsData;
    if (exportFilter === "valid") {
      dataToExport = resultsData.filter(r => r.validNumber === "valid");
    } else if (exportFilter === "invalid") {
      dataToExport = resultsData.filter(r => r.validNumber !== "valid");
    }

    if (dataToExport.length === 0) {
      toast.error(t.home.noResultsToExport || "Нет результатов для экспорта");
      return;
    }

    try {
      // Dynamically import xlsx library
      const XLSX = await import('xlsx');
      
      const headers = [
        t.home.phoneNumber || "Номер телефона",
        t.home.internationalFormat || "Международный формат",
        t.home.validity || "Валидность",
        t.home.reachability || "Достижимость",
        t.home.country || "Страна",
        t.home.countryCode || "Код страны",
        t.home.currentOperator || "Текущий оператор",
        t.home.networkType || "Тип сети",
        t.home.originalOperator || "Оригинальный оператор",
        t.home.ported || "Портирован",
        t.home.roaming || "Роуминг",
        t.home.status || "Статус",
        t.home.healthScore || "Оценка качества"
      ];

      const rows = dataToExport.map(r => ([
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
        r.status,
        r.healthScore ?? ""
      ]));

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "HLR Results");
      
      // Auto-width columns
      const colWidths = headers.map((h, i) => {
        const maxLen = Math.max(h.length, ...rows.map(r => String(r[i] || "").length));
        return { wch: Math.min(maxLen + 2, 40) };
      });
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `hlr-results-${currentBatchId}-${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(t.home.exportSuccess || "Результаты успешно экспортированы");
    } catch (error) {
      console.error("XLSX export error:", error);
      toast.error(t.home.exportError || "Ошибка при экспорте в Excel");
    }
  };

  // Get unique values for filters
  const filterOptions = useMemo(() => {
    if (!resultsData || resultsData.length === 0) return { countries: [] as string[], operators: [] as string[] };
    
    const countries = Array.from(new Set(resultsData.map(r => r.countryName).filter((x): x is string => Boolean(x))));
    const operators = Array.from(new Set(resultsData.map(r => r.currentCarrierName).filter((x): x is string => Boolean(x))));
    
    return { countries, operators };
  }, [resultsData]);

  // Filter and sort results
  const filteredResults = useMemo(() => {
    if (!resultsData || resultsData.length === 0) return [];
    
    let filtered = [...resultsData];
    
    // Apply filters
    if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.validNumber === statusFilter);
    }
    if (countryFilter !== "all") {
      filtered = filtered.filter(r => r.countryName === countryFilter);
    }
    if (operatorFilter !== "all") {
      filtered = filtered.filter(r => r.currentCarrierName === operatorFilter);
    }
    // Health Score filter
    if (healthFilter !== "all") {
      filtered = filtered.filter(r => {
        const score = r.healthScore || 0;
        if (healthFilter === "high") return score >= 80;
        if (healthFilter === "normal") return score >= 50 && score < 80;
        if (healthFilter === "low") return score < 50;
        return true;
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[sortField] || "";
      const bVal = b[sortField] || "";
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  }, [resultsData, statusFilter, countryFilter, operatorFilter, healthFilter, sortField, sortDirection]);

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get status badge
  const getStatusBadge = (validNumber: string | null) => {
    switch (validNumber) {
      case "valid":
        return <Badge className="bg-success text-success-foreground"><CheckCircle2 className="w-3 h-3 mr-1" />{t.home.statusValid}</Badge>;
      case "invalid":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t.home.statusInvalid}</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />{t.home.statusUnknown}</Badge>;
    }
  };

  const phoneCount = parsePhoneNumbers(phoneInput).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">DataCheck Pro</h1>
          <h2 className="sr-only">Сервис проверки телефонных номеров</h2>
        </div>

        {/* Incomplete Batches Warning */}
        {incompleteBatchesQuery.data && incompleteBatchesQuery.data.length > 0 && (
          <div className="p-4 rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  {t.home.incompleteBatches || "У вас есть незавершенные проверки"}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {t.home.incompleteBatchesDesc || "Некоторые проверки были прерваны. Результаты сохранены, но проверка не завершена."}
                </p>
                <div className="mt-3 space-y-2">
                  {incompleteBatchesQuery.data.map((batch) => (
                    <div key={batch.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded border">
                      <div>
                        <span className="font-medium">{batch.name || `Проверка #${batch.id}`}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({batch.processedNumbers || 0}/{batch.totalNumbers} {t.home.processed || "обработано"})
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCurrentBatchId(batch.id);
                            toast.info(t.home.viewingIncomplete || "Просмотр сохраненных результатов");
                          }}
                        >
                          {t.view || "Просмотр"}
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          disabled={resumingBatchId === batch.id}
                          onClick={() => handleResumeBatch(batch.id)}
                        >
                          {resumingBatchId === batch.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              {t.home.resuming || "Возобновление..."}
                            </>
                          ) : (
                            t.home.resume || "Возобновить"
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Balance Card - Admin Only */}
        {/* User Limits Card with Progress Bars */}
        {userStatsQuery.data && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                {t.home.usageLimits || "Лимиты использования"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Daily Limit */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{t.home.dailyUsage || "Сегодня"}</span>
                  <span className="text-sm text-muted-foreground">
                    {userStatsQuery.data.checksToday}
                    {(userStatsQuery.data.limits.dailyLimit ?? 0) > 0 
                      ? ` / ${userStatsQuery.data.limits.dailyLimit}`
                      : ` (${t.home.unlimited || "без лимита"})`
                    }
                  </span>
                </div>
                {(userStatsQuery.data.limits.dailyLimit ?? 0) > 0 ? (
                  <>
                    <Progress 
                      value={(userStatsQuery.data.checksToday / (userStatsQuery.data.limits.dailyLimit ?? 1)) * 100} 
                      className={`h-2 ${userStatsQuery.data.checksToday >= (userStatsQuery.data.limits.dailyLimit ?? 0) ? '[&>div]:bg-red-500' : ''}`}
                    />
                    {userStatsQuery.data.checksToday >= (userStatsQuery.data.limits.dailyLimit ?? 0) && (
                      <div className="flex items-center gap-2 text-red-500 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {t.home.dailyLimitReached || "Дневной лимит исчерпан"}
                      </div>
                    )}
                  </>
                ) : (
                  <Progress value={0} className="h-2 [&>div]:bg-green-500" />
                )}
              </div>

              {/* Weekly Limit */}
              {(userStatsQuery.data.limits.weeklyLimit ?? 0) > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t.home.weeklyUsage || "На этой неделе"}</span>
                    <span className="text-sm text-muted-foreground">
                      {userStatsQuery.data.checksThisWeek} / {userStatsQuery.data.limits.weeklyLimit}
                    </span>
                  </div>
                  <Progress 
                    value={(userStatsQuery.data.checksThisWeek / (userStatsQuery.data.limits.weeklyLimit ?? 1)) * 100} 
                    className={`h-2 ${userStatsQuery.data.checksThisWeek >= (userStatsQuery.data.limits.weeklyLimit ?? 0) ? '[&>div]:bg-red-500' : ''}`}
                  />
                  {userStatsQuery.data.checksThisWeek >= (userStatsQuery.data.limits.weeklyLimit ?? 0) && (
                    <div className="flex items-center gap-2 text-red-500 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {t.home.weeklyLimitReached || "Недельный лимит исчерпан"}
                    </div>
                  )}
                </div>
              )}

              {/* Monthly Limit */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{t.home.monthlyUsage || "В этом месяце"}</span>
                  <span className="text-sm text-muted-foreground">
                    {userStatsQuery.data.checksThisMonth}
                    {(userStatsQuery.data.limits.monthlyLimit ?? 0) > 0 
                      ? ` / ${userStatsQuery.data.limits.monthlyLimit}`
                      : ` (${t.home.unlimited || "без лимита"})`
                    }
                  </span>
                </div>
                {(userStatsQuery.data.limits.monthlyLimit ?? 0) > 0 ? (
                  <>
                    <Progress 
                      value={(userStatsQuery.data.checksThisMonth / (userStatsQuery.data.limits.monthlyLimit ?? 1)) * 100} 
                      className={`h-2 ${userStatsQuery.data.checksThisMonth >= (userStatsQuery.data.limits.monthlyLimit ?? 0) ? '[&>div]:bg-red-500' : ''}`}
                    />
                    {userStatsQuery.data.checksThisMonth >= (userStatsQuery.data.limits.monthlyLimit ?? 0) && (
                      <div className="flex items-center gap-2 text-red-500 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {t.home.monthlyLimitReached || "Месячный лимит исчерпан"}
                      </div>
                    )}
                  </>
                ) : (
                  <Progress value={0} className="h-2 [&>div]:bg-green-500" />
                )}
              </div>

              {/* Batch Limit Info */}
              {(userStatsQuery.data.limits.batchLimit ?? 0) > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t.home.batchLimit || "Макс. номеров в партии"}</span>
                    <span className="font-medium">{userStatsQuery.data.limits.batchLimit}</span>
                  </div>
                </div>
              )}


            </CardContent>
          </Card>
        )}

        {/* Single Phone Check */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              {t.home.quickCheck}
            </CardTitle>
            <CardDescription>
              {t.home.quickCheckDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="+1234567890"
                value={singlePhone}
                onChange={(e) => setSinglePhone(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={async () => {
                  if (!singlePhone.trim()) {
                    toast.error("Введите номер телефона");
                    return;
                  }
                  setIsSingleChecking(true);
                  try {
                    const result = await singleCheckMutation.mutateAsync({ phoneNumber: singlePhone.trim() });
                    setSingleResult(result);
                    if (result.success) {
                      toast.success("Номер успешно проверен");
                    } else {
                      toast.error(result.error || "Ошибка проверки");
                    }
                  } catch (error: any) {
                    toast.error(error.message || "Не удалось проверить номер");
                  } finally {
                    setIsSingleChecking(false);
                  }
                }}
                disabled={isSingleChecking || !singlePhone.trim()}
              >
                {isSingleChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            
            {singleResult && (
              <div className="mt-4 p-4 rounded-lg border bg-muted/50">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">{t.home.phoneNumber}:</span> {singleResult.phoneNumber}</div>
                  <div><span className="text-muted-foreground">{t.home.status}:</span> {singleResult.isValid ? <Badge className="bg-success">{t.home.statusValid}</Badge> : <Badge variant="destructive">{t.home.statusInvalid}</Badge>}</div>
                  {singleResult.internationalFormat && <div><span className="text-muted-foreground">{t.home.international}:</span> {singleResult.internationalFormat}</div>}
                  {singleResult.countryName && <div><span className="text-muted-foreground">{t.home.country}:</span> {singleResult.countryName}</div>}
                  {singleResult.currentCarrier && <div><span className="text-muted-foreground">{t.home.carrier}:</span> {singleResult.currentCarrier}</div>}
                  {singleResult.networkType && <div><span className="text-muted-foreground">{t.home.network}:</span> {singleResult.networkType}</div>}
                  <div><span className="text-muted-foreground">{t.home.roaming}:</span> {singleResult.isRoaming ? t.yes : t.no}</div>
                  <div><span className="text-muted-foreground">{t.home.ported}:</span> {singleResult.isPorted ? t.yes : t.no}</div>
                  {singleResult.healthScore !== undefined && (
                    <div className="col-span-2 mt-2 pt-2 border-t">
                      <span className="text-muted-foreground mr-2">{t.home.healthScore}:</span>
                      <HealthScoreBadge score={singleResult.healthScore} showLabel />
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                {t.home.phoneNumbers}
              </CardTitle>
              <CardDescription>
                {t.home.phoneNumbersDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="batchName">{t.home.batchName}</Label>
                <Input
                  id="batchName"
                  placeholder={t.home.batchNamePlaceholder}
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                />
              </div>

              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">{t.home.textInput}</TabsTrigger>
                  <TabsTrigger value="file">{t.home.fileUpload}</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phones">{t.home.phoneNumbers}</Label>
                    <Textarea
                      id="phones"
                      placeholder="+49176123456&#10;+44789012345&#10;+33612345678"
                      className="min-h-[200px] font-mono text-sm"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {phoneCount} {t.home.numbersDetected}
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="file" className="space-y-4">
                  <FileDropZone
                    onFileLoaded={(numbers, fileName) => {
                      if (numbers.length === 0) {
                        toast.error(t.home.noNumbersInFile || "Файл не содержит номеров");
                        return;
                      }
                      setPhoneInput(numbers.join("\n"));
                      toast.success(`${t.home.loaded || "Загружено"} ${numbers.length} ${t.home.numbersLoaded || "номеров из файла"}`);
                    }}
                    disabled={isProcessing}
                  />
                  {phoneInput && (
                    <p className="text-sm text-muted-foreground">
                      {phoneCount} {t.home.numbersLoaded}
                    </p>
                  )}
                </TabsContent>
              </Tabs>

              {/* Cost Calculator */}
              {phoneCount > 0 && (
                <CostCalculator 
                  phoneNumbers={parsePhoneNumbers(phoneInput)}
                  onRemoveDuplicates={() => {
                    const nums = parsePhoneNumbers(phoneInput);
                    const unique = Array.from(new Set(nums));
                    setPhoneInput(unique.join("\n"));
                    toast.success(t.cost.duplicatesRemoved);
                  }}
                />
              )}

              <Button 
                onClick={handleStartCheck} 
                disabled={isProcessing || phoneCount === 0}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.home.processing}
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    {t.home.checkNumbers} {phoneCount}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>


        </div>

        {/* Results Section */}
        {currentBatchId && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-3">
                    {t.home.results}
                    {/* Show batch owner if admin viewing another user's batch */}
                    {batchQuery.data?.batchOwner && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-md border border-primary/20 text-sm font-normal">
                        <UserIcon className="h-4 w-4 text-primary" />
                        <span>Владелец: {batchQuery.data.batchOwner.name || batchQuery.data.batchOwner.username}</span>
                      </div>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {filteredResults.length} {t.home.resultsOf} {resultsQuery.data?.total || resultsData.length}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={exportFilter} onValueChange={setExportFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder={t.home.exportFilter || "Экспорт"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.home.exportAll || "Все номера"}</SelectItem>
                      <SelectItem value="valid">{t.home.exportValidOnly || "Только валидные"}</SelectItem>
                      <SelectItem value="invalid">{t.home.exportInvalidOnly || "Только невалидные"}</SelectItem>
                    </SelectContent>
                  </Select>
                  <ExportTemplatesDialog onSelectTemplate={(fields) => {
                    // Store selected fields for export
                    console.log("Selected fields:", fields);
                    toast.info(`Шаблон с ${fields.length} полями выбран`);
                  }} />
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    {t.home.exportCSV}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportXLSX}>
                    <Download className="h-4 w-4 mr-2" />
                    {t.home.exportXLSX || "Excel"}
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder={t.home.status} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.home.allStatus}</SelectItem>
                      <SelectItem value="valid">{t.home.statusValid}</SelectItem>
                      <SelectItem value="invalid">{t.home.statusInvalid}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder={t.home.country} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.home.allCountries}</SelectItem>
                    {filterOptions.countries.map((country) => (
                      <SelectItem key={country} value={country!}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={operatorFilter} onValueChange={setOperatorFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={t.home.operator} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.home.allOperators}</SelectItem>
                    {filterOptions.operators.map((op) => (
                      <SelectItem key={op} value={op!}>{op}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={healthFilter} onValueChange={setHealthFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder={t.home.health} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все оценки</SelectItem>
                    <SelectItem value="high">Высокая (80+)</SelectItem>
                    <SelectItem value="normal">Нормальная (50-79)</SelectItem>
                    <SelectItem value="low">Низкая (&lt;50)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {resultsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleSort("phoneNumber")}
                        >
                          <div className="flex items-center gap-1">
                            {t.home.phoneNumber}
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleSort("validNumber")}
                        >
                          <div className="flex items-center gap-1">
                            {t.home.status}
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead>{t.home.reachable}</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleSort("currentCarrierName")}
                        >
                          <div className="flex items-center gap-1">
                            {t.home.operator}
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleSort("countryName")}
                        >
                          <div className="flex items-center gap-1">
                            {t.home.country}
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleSort("roaming")}
                        >
                          <div className="flex items-center gap-1">
                            {t.home.roaming}
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleSort("ported")}
                        >
                          <div className="flex items-center gap-1">
                            {t.home.ported}
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleSort("healthScore")}
                        >
                          <div className="flex items-center gap-1">
                            {t.home.health}
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            {t.home.noResultsMatch}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredResults.map((result) => (
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
                              <div>
                                <p className="font-medium">{result.currentCarrierName || "-"}</p>
                                <p className="text-xs text-muted-foreground">{result.currentNetworkType || ""}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{result.countryCode}</span>
                                <span className="text-muted-foreground">{result.countryName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={result.roaming === "not_roaming" ? "secondary" : "outline"}>
                                {result.roaming?.replace(/_/g, " ") || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={result.ported?.includes("ported") ? "outline" : "secondary"}>
                                {result.ported?.replace(/_/g, " ") || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <HealthScoreBadge score={result.healthScore || 0} size="sm" />
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
        )}
      </div>
    </DashboardLayout>
  );
}
