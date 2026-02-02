import { useState, useEffect } from "react";
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
  ArrowLeft
} from "lucide-react";
import FileDropZone from "@/components/FileDropZone";
import { useSearch, useLocation } from "wouter";
import * as XLSX from "xlsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [activeTab, setActiveTab] = useState("single");

  // Handle batch parameter from URL (from History page)
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const batchParam = params.get('batch');
    if (batchParam) {
      const batchId = parseInt(batchParam, 10);
      if (!isNaN(batchId) && batchId > 0) {
        setCurrentBatchId(batchId);
        setActiveTab("results");
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

    if (!batchName.trim()) {
      toast.error(t.email?.enterBatchName || "Enter batch name");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    startBatchMutation.mutate({
      name: batchName.trim(),
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
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>{t.email?.result || "Status"}</TableHead>
                          <TableHead>{t.email?.result || "Result"}</TableHead>
                          <TableHead>{t.email?.subresult || "Subresult"}</TableHead>
                          <TableHead>{t.email?.freeProvider || "Free"}</TableHead>
                          <TableHead>{t.email?.roleEmail || "Role"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchQuery.data.results.map((result: any) => (
                          <TableRow key={result.id}>
                            <TableCell className="font-mono">{result.email}</TableCell>
                            <TableCell>{getStatusBadge(result.status)}</TableCell>
                            <TableCell>{result.result}</TableCell>
                            <TableCell>{result.subresult || "—"}</TableCell>
                            <TableCell>{result.isFree ? "✓" : "—"}</TableCell>
                            <TableCell>{result.isRole ? "✓" : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
            <Card>
              <CardHeader>
                <CardTitle>{t.email?.batchVerification || "Batch Verification"}</CardTitle>
                <CardDescription>
                  {t.email?.uploadOrPaste || "Upload a file or paste email addresses"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder={t.email?.batchName || "Batch name"}
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                />

                <FileDropZone
                  onFileLoaded={(emails, fileName) => {
                    setBatchEmails(emails.join("\n"));
                    if (!batchName) setBatchName(fileName.replace(/\.[^/.]+$/, ""));
                  }}
                  disabled={isProcessing}
                />

                <div className="relative">
                  <Textarea
                    placeholder={t.email?.pasteEmails || "Paste emails here (one per line, or comma/semicolon separated)"}
                    value={batchEmails}
                    onChange={(e) => setBatchEmails(e.target.value)}
                    rows={8}
                    disabled={isProcessing}
                  />
                  {batchEmails && (
                    <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                      {batchEmails.split(/[\n,;]/).filter((e) => e.trim()).length} {t.email?.emails || "emails"}
                    </div>
                  )}
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={progress} />
                    <p className="text-sm text-center text-muted-foreground">
                      {t.email?.processing || "Processing..."}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleBatchStart}
                  disabled={isProcessing || !batchEmails.trim() || !batchName.trim()}
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
