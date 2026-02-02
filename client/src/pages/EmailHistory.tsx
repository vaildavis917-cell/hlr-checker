import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { 
  Mail, 
  Trash2, 
  Loader2,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function EmailHistory() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const batchesQuery = trpc.email.listBatches.useQuery();
  const deleteBatchMutation = trpc.email.deleteBatch.useMutation();


  const handleDelete = async (batchId: number) => {
    try {
      await deleteBatchMutation.mutateAsync({ batchId });
      batchesQuery.refetch();
      toast.success(language === "ru" ? "Проверка удалена" : language === "uk" ? "Перевірку видалено" : "Batch deleted");
    } catch (error) {
      toast.error(language === "ru" ? "Ошибка удаления" : language === "uk" ? "Помилка видалення" : "Delete error");
    }
  };



  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success text-success-foreground">{t.history?.completed || "Completed"}</Badge>;
      case "failed":
        return <Badge variant="destructive">{t.home?.statusInvalid || "Failed"}</Badge>;
      case "processing":
        return <Badge variant="secondary">{t.home?.processing || "Processing"}</Badge>;
      default:
        return <Badge variant="outline">{t.home?.statusUnknown || "Unknown"}</Badge>;
    }
  };

  const title = language === "ru" ? "Email История" : language === "uk" ? "Email Історія" : "Email History";
  const subtitle = language === "ru" ? "История ваших email проверок" : language === "uk" ? "Історія ваших email перевірок" : "Your email verification history";
  const noBatches = language === "ru" ? "Нет проверок" : language === "uk" ? "Немає перевірок" : "No batches";
  const startChecking = language === "ru" ? "Начните проверку email адресов" : language === "uk" ? "Почніть перевірку email адрес" : "Start checking emails";
  const goToChecker = language === "ru" ? "Email Массовая" : language === "uk" ? "Email Масова" : "Email Batch";
  const total = language === "ru" ? "проверок" : language === "uk" ? "перевірок" : "batches";
  const batchName = language === "ru" ? "Название" : language === "uk" ? "Назва" : "Name";
  const status = language === "ru" ? "Статус" : language === "uk" ? "Статус" : "Status";
  const totalEmails = language === "ru" ? "Всего" : language === "uk" ? "Всього" : "Total";
  const valid = language === "ru" ? "Валидные" : language === "uk" ? "Валідні" : "Valid";
  const invalid = language === "ru" ? "Невалидные" : language === "uk" ? "Невалідні" : "Invalid";
  const risky = language === "ru" ? "Рискованные" : language === "uk" ? "Ризиковані" : "Risky";
  const date = language === "ru" ? "Дата" : language === "uk" ? "Дата" : "Date";
  const actions = language === "ru" ? "Действия" : language === "uk" ? "Дії" : "Actions";
  const deleteConfirm = language === "ru" ? "Удалить проверку?" : language === "uk" ? "Видалити перевірку?" : "Delete batch?";
  const deleteDesc = language === "ru" ? "Это действие нельзя отменить. Все результаты будут удалены." : language === "uk" ? "Цю дію не можна скасувати. Всі результати будуть видалені." : "This action cannot be undone. All results will be deleted.";
  const cancel = language === "ru" ? "Отмена" : language === "uk" ? "Скасувати" : "Cancel";
  const deleteBtn = language === "ru" ? "Удалить" : language === "uk" ? "Видалити" : "Delete";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Mail className="h-8 w-8 text-primary" />
            {title}
          </h1>
          <p className="text-muted-foreground">
            {subtitle}
          </p>
        </div>

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {batchesQuery.data?.length || 0} {total}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {batchesQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : batchesQuery.data?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">{noBatches}</p>
                <p className="text-sm mt-1">{startChecking}</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setLocation("/email")}
                >
                  {goToChecker}
                </Button>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{batchName}</TableHead>
                      <TableHead>{status}</TableHead>
                      <TableHead className="text-center">{totalEmails}</TableHead>
                      <TableHead className="text-center">{valid}</TableHead>
                      <TableHead className="text-center">{invalid}</TableHead>
                      <TableHead className="text-center">{risky}</TableHead>
                      <TableHead>{date}</TableHead>
                      <TableHead className="text-right">{actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchesQuery.data?.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(batch.status)}
                            <span className="font-medium">
                              {batch.name || `Batch #${batch.id}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(batch.status)}</TableCell>
                        <TableCell className="text-center font-mono">
                          {batch.totalEmails}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-success">{batch.validEmails}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-destructive">{batch.invalidEmails}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-yellow-500">{batch.riskyEmails}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(batch.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{deleteConfirm}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {deleteDesc}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{cancel}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(batch.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {deleteBtn}
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
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
