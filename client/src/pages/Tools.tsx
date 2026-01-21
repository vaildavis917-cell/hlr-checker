import { useState, useMemo, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, Trash2, FileText, CheckCircle, XCircle, Upload } from "lucide-react";
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
    textInput: "Текстовый ввод",
    fileUpload: "Загрузка файла",
    dropFileHere: "Перетащите файл сюда или нажмите для выбора",
    supportedFormats: "Поддерживаемые форматы: TXT, CSV",
    fileLoaded: (name: string, count: number) => `Файл "${name}" загружен: ${count} номеров`,
    fileError: "Ошибка чтения файла",
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
    textInput: "Текстовий ввід",
    fileUpload: "Завантаження файлу",
    dropFileHere: "Перетягніть файл сюди або натисніть для вибору",
    supportedFormats: "Підтримувані формати: TXT, CSV",
    fileLoaded: (name: string, count: number) => `Файл "${name}" завантажено: ${count} номерів`,
    fileError: "Помилка читання файлу",
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
    textInput: "Text Input",
    fileUpload: "File Upload",
    dropFileHere: "Drop file here or click to select",
    supportedFormats: "Supported formats: TXT, CSV",
    fileLoaded: (name: string, count: number) => `File "${name}" loaded: ${count} numbers`,
    fileError: "Error reading file",
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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle file upload
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        // Parse CSV or TXT
        let numbers: string[] = [];
        if (file.name.endsWith('.csv')) {
          // Skip header row if exists, extract first column
          const lines = content.split('\n');
          numbers = lines.slice(1).map(line => {
            const firstCol = line.split(',')[0] || line.split(';')[0];
            return firstCol.replace(/"/g, '').trim();
          }).filter(Boolean);
          
          // If first line looks like a phone number, include it
          if (lines[0] && /^\+?\d/.test(lines[0].split(',')[0].replace(/"/g, '').trim())) {
            numbers.unshift(lines[0].split(',')[0].replace(/"/g, '').trim());
          }
        } else {
          numbers = content.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean);
        }
        
        setInputNumbers(numbers.join('\n'));
        toast.success(t.fileLoaded(file.name, numbers.length));
      }
    };
    reader.onerror = () => {
      toast.error(t.fileError);
    };
    reader.readAsText(file);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.txt') || file.name.endsWith('.csv'))) {
      handleFileUpload(file);
    }
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
              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">{t.textInput}</TabsTrigger>
                  <TabsTrigger value="file">{t.fileUpload}</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="mt-4">
                  <Textarea
                    value={inputNumbers}
                    onChange={(e) => setInputNumbers(e.target.value)}
                    placeholder={t.inputPlaceholder}
                    className="min-h-[250px] font-mono text-sm"
                  />
                </TabsContent>
                <TabsContent value="file" className="mt-4">
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors min-h-[250px] flex flex-col items-center justify-center ${
                      isDragging 
                        ? 'border-primary bg-primary/10' 
                        : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">{t.dropFileHere}</p>
                    <p className="text-sm text-muted-foreground/70">{t.supportedFormats}</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.csv"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </div>
                  {inputNumbers && (
                    <div className="mt-4">
                      <Textarea
                        value={inputNumbers}
                        onChange={(e) => setInputNumbers(e.target.value)}
                        placeholder={t.inputPlaceholder}
                        className="min-h-[150px] font-mono text-sm"
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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
