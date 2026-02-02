import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, Eye, EyeOff, Phone, Lock, User, Mail, MessageSquare, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Login() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  
  // Setup form state
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  
  // Access request form state
  const [requestName, setRequestName] = useState("");
  const [requestTelegram, setRequestTelegram] = useState("");

  const needsSetupQuery = trpc.auth.needsSetup.useQuery();
  const loginMutation = trpc.auth.login.useMutation();
  const setupMutation = trpc.auth.setupAdmin.useMutation();
  const submitRequestMutation = trpc.auth.submitAccessRequest.useMutation();

  useEffect(() => {
    if (needsSetupQuery.data?.needsSetup) {
      setIsSetupMode(true);
    }
  }, [needsSetupQuery.data]);

  useEffect(() => {
    if (user && !authLoading) {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  // SEO: Set page title and meta description
  useEffect(() => {
    document.title = isSetupMode 
      ? "Первоначальная настройка - DataCheck Pro"
      : showRequestForm
        ? "Запрос доступа - DataCheck Pro"
        : "Вход - DataCheck Pro";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Войдите в DataCheck Pro для проверки телефонных номеров и email адресов.');
    }
  }, [isSetupMode, showRequestForm]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("Введите имя пользователя и пароль");
      return;
    }

    try {
      await loginMutation.mutateAsync({ username, password });
      toast.success("Вход выполнен успешно!");
      await refresh();
      setLocation("/");
    } catch (error: any) {
      toast.error(error.message || t.auth.invalidCredentials);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("Введите имя пользователя и пароль");
      return;
    }
    if (password.length < 6) {
      toast.error("Пароль должен быть не менее 6 символов");
      return;
    }

    try {
      await setupMutation.mutateAsync({
        username,
        password,
        name: setupName || undefined,
        email: setupEmail || undefined,
      });
      toast.success("Аккаунт администратора создан! Вы вошли в систему.");
      await refresh();
      setLocation("/");
    } catch (error: any) {
      toast.error(error.message || "Не удалось создать аккаунт администратора");
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestName) {
      toast.error(t.accessRequest?.fillRequired || "Заполните обязательные поля");
      return;
    }

    try {
      await submitRequestMutation.mutateAsync({
        name: requestName,
        telegram: requestTelegram || undefined,
      });
      setRequestSubmitted(true);
    } catch (error: any) {
      toast.error(error.message || t.accessRequest?.submitError || "Ошибка при отправке заявки");
    }
  };

  if (authLoading || needsSetupQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Request submitted success screen
  if (requestSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4 relative">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                {t.accessRequest?.submitted || "Заявка отправлена!"}
              </CardTitle>
              <CardDescription className="mt-2">
                {t.accessRequest?.submittedDescription || "Ваша заявка на доступ отправлена администратору. Мы свяжемся с вами по указанному email после рассмотрения."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setShowRequestForm(false);
                setRequestSubmitted(false);
                setRequestName("");
                setRequestTelegram("");
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.accessRequest?.backToLogin || "Вернуться к входу"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access request form
  if (showRequestForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4 relative">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                {t.accessRequest?.title || "Запрос доступа"}
              </CardTitle>
              <CardDescription>
                {t.accessRequest?.description || "Заполните форму для получения доступа к системе"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="requestName">{t.accessRequest?.name || "Имя"} *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="requestName"
                    placeholder={t.accessRequest?.namePlaceholder || "Ваше имя"}
                    value={requestName}
                    onChange={(e) => setRequestName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="requestTelegram">{t.accessRequest?.telegram || "Telegram"} *</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="requestTelegram"
                    placeholder={t.accessRequest?.telegramPlaceholder || "@username или +7999123456"}
                    value={requestTelegram}
                    onChange={(e) => setRequestTelegram(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={submitRequestMutation.isPending}
              >
                {submitRequestMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {t.accessRequest?.submit || "Отправить заявку"}
              </Button>
              
              <Button 
                type="button"
                variant="ghost" 
                className="w-full"
                onClick={() => setShowRequestForm(false)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t.accessRequest?.backToLogin || "Вернуться к входу"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Phone className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
                {isSetupMode ? "Первоначальная настройка" : t.auth.welcomeBack}
              </h1>
            <h2 className="sr-only">DataCheck Pro - Phone & Email Validation</h2>
            <CardDescription>
              {isSetupMode 
                ? "Создайте аккаунт администратора для начала работы"
                : t.auth.signInToAccess
              }
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={isSetupMode ? handleSetup : handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t.auth.username}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder={t.auth.enterUsername}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  autoComplete="username"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">{t.auth.password}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isSetupMode ? "Создайте пароль (мин. 6 символов)" : t.auth.enterPassword}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete={isSetupMode ? "new-password" : "current-password"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {isSetupMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Отображаемое имя (необязательно)</Label>
                  <Input
                    id="name"
                    placeholder="Ваше имя"
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (необязательно)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={setupEmail}
                    onChange={(e) => setSetupEmail(e.target.value)}
                  />
                </div>
              </>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={loginMutation.isPending || setupMutation.isPending}
            >
              {(loginMutation.isPending || setupMutation.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isSetupMode ? "Создать аккаунт администратора" : t.auth.signIn}
            </Button>
          </form>

          {!isSetupMode && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                {t.accessRequest?.noAccount || "Нет аккаунта?"}
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowRequestForm(true)}
              >
                <Mail className="h-4 w-4 mr-2" />
                {t.accessRequest?.requestAccess || "Запросить доступ"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
