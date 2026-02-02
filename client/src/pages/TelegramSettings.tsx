import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, Settings, CheckCircle, XCircle, Loader2, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TelegramSettings() {
  const { t } = useLanguage();
  
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  const { data: settings, isLoading, refetch } = trpc.admin.getTelegramSettings.useQuery();
  
  const saveMutation = trpc.admin.saveTelegramSettings.useMutation({
    onSuccess: () => {
      toast.success(t.telegram?.saved || "Настройки сохранены");
      refetch();
      setBotToken("");
      setChatId("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const testMutation = trpc.admin.testTelegramConnection.useMutation({
    onSuccess: (result) => {
      setIsTesting(false);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      setIsTesting(false);
      toast.error(error.message);
    },
  });
  
  const clearMutation = trpc.admin.clearTelegramSettings.useMutation({
    onSuccess: () => {
      toast.success(t.telegram?.cleared || "Настройки очищены");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const handleSave = () => {
    if (!botToken || !chatId) {
      toast.error(t.telegram?.fillRequired || "Заполните все поля");
      return;
    }
    saveMutation.mutate({ botToken, chatId });
  };
  
  const handleTest = () => {
    const tokenToTest = botToken || "";
    const chatToTest = chatId || settings?.chatId || "";
    
    if (!tokenToTest || !chatToTest) {
      toast.error(t.telegram?.fillRequired || "Заполните все поля для теста");
      return;
    }
    
    setIsTesting(true);
    testMutation.mutate({ botToken: tokenToTest, chatId: chatToTest });
  };
  
  const handleClear = () => {
    if (confirm(t.telegram?.confirmClear || "Вы уверены, что хотите отключить уведомления?")) {
      clearMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.telegram?.title || "Telegram уведомления"}</h1>
        <p className="text-muted-foreground mt-1">
          {t.telegram?.description || "Настройте уведомления о новых заявках на доступ"}
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {settings?.isConfigured ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            {t.telegram?.status || "Статус"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settings?.isConfigured ? (
            <div className="space-y-2">
              <p className="text-green-600 dark:text-green-400">
                {t.telegram?.configured || "Уведомления настроены"}
              </p>
              <div className="text-sm text-muted-foreground">
                <p>Bot Token: {settings.botToken}</p>
                <p>Chat ID: {settings.chatId}</p>
              </div>
            </div>
          ) : (
            <p className="text-red-600 dark:text-red-400">
              {t.telegram?.notConfigured || "Уведомления не настроены"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Setup Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t.telegram?.setup || "Настройка"}
          </CardTitle>
          <CardDescription>
            {t.telegram?.setupDescription || "Введите данные вашего Telegram бота"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>{t.telegram?.step1 || "Создайте бота через @BotFather в Telegram"}</li>
                <li>{t.telegram?.step2 || "Скопируйте токен бота"}</li>
                <li>{t.telegram?.step3 || "Добавьте бота в чат/группу или напишите ему /start"}</li>
                <li>{t.telegram?.step4 || "Получите Chat ID через @userinfobot или @getidsbot"}</li>
              </ol>
              <a 
                href="https://core.telegram.org/bots#how-do-i-create-a-bot" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
              >
                {t.telegram?.learnMore || "Подробнее о создании бота"}
                <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="botToken">{t.telegram?.botToken || "Bot Token"}</Label>
            <div className="relative">
              <Input
                id="botToken"
                type={showToken ? "text" : "password"}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chatId">{t.telegram?.chatId || "Chat ID"}</Label>
            <Input
              id="chatId"
              placeholder="-1001234567890"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t.telegram?.chatIdHint || "Для групп Chat ID начинается с -100"}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.save}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={isTesting}>
              {isTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {t.telegram?.test || "Тест"}
            </Button>
            {settings?.isConfigured && (
              <Button variant="destructive" onClick={handleClear} disabled={clearMutation.isPending}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t.telegram?.clear || "Отключить"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
