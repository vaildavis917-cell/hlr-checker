import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, Eye, EyeOff, Phone, Lock, User } from "lucide-react";
import { toast } from "sonner";
import t from "@/lib/i18n";

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(false);
  
  // Setup form state
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");

  const needsSetupQuery = trpc.auth.needsSetup.useQuery();
  const loginMutation = trpc.auth.login.useMutation();
  const setupMutation = trpc.auth.setupAdmin.useMutation();

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
      ? "Первоначальная настройка - HLR Bulk Checker"
      : "Вход - HLR Bulk Checker";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Войдите в HLR Bulk Checker для проверки телефонных номеров, информации об операторе, статуса роуминга и портирования.');
    }
  }, [isSetupMode]);

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

  if (authLoading || needsSetupQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Phone className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
                {isSetupMode ? "Первоначальная настройка" : t.auth.welcomeBack}
              </h1>
            <h2 className="sr-only">HLR Bulk Checker - Phone Number Validation</h2>
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
            <p className="text-center text-sm text-muted-foreground mt-6">
              {t.auth.contactAdmin}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
