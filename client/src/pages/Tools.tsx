import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Trash2, FileText, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

// Translations for Tools page
const translations = {
  ru: {
    title: "Инструменты",
    description: "Очистка и подготовка списков номеров без использования API",
    inputTitle: "Исходные номера",
    inputDescription: "Вставьте номера через запятую, точку с запятой или с новой строки",
    inputPlaceholder: "+49176123456\n+44789012345\n+33612345678",
    inputCount: (count: number) => `${count} номеров введено`,
    outputTitle: "Результат",
    outputDescription: "Очищенные и уникальные номера",
    outputPlaceholder: "Результат появится здесь",
    outputCount: (count: number) => `${count} уникальных номеров`,
    clear: "Очистить",
    process: "Обработать",
    copy: "Копировать",
    duplicates: "дубл.",
    invalid: "невалид.",
    processSuccess: (total: number, duplicates: number, invalid: number) => 
      `Обработано: ${total} уникальных, удалено ${duplicates} дублей, ${invalid} невалидных`,
    copied: "Скопировано в буфер обмена",
    statsInput: "Введено",
    statsOutput: "Уникальных",
    statsDuplicates: "Дублей",
    statsInvalid: "Невалидных",
  },
  uk: {
    title: "Інструменти",
    description: "Очищення та підготовка списків номерів без використання API",
    inputTitle: "Вихідні номери",
    inputDescription: "Вставте номери через кому, крапку з комою або з нового рядка",
    inputPlaceholder: "+49176123456\n+44789012345\n+33612345678",
    inputCount: (count: number) => `${count} номерів введено`,
    outputTitle: "Результат",
    outputDescription: "Очищені та унікальні номери",
    outputPlaceholder: "Результат з'явиться тут",
    outputCount: (count: number) => `${count} унікальних номерів`,
    clear: "Очистити",
    process: "Обробити",
    copy: "Копіювати",
    duplicates: "дубл.",
    invalid: "невалід.",
    processSuccess: (total: number, duplicates: number, invalid: number) => 
      `Оброблено: ${total} унікальних, видалено ${duplicates} дублів, ${invalid} невалідних`,
    copied: "Скопійовано в буфер обміну",
    statsInput: "Введено",
    statsOutput: "Унікальних",
    statsDuplicates: "Дублів",
    statsInvalid: "Невалідних",
  },
  en: {
    title: "Tools",
    description: "Clean and prepare phone number lists without using API",
    inputTitle: "Input Numbers",
    inputDescription: "Paste numbers separated by comma, semicolon, or newline",
    inputPlaceholder: "+49176123456\n+44789012345\n+33612345678",
    inputCount: (count: number) => `${count} numbers entered`,
    outputTitle: "Result",
    outputDescription: "Cleaned and unique numbers",
    outputPlaceholder: "Result will appear here",
    outputCount: (count: number) => `${count} unique numbers`,
    clear: "Clear",
    process: "Process",
    copy: "Copy",
    duplicates: "dupl.",
    invalid: "invalid",
    processSuccess: (total: number, duplicates: number, invalid: number) => 
      `Processed: ${total} unique, removed ${duplicates} duplicates, ${invalid} invalid`,
    copied: "Copied to clipboard",
    statsInput: "Input",
    statsOutput: "Unique",
    statsDuplicates: "Duplicates",
    statsInvalid: "Invalid",
  },
};

function getToolsTranslations() {
  const lang = localStorage.getItem("hlr-checker-language") || "ru";
  return translations[lang as keyof typeof translations] || translations.ru;
}

