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
  History as HistoryIcon, 
  Trash2, 
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function History() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const batchesQuery = trpc.hlr.listBatches.useQuery();
  const deleteBatchMutation = trpc.hlr.deleteBatch.useMutation();

  const handleDelete = async (batchId: number) => {
    try {
      await deleteBatchMutation.mutateAsync({ batchId });
      batchesQuery.refetch();
      toast.success(t.history.batchDeleted);
    } catch (error) {
      toast.error(t.history.batchDeleted);
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
        return <Badge className="bg-success text-success-foreground">{t.history.completed}</Badge>;
      case "failed":
        return <Badge variant="destructive">{t.home.statusInvalid}</Badge>;
      case "processing":
        return <Badge variant="secondary">{t.home.processing}</Badge>;
      default:
        return <Badge variant="outline">{t.home.statusUnknown}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <HistoryIcon className="h-8 w-8" />
            {t.history.title}
          </h1>
          <p className="text-muted-foreground">
            {t.history.subtitle}
          </p>
        </div>

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t.history.title}</CardTitle>
            <CardDescription>
              {batchesQuery.data?.length || 0} {t.history.total}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {batchesQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : batchesQuery.data?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <HistoryIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">{t.history.noBatches}</p>
                <p className="text-sm mt-1">{t.home.startByEntering}</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setLocation("/")}
                >
                  {t.nav.hlrChecker}
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.history.batchName}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead className="text-center">{t.history.total}</TableHead>
                      <TableHead className="text-center">{t.home.statusValid}</TableHead>
                      <TableHead className="text-center">{t.home.statusInvalid}</TableHead>
                      <TableHead>{t.date}</TableHead>
                      <TableHead>{t.history.completed}</TableHead>
                      <TableHead className="text-right">{t.actions}</TableHead>
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
                          {batch.totalNumbers}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-success">{batch.validNumbers}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-destructive">{batch.invalidNumbers}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(batch.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {batch.completedAt 
                            ? new Date(batch.completedAt).toLocaleString()
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/?batch=${batch.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t.history.deleteConfirm}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t.history.deleteConfirmDesc}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(batch.id)}
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
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
