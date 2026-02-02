import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { 
  BarChart3, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Calendar,
  Loader2
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Statistics() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const statsQuery = trpc.admin.getStatistics.useQuery(undefined, { enabled: isAdmin });
  const userStatsQuery = trpc.hlr.getUserStats.useQuery();

  // SEO
  useEffect(() => {
    document.title = `${t.stats.title} - DataCheck Pro`;
  }, [t]);

  const stats = isAdmin ? statsQuery.data : userStatsQuery.data;
  const isLoading = isAdmin ? statsQuery.isLoading : userStatsQuery.isLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t.stats.title}</h1>
          <p className="text-muted-foreground">
            {t.stats.subtitle}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t.stats.totalChecks}</CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalChecks || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {t.stats.totalChecks}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t.stats.validNumbers}</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{(stats as any)?.validNumbers || (stats as any)?.validChecks || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.totalChecks ? ((((stats as any).validNumbers || (stats as any).validChecks || 0) / stats.totalChecks) * 100).toFixed(1) : 0}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t.stats.invalidNumbers}</CardTitle>
                  <XCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{(stats as any)?.invalidNumbers || (stats as any)?.invalidChecks || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {t.stats.invalidNumbers}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t.stats.totalBatches}</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalBatches || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {t.stats.totalBatches}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Period Stats */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {t.stats.checksToday}
                  </CardTitle>
                  <CardDescription>{t.stats.checksToday}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{(stats as any)?.checksToday || (stats as any)?.todayChecks || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {t.stats.checksThisMonth}
                  </CardTitle>
                  <CardDescription>{t.stats.checksThisMonth}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{(stats as any)?.checksThisMonth || (stats as any)?.monthChecks || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Limits Info (for non-admin users) */}
            {!isAdmin && 'limits' in (stats || {}) && (stats as any)?.limits && (
              <Card>
                <CardHeader>
                  <CardTitle>{t.stats.yourLimits}</CardTitle>
                  <CardDescription>{t.stats.yourLimits}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>{t.stats.daily}</span>
                    <span className="font-medium">
                      {(stats as any).checksToday || 0} / {(stats as any).limits?.dailyLimit === 0 ? t.stats.unlimited : (stats as any).limits?.dailyLimit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t.stats.monthly}</span>
                    <span className="font-medium">
                      {(stats as any).checksThisMonth || 0} / {(stats as any).limits?.monthlyLimit === 0 ? t.stats.unlimited : (stats as any).limits?.monthlyLimit}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
