import { useState, useRef, useCallback } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface FileDropZoneProps {
  onFileLoaded: (numbers: string[], fileName: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function FileDropZone({ onFileLoaded, disabled, className }: FileDropZoneProps) {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (extension === 'xlsx' || extension === 'xls') {
        // Parse Excel file
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<any>(firstSheet, { header: 1 });
        
        const items: string[] = [];
        data.forEach((row: any[]) => {
          // Check all cells in the row for emails or phone numbers
          row.forEach((cell) => {
            if (cell !== undefined && cell !== null) {
              const cellStr = String(cell).trim().replace(/['"]/g, '');
              // Check if it's an email (contains @)
              if (cellStr.includes('@')) {
                items.push(cellStr);
              }
              // Check if it's a phone number (contains digits, not a header)
              else if (cellStr && /^[+\d][\d\s\-()]+$/.test(cellStr)) {
                items.push(cellStr);
              }
            }
          });
        });
        
        onFileLoaded(items, file.name);
      } else {
        // Parse CSV/TXT file
        const text = await file.text();
        const lines = text.split(/\r?\n/);
        const items: string[] = [];
        
        lines.forEach((line) => {
          // Split by common delimiters
          const parts = line.split(/[,;\t]/);
          parts.forEach((part) => {
            const item = part.trim().replace(/['"]/g, '');
            // Check if it's an email (contains @)
            if (item.includes('@')) {
              items.push(item);
            }
            // Check if it's a phone number (contains digits, not a header)
            else if (item && /^[+\d][\d\s\-()]+$/.test(item)) {
              items.push(item);
            }
          });
        });
        
        onFileLoaded(items, file.name);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      onFileLoaded([], file.name);
    } finally {
      setIsProcessing(false);
    }
  }, [onFileLoaded]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (['csv', 'txt', 'xlsx', 'xls'].includes(extension || '')) {
        parseFile(file);
      }
    }
  }, [disabled, parseFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
    // Reset input to allow selecting same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [parseFile]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName(null);
  }, []);

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer",
        isDragging && !disabled && "border-primary bg-primary/5 scale-[1.02]",
        !isDragging && !disabled && "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
        disabled && "opacity-50 cursor-not-allowed border-muted",
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt,.xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        {isProcessing ? (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t.home?.processingFile || "Обработка файла..."}
            </p>
          </>
        ) : fileName ? (
          <>
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{fileName}</p>
              <button
                onClick={handleClear}
                className="p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
              isDragging ? "bg-primary/20" : "bg-muted"
            )}>
              <Upload className={cn(
                "w-6 h-6 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <p className="text-sm font-medium">
                {isDragging 
                  ? (t.home?.dropFileHere || "Отпустите файл здесь")
                  : (t.home?.dragDropFile || "Перетащите файл сюда")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t.home?.orClickToSelect || "или нажмите для выбора"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV, TXT, Excel (.xlsx, .xls)
              </p>
            </div>
          </>
        )}
      </div>
      
      {/* Drag overlay */}
      {isDragging && !disabled && (
        <div className="absolute inset-0 rounded-lg bg-primary/5 pointer-events-none" />
      )}
    </div>
  );
}
