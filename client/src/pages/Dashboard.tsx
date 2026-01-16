import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Activity, CheckCircle, XCircle, Clock, TrendingUp, Wallet } from "lucide-react";

export default function Dashboard() {
  const { t } = useLanguage();
  const { data: stats } = trpc.hlr.getUserStats.useQuery();
  const { data: balance } = trpc.hlr.getBalance.useQuery();

  const dailyLimit = stats?.limits?.dailyLimit || 0;
  const monthlyLimit = stats?.limits?.monthlyLimit || 0;
  const checksToday = stats?.checksToday || 0;
  const checksThisMonth = stats?.checksThisMonth || 0;
  
  const dailyProgress = dailyLimit > 0 ? (checksToday / dailyLimit) * 100 : 0;
  const monthlyProgress = monthlyLimit > 0 ? (checksThisMonth / monthlyLimit) * 100 : 0;
  
  // Estimate available checks based on balance (assuming ~$0.01 per check)
  const estimatedChecks = balance?.balance ? Math.floor(balance.balance / 0.01) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t.nav.dashboard}</h1>
          <p className="text-muted-foreground">{t.home.subtitle}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.statistics?.totalChecked || "Total Checked"}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalChecks || 0}</div>
              <p className="text-xs text-muted-foreground">
                {t.home.monthlyUsage}: {checksThisMonth}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.statistics?.validNumbers || "Valid"}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats?.validNumbers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalChecks ? ((stats.validNumbers / stats.totalChecks) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.statistics?.invalidNumbers || "Invalid"}</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats?.invalidNumbers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalChecks ? ((stats.invalidNumbers / stats.totalChecks) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.home.apiBalance}</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${balance?.balance?.toFixed(2) || "0.00"}</div>
              <p className="text-xs text-muted-foreground">
                ~{estimatedChecks.toLocaleString()} {t.home.estimatedChecks || "checks available"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Limits */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t.home.dailyUsage}
              </CardTitle>
              <CardDescription>
                {dailyLimit > 0 
                  ? `${checksToday} / ${dailyLimit} ${t.statistics?.checksUsed || "checks used"}`
                  : `${checksToday} ${t.statistics?.checksUsed || "checks"} (${t.home.unlimited})`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dailyLimit > 0 ? (
                <>
                  <Progress value={dailyProgress} className="h-3" />
                  {dailyProgress >= 100 && (
                    <p className="text-sm text-destructive mt-2">{t.home.dailyLimitReached}</p>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">{t.home.unlimited}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t.home.monthlyUsage}
              </CardTitle>
              <CardDescription>
                {monthlyLimit > 0 
                  ? `${checksThisMonth} / ${monthlyLimit} ${t.statistics?.checksUsed || "checks used"}`
                  : `${checksThisMonth} ${t.statistics?.checksUsed || "checks"} (${t.home.unlimited})`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyLimit > 0 ? (
                <>
                  <Progress value={monthlyProgress} className="h-3" />
                  {monthlyProgress >= 100 && (
                    <p className="text-sm text-destructive mt-2">{t.home.monthlyLimitReached}</p>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">{t.home.unlimited}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t.home.checkHistory}</CardTitle>
            <CardDescription>{t.home.checkHistoryDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentBatches />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function RecentBatches() {
  const { t } = useLanguage();
  const { data: batches } = trpc.hlr.listBatches.useQuery();

  if (!batches || batches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t.home.noChecksYet}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {batches.slice(0, 5).map((batch: any) => (
        <div key={batch.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className={`h-2 w-2 rounded-full ${batch.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <div>
              <p className="font-medium">{batch.name || `Batch #${batch.id}`}</p>
              <p className="text-sm text-muted-foreground">
                {batch.totalNumbers} {t.home.numbersDetected}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-sm font-medium ${batch.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>
              {batch.status === 'completed' ? t.status : `${batch.progress}%`}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(batch.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
