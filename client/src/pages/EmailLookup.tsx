import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Search, CheckCircle, XCircle, Mail, Globe, Building, Database, Zap, AlertTriangle, Shield, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function EmailLookup() {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<any>(null);
  
  const checkMutation = trpc.email.checkSingle.useMutation({
    onSuccess: (data) => {
      setResult(data);
      if (data.fromCache) {
        toast.success(language === "ru" ? "Результат из кэша" : language === "uk" ? "Результат з кешу" : "Result from cache");
      } else {
        toast.success("OK");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCheck = () => {
    if (!email.trim()) {
      toast.error(language === "ru" ? "Введите email" : language === "uk" ? "Введіть email" : "Enter email");
      return;
    }
    checkMutation.mutate({ email: email.trim() });
  };

  const getResultBadge = (result: string, quality: string) => {
    if (result === "ok" || quality === "good") {
      return { text: language === "ru" ? "Валидный" : language === "uk" ? "Валідний" : "Valid", color: "bg-green-500", icon: CheckCircle };
    } else if (result === "catch_all" || quality === "unknown") {
      return { text: language === "ru" ? "Неизвестно" : language === "uk" ? "Невідомо" : "Unknown", color: "bg-yellow-500", icon: AlertTriangle };
    } else {
      return { text: language === "ru" ? "Невалидный" : language === "uk" ? "Невалідний" : "Invalid", color: "bg-red-500", icon: XCircle };
    }
  };

  const getEmailScore = (result: any) => {
    // Calculate email score based on various factors
    let score = 50;
    if (result.result === "ok") score += 30;
    if (result.quality === "good") score += 20;
    if (result.free === false) score += 10; // Corporate email
    if (result.role === false) score += 5; // Not a role-based email
    if (result.result === "invalid") score -= 50;
    if (result.quality === "bad") score -= 30;
    return Math.max(0, Math.min(100, score));
  };

  const getEmailCategory = (result: any) => {
    if (result.free) {
      return { 
        text: language === "ru" ? "Бесплатный" : language === "uk" ? "Безкоштовний" : "Free", 
        color: "text-blue-500" 
      };
    } else if (result.role) {
      return { 
        text: language === "ru" ? "Ролевой" : language === "uk" ? "Рольовий" : "Role-based", 
        color: "text-orange-500" 
      };
    } else {
      return { 
        text: language === "ru" ? "Корпоративный" : language === "uk" ? "Корпоративний" : "Corporate", 
        color: "text-green-500" 
      };
    }
  };

  const resultBadge = result ? getResultBadge(result.result, result.quality) : null;
  const emailScore = result ? getEmailScore(result) : 0;
  const emailCategory = result ? getEmailCategory(result) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">{t.nav?.emailLookup || "Email Проверка"}</h1>
          <p className="text-muted-foreground">
            {language === "ru" ? "Проверить один email адрес" : language === "uk" ? "Перевірити одну email адресу" : "Check a single email address"}
          </p>
        </div>

        {/* Input Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              {language === "ru" ? "Быстрая проверка" : language === "uk" ? "Швидка перевірка" : "Quick Check"}
            </CardTitle>
            <CardDescription>
              {language === "ru" ? "Введите email адрес для проверки" : language === "uk" ? "Введіть email адресу для перевірки" : "Enter email address to check"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="example@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                className="flex-1"
                type="email"
              />
              <Button 
                onClick={handleCheck} 
                disabled={checkMutation.isPending}
                className="min-w-[120px]"
              >
                {checkMutation.isPending ? (language === "ru" ? "Проверка..." : language === "uk" ? "Перевірка..." : "Checking...") : (language === "ru" ? "Проверить" : language === "uk" ? "Перевірити" : "Check")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result Card */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  {result.email}
                </span>
                <div className="flex items-center gap-2">
                  {/* Cache indicator */}
                  {result.fromCache ? (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      {language === "ru" ? "Кэш" : language === "uk" ? "Кеш" : "Cache"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1 text-primary border-primary">
                      <Zap className="h-3 w-3" />
                      Live
                    </Badge>
                  )}
                  {resultBadge && (
                    <Badge className={`${resultBadge.color} text-white`}>
                      <resultBadge.icon className="h-3 w-3 mr-1" />
                      {resultBadge.text}
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Email Score */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "ru" ? "Email Score" : language === "uk" ? "Email Score" : "Email Score"}
                    </p>
                    <p className={`font-medium ${
                      emailScore >= 70 ? "text-green-500" : 
                      emailScore >= 40 ? "text-yellow-500" : "text-red-500"
                    }`}>
                      {emailScore}%
                    </p>
                  </div>
                </div>

                {/* Category */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "ru" ? "Категория" : language === "uk" ? "Категорія" : "Category"}
                    </p>
                    <p className={`font-medium ${emailCategory?.color}`}>
                      {emailCategory?.text}
                    </p>
                  </div>
                </div>

                {/* Quality */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <CheckCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "ru" ? "Качество" : language === "uk" ? "Якість" : "Quality"}
                    </p>
                    <p className={`font-medium ${
                      result.quality === "good" ? "text-green-500" : 
                      result.quality === "unknown" ? "text-yellow-500" : "text-red-500"
                    }`}>
                      {result.quality || "Unknown"}
                    </p>
                  </div>
                </div>

                {/* Domain */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "ru" ? "Домен" : language === "uk" ? "Домен" : "Domain"}
                    </p>
                    <p className="font-medium">
                      {result.email?.split("@")[1] || "Unknown"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">
                    {language === "ru" ? "Результат" : language === "uk" ? "Результат" : "Result"}
                  </span>
                  <span className={
                    result.result === "ok" ? "text-green-500" : 
                    result.result === "catch_all" ? "text-yellow-500" : "text-red-500"
                  }>
                    {result.result}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">
                    {language === "ru" ? "Подрезультат" : language === "uk" ? "Підрезультат" : "Sub-result"}
                  </span>
                  <span>{result.subresult || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">
                    {language === "ru" ? "Бесплатный провайдер" : language === "uk" ? "Безкоштовний провайдер" : "Free Provider"}
                  </span>
                  <span>{result.free ? (language === "ru" ? "Да" : language === "uk" ? "Так" : "Yes") : (language === "ru" ? "Нет" : language === "uk" ? "Ні" : "No")}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">
                    {language === "ru" ? "Ролевой email" : language === "uk" ? "Рольовий email" : "Role-based"}
                  </span>
                  <span>{result.role ? (language === "ru" ? "Да" : language === "uk" ? "Так" : "Yes") : (language === "ru" ? "Нет" : language === "uk" ? "Ні" : "No")}</span>
                </div>
                {result.didyoumean && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">
                      {language === "ru" ? "Возможно вы имели в виду" : language === "uk" ? "Можливо ви мали на увазі" : "Did you mean"}
                    </span>
                    <span className="text-primary">{result.didyoumean}</span>
                  </div>
                )}
                {result.fromCache && (
                  <div className="flex justify-between py-2 text-muted-foreground">
                    <span>{language === "ru" ? "Данные из кэша" : language === "uk" ? "Дані з кешу" : "Data from cache"}</span>
                    <span className="text-xs">{language === "ru" ? "Обновляются каждые 24ч" : language === "uk" ? "Оновлюються кожні 24г" : "Updates every 24h"}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
