import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Monitor, Smartphone, Tablet, Globe, Clock, MapPin, LogOut, Loader2, AlertTriangle, Shield } from "lucide-react";
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
import DashboardLayout from "@/components/DashboardLayout";

const translations = {
  ru: {
    title: "Активные сессии",
    description: "Управление устройствами, с которых выполнен вход в аккаунт",
    currentSession: "Текущая сессия",
    otherSessions: "Другие сессии",
    noOtherSessions: "Нет других активных сессий",
    terminateSession: "Завершить",
    terminateAll: "Завершить все сессии",
    terminateAllDescription: "Вы будете выйдены со всех устройств, кроме текущего",
    lastActivity: "Последняя активность",
    loginTime: "Время входа",
    device: "Устройство",
    browser: "Браузер",
    os: "ОС",
    ip: "IP-адрес",
    location: "Местоположение",
    expired: "Истекла",
    confirmTerminate: "Завершить сессию?",
    confirmTerminateDescription: "Устройство будет отключено от аккаунта",
    confirmTerminateAll: "Завершить все сессии?",
    confirmTerminateAllDescription: "Все устройства, кроме текущего, будут отключены от аккаунта",
    cancel: "Отмена",
    confirm: "Подтвердить",
    sessionTerminated: "Сессия завершена",
    allSessionsTerminated: "Все сессии завершены",
    error: "Ошибка",
    securityTip: "Если вы видите незнакомое устройство, завершите его сессию и смените пароль",
    unknown: "Неизвестно",
  },
  uk: {
    title: "Активні сесії",
    description: "Керування пристроями, з яких виконано вхід в акаунт",
    currentSession: "Поточна сесія",
    otherSessions: "Інші сесії",
    noOtherSessions: "Немає інших активних сесій",
    terminateSession: "Завершити",
    terminateAll: "Завершити всі сесії",
    terminateAllDescription: "Ви будете вийдені з усіх пристроїв, крім поточного",
    lastActivity: "Остання активність",
    loginTime: "Час входу",
    device: "Пристрій",
    browser: "Браузер",
    os: "ОС",
    ip: "IP-адреса",
    location: "Місцезнаходження",
    expired: "Закінчилась",
    confirmTerminate: "Завершити сесію?",
    confirmTerminateDescription: "Пристрій буде відключено від акаунту",
    confirmTerminateAll: "Завершити всі сесії?",
    confirmTerminateAllDescription: "Всі пристрої, крім поточного, будуть відключені від акаунту",
    cancel: "Скасувати",
    confirm: "Підтвердити",
    sessionTerminated: "Сесію завершено",
    allSessionsTerminated: "Всі сесії завершено",
    error: "Помилка",
    securityTip: "Якщо ви бачите незнайомий пристрій, завершіть його сесію та змініть пароль",
    unknown: "Невідомо",
  },
  en: {
    title: "Active Sessions",
    description: "Manage devices that are logged into your account",
    currentSession: "Current Session",
    otherSessions: "Other Sessions",
    noOtherSessions: "No other active sessions",
    terminateSession: "Terminate",
    terminateAll: "Terminate All Sessions",
    terminateAllDescription: "You will be logged out from all devices except the current one",
    lastActivity: "Last Activity",
    loginTime: "Login Time",
    device: "Device",
    browser: "Browser",
    os: "OS",
    ip: "IP Address",
    location: "Location",
    expired: "Expired",
    confirmTerminate: "Terminate session?",
    confirmTerminateDescription: "The device will be disconnected from your account",
    confirmTerminateAll: "Terminate all sessions?",
    confirmTerminateAllDescription: "All devices except the current one will be disconnected",
    cancel: "Cancel",
    confirm: "Confirm",
    sessionTerminated: "Session terminated",
    allSessionsTerminated: "All sessions terminated",
    error: "Error",
    securityTip: "If you see an unfamiliar device, terminate its session and change your password",
    unknown: "Unknown",
  },
};

function getDeviceIcon(deviceInfo: string | null) {
  const info = deviceInfo?.toLowerCase() || "";
  if (info.includes("mobile") || info.includes("phone")) {
    return <Smartphone className="h-5 w-5" />;
  }
  if (info.includes("tablet") || info.includes("ipad")) {
    return <Tablet className="h-5 w-5" />;
  }
  return <Monitor className="h-5 w-5" />;
}

