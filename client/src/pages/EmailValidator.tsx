import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Mail, Search, FileSpreadsheet, Trash2, Download, CheckCircle, XCircle, AlertTriangle, HelpCircle, Loader2, Upload } from "lucide-react";
import FileDropZone from "@/components/FileDropZone";
import * as XLSX from "xlsx";

export default function EmailValidator() {
  const { t } = useLanguage();
  const utils = trpc.useUtils();

  // Single email check
  const [singleEmail, setSingleEmail] = useState("");
  const [singleResult, setSingleResult] = useState<any>(null);

  // Batch check
  const [batchName, setBatchName] = useState("");
  const [batchEmails, setBatchEmails] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Batches list
  const batchesQuery = trpc.email.listBatches.useQuery();

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
        <Tabs defaultValue="single" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="single">
              {t.email?.singleCheck || "Single Check"}
            </TabsTrigger>
            <TabsTrigger value="batch">
              {t.email?.batchCheck || "Batch Check"}
            </TabsTrigger>
            <TabsTrigger value="history">
              {t.email?.history || "History"}
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

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t.email?.verificationHistory || "Verification History"}</CardTitle>
              </CardHeader>
              <CardContent>
                {batchesQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : batchesQuery.data?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t.email?.noBatches || "No batches yet"}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {batchesQuery.data?.map((batch) => (
                      <Card key={batch.id} className="bg-card/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{batch.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {new Date(batch.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>{batch.validEmails}</span>
                                <XCircle className="h-4 w-4 text-red-500 ml-2" />
                                <span>{batch.invalidEmails}</span>
                                <AlertTriangle className="h-4 w-4 text-yellow-500 ml-2" />
                                <span>{batch.riskyEmails}</span>
                              </div>
                              <Badge variant={batch.status === "completed" ? "default" : "secondary"}>
                                {batch.status}
                              </Badge>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => exportMutation.mutate({ batchId: batch.id })}
                                  disabled={exportMutation.isPending}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteBatchMutation.mutate({ batchId: batch.id })}
                                  disabled={deleteBatchMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          {batch.status === "processing" && (
                            <Progress
                              value={(batch.processedEmails / batch.totalEmails) * 100}
                              className="mt-2"
                            />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