export default function Tools() {
  const t = getToolsTranslations();
  const [inputNumbers, setInputNumbers] = useState("");
  const [processedNumbers, setProcessedNumbers] = useState<string[]>([]);
  const [duplicatesRemoved, setDuplicatesRemoved] = useState(0);
  const [invalidRemoved, setInvalidRemoved] = useState(0);

  // Normalize phone number
  const normalizePhone = (phone: string): string => {
    return phone.replace(/[\s\-\(\)\.]/g, "").trim();
  };

  // Validate phone number format
  const isValidPhone = (phone: string): boolean => {
    const normalized = normalizePhone(phone);
    // Must start with + and have 7-15 digits
    return /^\+?[1-9]\d{6,14}$/.test(normalized);
  };

  // Process numbers - remove duplicates and invalid
  const handleProcess = () => {
    const lines = inputNumbers.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean);
    const seen = new Set<string>();
    const valid: string[] = [];
    let dupes = 0;
    let invalid = 0;

    for (const line of lines) {
      const normalized = normalizePhone(line);
      
      if (!isValidPhone(normalized)) {
        invalid++;
        continue;
      }

      // Add + if missing
      const formatted = normalized.startsWith("+") ? normalized : `+${normalized}`;
      
      if (seen.has(formatted)) {
        dupes++;
        continue;
      }

      seen.add(formatted);
      valid.push(formatted);
    }

    setProcessedNumbers(valid);
    setDuplicatesRemoved(dupes);
    setInvalidRemoved(invalid);
    
    toast.success(t.processSuccess(valid.length, dupes, invalid));
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(processedNumbers.join("\n"));
    toast.success(t.copied);
  };

  // Download as TXT
  const handleDownloadTxt = () => {
    const blob = new Blob([processedNumbers.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cleaned_numbers_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download as CSV
  const handleDownloadCsv = () => {
    const csv = "phone_number\n" + processedNumbers.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cleaned_numbers_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear all
  const handleClear = () => {
    setInputNumbers("");
    setProcessedNumbers([]);
    setDuplicatesRemoved(0);
    setInvalidRemoved(0);
  };

  const stats = useMemo(() => ({
    input: inputNumbers.split(/[\n,;]+/).filter(l => l.trim()).length,
    output: processedNumbers.length,
    duplicates: duplicatesRemoved,
    invalid: invalidRemoved,
  }), [inputNumbers, processedNumbers, duplicatesRemoved, invalidRemoved]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            {t.title}
          </h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input */}
          <Card>
            <CardHeader>
              <CardTitle>{t.inputTitle}</CardTitle>
              <CardDescription>{t.inputDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={inputNumbers}
                onChange={(e) => setInputNumbers(e.target.value)}
                placeholder={t.inputPlaceholder}
                className="min-h-[300px] font-mono text-sm"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t.inputCount(stats.input)}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleClear}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t.clear}
                  </Button>
                  <Button onClick={handleProcess} disabled={!inputNumbers.trim()}>
                    {t.process}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Output */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t.outputTitle}</span>
                {processedNumbers.length > 0 && (
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {stats.output}
                    </Badge>
                    {stats.duplicates > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-yellow-500" />
                        -{stats.duplicates} {t.duplicates}
                      </Badge>
                    )}
                    {stats.invalid > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-red-500" />
                        -{stats.invalid} {t.invalid}
                      </Badge>
                    )}
                  </div>
                )}
              </CardTitle>
              <CardDescription>{t.outputDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={processedNumbers.join("\n")}
                readOnly
                placeholder={t.outputPlaceholder}
                className="min-h-[300px] font-mono text-sm bg-muted/50"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t.outputCount(processedNumbers.length)}
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCopy}
                    disabled={processedNumbers.length === 0}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    {t.copy}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadTxt}
                    disabled={processedNumbers.length === 0}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    TXT
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadCsv}
                    disabled={processedNumbers.length === 0}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Summary */}
        {processedNumbers.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{stats.input}</div>
                  <div className="text-sm text-muted-foreground">{t.statsInput}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">{stats.output}</div>
                  <div className="text-sm text-muted-foreground">{t.statsOutput}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-500">{stats.duplicates}</div>
                  <div className="text-sm text-muted-foreground">{t.statsDuplicates}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">{stats.invalid}</div>
                  <div className="text-sm text-muted-foreground">{t.statsInvalid}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
