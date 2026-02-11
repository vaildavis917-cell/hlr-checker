import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Mail, 
  Search, 
  FileSpreadsheet, 
  Trash2, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  Loader2, 
  Upload,
  User as UserIcon,
  ArrowLeft,
  ArrowUpDown
} from "lucide-react";
import FileDropZone from "@/components/FileDropZone";
import { useSearch, useLocation } from "wouter";
import { useBatchProgress } from "@/hooks/useWebSocket";
import * as XLSX from "xlsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import StickyScrollbar from "@/components/StickyScrollbar";

export default function EmailValidator() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";

  // Single email check
  const [singleEmail, setSingleEmail] = useState("");
  const [singleResult, setSingleResult] = useState<any>(null);

  // Batch check
  const [batchName, setBatchName] = useState("");
  const [batchEmails, setBatchEmails] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Current batch ID from URL
  const [currentBatchId, setCurrentBatchId] = useState<number | null>(null);
  
  // WebSocket for real-time batch progress
  const batchProgress = useBatchProgress(isProcessing ? currentBatchId : null, user?.id);
  const [activeTab, setActiveTab] = useState("single");
  const [resumeBatchId, setResumeBatchId] = useState<number | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  // Export dialog state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportBatchId, setExportBatchId] = useState<number | null>(null);
  const [selectedExportFields, setSelectedExportFields] = useState<string[]>(["email", "quality", "result"]);

  // Sorting state for results table
  type SortField = "email" | "quality" | "result" | "subresult" | "isFree" | "isRole";
  type SortDirection = "asc" | "desc";
  const [sortField, setSortField] = useState<SortField>("email");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Handle batch/resume parameter from URL (from History page)
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const batchParam = params.get('batch');
    const resumeParam = params.get('resume');
    
    if (batchParam) {
      const batchId = parseInt(batchParam, 10);
      if (!isNaN(batchId) && batchId > 0) {
        setCurrentBatchId(batchId);
        setActiveTab("results");
      }
    } else if (resumeParam) {
      const batchId = parseInt(resumeParam, 10);
      if (!isNaN(batchId) && batchId > 0) {
        setResumeBatchId(batchId);
        setActiveTab("batch");
      }
    }
  }, [searchString]);

  // Batches list
  const batchesQuery = trpc.email.listBatches.useQuery();
  
  // Get batch results when viewing from history
  const batchQuery = trpc.email.getBatch.useQuery(
    { batchId: currentBatchId! },
    { enabled: currentBatchId !== null }
  );

  // Mutations
  const checkSingleMutation = trpc.email.checkSingle.useMutation({
    onSuccess: (data) => {
      setSingleResult(data);
      utils.email.getBalance.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const startBatchMutation = trpc.email.startBatch.useMutation({
    onSuccess: (data) => {
      toast.success(t.email?.batchCompleted || `Batch completed: ${data.valid} valid, ${data.invalid} invalid`);
      utils.email.listBatches.invalidate();
      utils.email.getBalance.invalidate();
      setBatchEmails("");
      setBatchName("");
      setIsProcessing(false);
      setProgress(100);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsProcessing(false);
    },
  });

  const deleteBatchMutation = trpc.email.deleteBatch.useMutation({
    onSuccess: () => {
      toast.success(t.delete || "Deleted");
      utils.email.listBatches.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Resume batch mutation
  const resumeBatchMutation = trpc.email.resumeBatch.useMutation({
    onSuccess: (data) => {
      const resumeMsg = language === "ru" 
        ? `Батч возобновлен: ${data.resumed} обработано`
        : language === "uk"
        ? `Батч відновлено: ${data.resumed} оброблено`
        : `Batch resumed: ${data.resumed} processed`;
      toast.success(resumeMsg);
      utils.email.listBatches.invalidate();
      setIsResuming(false);
      setResumeBatchId(null);
      setBatchEmails("");
      setLocation("/email-history");
    },
    onError: (error) => {
      toast.error(error.message);
      setIsResuming(false);
    },
  });

  // Get batch info for resume
  const resumeBatchQuery = trpc.email.getBatch.useQuery(
    { batchId: resumeBatchId! },
    { enabled: resumeBatchId !== null }
  );

  // Get available export fields
  const exportFieldsQuery = trpc.email.getExportFields.useQuery();

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
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Export with custom fields mutation
  const exportWithFieldsMutation = trpc.email.exportWithFields.useMutation({
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
      setIsExportDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSingleCheck = () => {
    if (!singleEmail.trim()) return;
    checkSingleMutation.mutate({ email: singleEmail.trim() });
  };

  const handleBatchStart = () => {
    const emails = batchEmails
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      toast.error(t.email?.noEmails || "No emails provided");
      return;
    }

    // Auto-generate name if not provided
    const finalName = batchName.trim() || "";

    setIsProcessing(true);
    setProgress(0);
    startBatchMutation.mutate({
      name: finalName,
      emails,
    });
  };

  const handleResume = () => {
    if (!resumeBatchId) return;
    
    const emails = batchEmails
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      toast.error(t.email?.noEmails || "No emails provided");
      return;
    }

    setIsResuming(true);
    resumeBatchMutation.mutate({
      batchId: resumeBatchId,
      emails,
    });
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;

      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
        const emails = jsonData
          .flat()
          .filter((cell) => typeof cell === "string" && cell.includes("@"))
          .join("\n");
        setBatchEmails(emails);
        if (!batchName) setBatchName(file.name.replace(/\.[^/.]+$/, ""));
      } else {
        const text = data as string;
        setBatchEmails(text);
        if (!batchName) setBatchName(file.name.replace(/\.[^/.]+$/, ""));
      }
    };

    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort results
  const sortedResults = useMemo(() => {
    if (!batchQuery.data?.results) return [];
    return [...batchQuery.data.results].sort((a: any, b: any) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      // Handle boolean fields
      if (sortField === "isFree" || sortField === "isRole") {
        aVal = aVal ? 1 : 0;
        bVal = bVal ? 1 : 0;
      }
      
      // Handle null/undefined
      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";
      
      // String comparison
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      // Number comparison
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [batchQuery.data?.results, sortField, sortDirection]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "invalid":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "risky":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <HelpCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">{t.email?.valid || "Valid"}</Badge>;
      case "invalid":
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">{t.email?.invalid || "Invalid"}</Badge>;
      case "risky":
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">{t.email?.risky || "Risky"}</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-500 border-gray-500/30">{t.email?.unknown || "Unknown"}</Badge>;
    }
  };

  const getContent = () => {
    if (language === "ru") {
      return {
        viewingBatch: "Просмотр результатов",
        owner: "Владелец",
        backToHistory: "Назад к истории",
        results: "Результаты",
      };
    } else if (language === "uk") {
      return {
        viewingBatch: "Перегляд результатів",
        owner: "Власник",
        backToHistory: "Назад до історії",
        results: "Результати",
      };
    }
    return {
      viewingBatch: "Viewing results",
      owner: "Owner",
      backToHistory: "Back to history",
      results: "Results",
    };
  };

  const content = getContent();

  // If viewing a specific batch from history
  if (currentBatchId && activeTab === "results") {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header with back button */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCurrentBatchId(null);
                setActiveTab("single");
                setLocation("/email-history");
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {content.backToHistory}
            </Button>
          </div>

          {/* Batch info card */}
          {batchQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : batchQuery.data ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-blue-500" />
                        {batchQuery.data.batch.name}
                      </CardTitle>
                      <CardDescription>
                        {new Date(batchQuery.data.batch.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Show batch owner if admin viewing another user's batch */}
                      {batchQuery.data.batchOwner && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md border border-primary/20">
                          <UserIcon className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">
                            {content.owner}: {batchQuery.data.batchOwner.name || batchQuery.data.batchOwner.username}
                          </span>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportMutation.mutate({ batchId: currentBatchId })}
                        disabled={exportMutation.isPending}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{batchQuery.data.batch.totalEmails}</div>
                      <div className="text-sm text-muted-foreground">{"Total"}</div>
                    </div>
                    <div className="p-4 bg-green-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-green-500">{batchQuery.data.batch.validEmails}</div>
                      <div className="text-sm text-muted-foreground">{t.email?.valid || "Valid"}</div>
                    </div>
                    <div className="p-4 bg-red-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-red-500">{batchQuery.data.batch.invalidEmails}</div>
                      <div className="text-sm text-muted-foreground">{t.email?.invalid || "Invalid"}</div>
                    </div>
                    <div className="p-4 bg-yellow-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-500">{batchQuery.data.batch.riskyEmails}</div>
                      <div className="text-sm text-muted-foreground">{t.email?.risky || "Risky"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Results table */}
              <Card>
                <CardHeader>
                  <CardTitle>{content.results}</CardTitle>
                  <CardDescription>
                    {batchQuery.data.results.length} {t.email?.emails || "emails"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StickyScrollbar className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2" onClick={() => handleSort("email")}>
                              Email
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2" onClick={() => handleSort("quality")}>
                              {t.email?.result || "Status"}
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2" onClick={() => handleSort("result")}>
                              {t.email?.result || "Result"}
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2" onClick={() => handleSort("subresult")}>
                              {t.email?.subresult || "Subresult"}
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2" onClick={() => handleSort("isFree")}>
                              {t.email?.freeProvider || "Free"}
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2" onClick={() => handleSort("isRole")}>
                              {t.email?.roleEmail || "Role"}
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            </Button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedResults.map((result: any) => (
                          <TableRow key={result.id}>
                            <TableCell className="font-mono">{result.email}</TableCell>
                            <TableCell>{getStatusBadge(result.quality)}</TableCell>
                            <TableCell>{result.result}</TableCell>
                            <TableCell>{result.subresult || "—"}</TableCell>
                            <TableCell>{result.isFree ? "✓" : "—"}</TableCell>
                            <TableCell>{result.isRole ? "✓" : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </StickyScrollbar>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t.email?.noBatches || "Batch not found"}
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-500" />
            {t.email?.title || "Email Validator"}
          </h1>
          <p className="text-muted-foreground">
            {t.email?.description || "Verify email addresses for deliverability"}
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="single">
              {t.email?.singleCheck || "Single Check"}
            </TabsTrigger>
            <TabsTrigger value="batch">
              {t.email?.batchCheck || "Batch Check"}
            </TabsTrigger>
          </TabsList>

          {/* Single Check Tab */}
          <TabsContent value="single" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t.email?.checkSingleEmail || "Check Single Email"}</CardTitle>
                <CardDescription>
                  {t.email?.enterEmailToVerify || "Enter an email address to verify its deliverability"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="example@domain.com"
                    value={singleEmail}
                    onChange={(e) => setSingleEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSingleCheck()}
                  />
                  <Button
                    onClick={handleSingleCheck}
                    disabled={checkSingleMutation.isPending || !singleEmail.trim()}
                  >
                    {checkSingleMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="ml-2">{t.email?.verify || "Verify"}</span>
                  </Button>
                </div>

                {singleResult && (
                  <Card className="bg-card/50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{singleResult.email}</span>
                        {getStatusBadge(singleResult.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">{t.email?.result || "Result"}:</span>{" "}
                          <span className="font-medium">{singleResult.result}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t.email?.subresult || "Subresult"}:</span>{" "}
                          <span className="font-medium">{singleResult.subresult || "-"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t.email?.freeProvider || "Free Provider"}:</span>{" "}
                          <span className="font-medium">{singleResult.isFree ? t.yes || "Yes" : t.no || "No"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t.email?.roleEmail || "Role Email"}:</span>{" "}
                          <span className="font-medium">{singleResult.isRole ? t.yes || "Yes" : t.no || "No"}</span>
                        </div>
                        {singleResult.didYouMean && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">{t.email?.didYouMean || "Did you mean"}:</span>{" "}
                            <span className="font-medium text-blue-500">{singleResult.didYouMean}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Batch Check Tab */}
          <TabsContent value="batch" className="space-y-4">
            {/* Resume mode banner */}
            {resumeBatchId && resumeBatchQuery.data && (
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    {language === "ru" ? "Возобновление проверки" : language === "uk" ? "Відновлення перевірки" : "Resume Check"}
                  </CardTitle>
                  <CardDescription>
                    {language === "ru" 
                      ? `Батч: ${resumeBatchQuery.data.batch.name} • Обработано: ${resumeBatchQuery.data.batch.processedEmails}/${resumeBatchQuery.data.batch.totalEmails}`
                      : language === "uk"
                      ? `Батч: ${resumeBatchQuery.data.batch.name} • Оброблено: ${resumeBatchQuery.data.batch.processedEmails}/${resumeBatchQuery.data.batch.totalEmails}`
                      : `Batch: ${resumeBatchQuery.data.batch.name} • Processed: ${resumeBatchQuery.data.batch.processedEmails}/${resumeBatchQuery.data.batch.totalEmails}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-primary border-primary">
                      {language === "ru" ? "Валидных" : language === "uk" ? "Валідних" : "Valid"}: {resumeBatchQuery.data.batch.validEmails}
                    </Badge>
                    <Badge variant="outline" className="text-destructive border-destructive">
                      {language === "ru" ? "Невалидных" : language === "uk" ? "Невалідних" : "Invalid"}: {resumeBatchQuery.data.batch.invalidEmails}
                    </Badge>
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                      {language === "ru" ? "Рискованных" : language === "uk" ? "Ризикованих" : "Risky"}: {resumeBatchQuery.data.batch.riskyEmails}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {language === "ru" 
                      ? "Загрузите исходный файл с email адресами для продолжения проверки. Уже обработанные адреса будут пропущены."
                      : language === "uk"
                      ? "Завантажте вихідний файл з email адресами для продовження перевірки. Вже оброблені адреси будуть пропущені."
                      : "Upload the original file with email addresses to continue verification. Already processed addresses will be skipped."}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setResumeBatchId(null);
                      setBatchEmails("");
                      setLocation("/email");
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    {language === "ru" ? "Отменить" : language === "uk" ? "Скасувати" : "Cancel"}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>
                  {resumeBatchId 
                    ? (language === "ru" ? "Загрузите файл для возобновления" : language === "uk" ? "Завантажте файл для відновлення" : "Upload File to Resume")
                    : (t.email?.batchVerification || "Batch Verification")}
                </CardTitle>
                <CardDescription>
                  {resumeBatchId
                    ? (language === "ru" ? "Загрузите исходный файл с всеми email адресами" : language === "uk" ? "Завантажте вихідний файл з усіма email адресами" : "Upload the original file with all email addresses")
                    : (t.email?.uploadOrPaste || "Upload a file or paste email addresses")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!resumeBatchId && (
                  <Input
                    placeholder={t.email?.batchName || "Batch name"}
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                  />
                )}

                <FileDropZone
                  onFileLoaded={(emails, fileName) => {
                    setBatchEmails(emails.join("\n"));
                    if (!batchName && !resumeBatchId) setBatchName(fileName.replace(/\.[^/.]+$/, ""));
                  }}
                  disabled={isProcessing || isResuming}
                />

                <div className="relative">
                  <Textarea
                    placeholder={t.email?.pasteEmails || "Paste emails here (one per line, or comma/semicolon separated)"}
                    value={batchEmails}
                    onChange={(e) => setBatchEmails(e.target.value)}
                    rows={8}
                    disabled={isProcessing || isResuming}
                  />
                  {batchEmails && (
                    <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                      {batchEmails.split(/[\n,;]/).filter((e) => e.trim()).length} {t.email?.emails || "emails"}
                    </div>
                  )}
                </div>

                {(isProcessing || isResuming) && (
                  <div className="space-y-2">
                    <Progress value={batchProgress?.percentage || progress} />
                    {batchProgress ? (
                      <>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Обработано: {batchProgress.processed} / {batchProgress.total}</span>
                          <span>{batchProgress.percentage}%</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span className="text-green-500">Валидных: {batchProgress.valid || 0}</span>
                          <span className="text-red-500">Невалидных: {batchProgress.invalid || 0}</span>
                        </div>
                        {batchProgress.currentItem && (
                          <p className="text-xs text-muted-foreground truncate">
                            Текущий: {batchProgress.currentItem}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-center text-muted-foreground">
                        {isResuming 
                          ? (language === "ru" ? "Возобновление..." : language === "uk" ? "Відновлення..." : "Resuming...")
                          : (t.email?.processing || "Processing...")}
                      </p>
                    )}
                  </div>
                )}

                {resumeBatchId ? (
                  <Button
                    onClick={handleResume}
                    disabled={isResuming || !batchEmails.trim()}
                    className="w-full"
                  >
                    {isResuming ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {language === "ru" ? "Возобновление..." : language === "uk" ? "Відновлення..." : "Resuming..."}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {language === "ru" ? "Возобновить проверку" : language === "uk" ? "Відновити перевірку" : "Resume Verification"}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleBatchStart}
                    disabled={isProcessing || !batchEmails.trim()}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t.email?.processing || "Processing..."}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {t.email?.startVerification || "Start Verification"}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Export Fields Dialog */}
        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {language === "ru" ? "Выберите поля для экспорта" : language === "uk" ? "Виберіть поля для експорту" : "Select Export Fields"}
              </DialogTitle>
              <DialogDescription>
                {language === "ru" ? "Выберите поля, которые будут включены в экспорт" : language === "uk" ? "Виберіть поля, які будуть включені в експорт" : "Select fields to include in the export"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {exportFieldsQuery.data?.map((field) => (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`export-${field.key}`}
                    checked={selectedExportFields.includes(field.key)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedExportFields([...selectedExportFields, field.key]);
                      } else {
                        setSelectedExportFields(selectedExportFields.filter(f => f !== field.key));
                      }
                    }}
                  />
                  <Label htmlFor={`export-${field.key}`} className="cursor-pointer">
                    {field.label[language as keyof typeof field.label] || field.label.en}
                  </Label>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
                {language === "ru" ? "Отмена" : language === "uk" ? "Скасувати" : "Cancel"}
              </Button>
              <Button
                onClick={() => {
                  if (exportBatchId && selectedExportFields.length > 0) {
                    exportWithFieldsMutation.mutate({
                      batchId: exportBatchId,
                      fields: selectedExportFields,
                    });
                  }
                }}
                disabled={selectedExportFields.length === 0 || exportWithFieldsMutation.isPending}
              >
                {exportWithFieldsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {language === "ru" ? "Экспорт" : language === "uk" ? "Експорт" : "Export"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
