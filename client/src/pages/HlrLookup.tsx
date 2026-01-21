import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Search, CheckCircle, XCircle, Phone, Globe, Building, Signal, Database, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function HlrLookup() {
  const { t } = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [result, setResult] = useState<any>(null);
  
  const checkMutation = trpc.hlr.checkSingle.useMutation({
    onSuccess: (data) => {
      setResult(data);
      if (data.fromCache) {
        toast.success(t.home.cachedResult || "Результат из кэша");
      } else {
        toast.success("OK");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCheck = () => {
    if (!phoneNumber.trim()) {
      toast.error(t.home.enterPhoneNumber);
      return;
    }
    checkMutation.mutate({ phoneNumber: phoneNumber.trim() });
  };

  const getValidityStatus = (isValid: boolean, reachable: string) => {
    if (isValid && reachable === "reachable") {
      return { text: "Valid", color: "text-green-500" };
    } else if (isValid) {
      return { text: "Valid", color: "text-yellow-500" };
    } else {
      return { text: "Invalid", color: "text-red-500" };
    }
  };

  const getReachableIcon = (reachable: string) => {
    switch (reachable?.toLowerCase()) {
      case "reachable":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "unreachable":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Signal className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">{t.nav.hlrLookup}</h1>
          <p className="text-muted-foreground">{t.home.quickCheckDesc}</p>
        </div>

        {/* Input Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              {t.home.quickCheck}
            </CardTitle>
            <CardDescription>{t.home.enterPhoneNumber}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                className="flex-1"
              />
              <Button 
                onClick={handleCheck} 
                disabled={checkMutation.isPending}
                className="min-w-[120px]"
              >
                {checkMutation.isPending ? t.loading : t.home.checkNumbers}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result Card */}
        {result && result.success && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  {result.phoneNumber}
                </span>
                <div className="flex items-center gap-2">
                  {/* Cache indicator */}
                  {result.fromCache ? (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      {t.home.cached || "Кэш"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1 text-primary border-primary">
                      <Zap className="h-3 w-3" />
                      {t.home.live || "Live"}
                    </Badge>
                  )}
                  <span className={`text-lg font-bold ${getValidityStatus(result.isValid, result.reachable).color}`}>
                    {getValidityStatus(result.isValid, result.reachable).text}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  {getReachableIcon(result.reachable)}
                  <div>
                    <p className="text-sm text-muted-foreground">{t.home.reachability}</p>
                    <p className="font-medium">{result.reachable || "Unknown"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t.home.carrier}</p>
                    <p className="font-medium">{result.currentCarrier || "Unknown"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t.home.country}</p>
                    <p className="font-medium">{result.countryName || "Unknown"} ({result.countryCode || "??"})</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Signal className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t.home.healthScore}</p>
                    <p className={`font-medium ${
                      result.healthScore >= 70 ? "text-green-500" : 
                      result.healthScore >= 40 ? "text-yellow-500" : "text-red-500"
                    }`}>
                      {result.healthScore}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{t.home.roaming}</span>
                  <span>{result.isRoaming ? "Yes" : "No"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{t.home.ported}</span>
                  <span>{result.isPorted ? "Yes" : "No"}</span>
                </div>
                {result.fromCache && (
                  <div className="flex justify-between py-2 text-muted-foreground">
                    <span>{t.home.cacheNote || "Данные из кэша"}</span>
                    <span className="text-xs">{t.home.cacheExpiry || "Обновляются каждые 24ч"}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {result && !result.success && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{result.error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