function formatDate(date: Date | string, language: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return language === "ru" ? "Только что" : language === "uk" ? "Щойно" : "Just now";
  }
  if (diffMins < 60) {
    return language === "ru" ? `${diffMins} мин. назад` : language === "uk" ? `${diffMins} хв. тому` : `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return language === "ru" ? `${diffHours} ч. назад` : language === "uk" ? `${diffHours} год. тому` : `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return language === "ru" ? `${diffDays} дн. назад` : language === "uk" ? `${diffDays} дн. тому` : `${diffDays}d ago`;
  }
  return d.toLocaleDateString(language === "ru" ? "ru-RU" : language === "uk" ? "uk-UA" : "en-US");
}

interface SessionCardProps {
  session: {
    id: number;
    deviceInfo: string | null;
    browser: string | null;
    os: string | null;
    ipAddress: string | null;
    location: string | null;
    lastActivity: Date;
    createdAt: Date;
    isCurrent: boolean;
    isExpired: boolean;
  };
  t: typeof translations.en;
  language: string;
  onTerminate: (id: number) => void;
  isTerminating: boolean;
}

function SessionCard({ session, t, language, onTerminate, isTerminating }: SessionCardProps) {
  return (
    <Card className={session.isCurrent ? "border-primary" : session.isExpired ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted">
              {getDeviceIcon(session.deviceInfo)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {session.browser || t.unknown}
                </span>
                {session.isCurrent && (
                  <Badge variant="default" className="text-xs">
                    {t.currentSession}
                  </Badge>
                )}
                {session.isExpired && (
                  <Badge variant="destructive" className="text-xs">
                    {t.expired}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <div className="flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  <span>{session.os || t.unknown}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  <span>{session.ipAddress || t.unknown}</span>
                </div>
                {session.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{session.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{t.lastActivity}: {formatDate(session.lastActivity, language)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {!session.isCurrent && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <LogOut className="h-4 w-4 mr-1" />
                  {t.terminateSession}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.confirmTerminate}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.confirmTerminateDescription}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onTerminate(session.id)}
                    disabled={isTerminating}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isTerminating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    {t.confirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Sessions() {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  const { data: sessions, isLoading } = trpc.auth.getSessions.useQuery(undefined, {
    enabled: !!user,
  });
  
  const terminateSession = trpc.auth.terminateSession.useMutation({
    onSuccess: () => {
      toast.success(t.sessionTerminated);
      utils.auth.getSessions.invalidate();
    },
    onError: () => {
      toast.error(t.error);
    },
  });
  
  const terminateAllSessions = trpc.auth.terminateAllSessions.useMutation({
    onSuccess: (data) => {
      toast.success(`${t.allSessionsTerminated} (${data.terminatedCount})`);
      utils.auth.getSessions.invalidate();
    },
    onError: () => {
      toast.error(t.error);
    },
  });

  const currentSession = sessions?.find(s => s.isCurrent);
  const otherSessions = sessions?.filter(s => !s.isCurrent) || [];

  return (
    <DashboardLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              {t.title}
            </h1>
            <p className="text-muted-foreground">{t.description}</p>
          </div>
          
          {otherSessions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  {t.terminateAll}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.confirmTerminateAll}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.confirmTerminateAllDescription}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => terminateAllSessions.mutate()}
                    disabled={terminateAllSessions.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {terminateAllSessions.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    {t.confirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Security tip */}
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              {t.securityTip}
            </p>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current session */}
            {currentSession && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">{t.currentSession}</h2>
                <SessionCard
                  session={currentSession}
                  t={t}
                  language={language}
                  onTerminate={() => {}}
                  isTerminating={false}
                />
              </div>
            )}

            {/* Other sessions */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">{t.otherSessions}</h2>
              {otherSessions.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    {t.noOtherSessions}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {otherSessions.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      t={t}
                      language={language}
                      onTerminate={(id) => terminateSession.mutate({ sessionId: id })}
                      isTerminating={terminateSession.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
