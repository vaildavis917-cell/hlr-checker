import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History, Search, Filter, Globe, Monitor, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLocation } from "wouter";

const translations = {
  ru: {
    title: "История входов",
    description: "Просмотр истории входов в аккаунт",
    date: "Дата",
    action: "Действие",
    ip: "IP-адрес",
    browser: "Браузер",
    status: "Статус",
    details: "Детали",
    success: "Успешно",
    failed: "Неудачно",
    locked: "Заблокирован",
    login: "Вход",
    logout: "Выход",
    loginFailed: "Неудачный вход",
    passwordChange: "Смена пароля",
    sessionTerminated: "Сессия завершена",
    noHistory: "История входов пуста",
    filterByAction: "Фильтр по действию",
    allActions: "Все действия",
    search: "Поиск по IP...",
    showing: "Показано",
    of: "из",
    entries: "записей",
    loadMore: "Загрузить ещё",
  },
  uk: {
    title: "Історія входів",
    description: "Перегляд історії входів в акаунт",
    date: "Дата",
    action: "Дія",
    ip: "IP-адреса",
    browser: "Браузер",
    status: "Статус",
    details: "Деталі",
    success: "Успішно",
    failed: "Невдало",
    locked: "Заблоковано",
    login: "Вхід",
    logout: "Вихід",
    loginFailed: "Невдалий вхід",
    passwordChange: "Зміна пароля",
    sessionTerminated: "Сесію завершено",
    noHistory: "Історія входів порожня",
    filterByAction: "Фільтр за дією",
    allActions: "Всі дії",
    search: "Пошук за IP...",
    showing: "Показано",
    of: "з",
    entries: "записів",
    loadMore: "Завантажити ще",
  },
  en: {
    title: "Login History",
    description: "View your account login history",
    date: "Date",
    action: "Action",
    ip: "IP Address",
    browser: "Browser",
    status: "Status",
    details: "Details",
    success: "Success",
    failed: "Failed",
    locked: "Locked",
    login: "Login",
    logout: "Logout",
    loginFailed: "Login Failed",
    passwordChange: "Password Change",
    sessionTerminated: "Session Terminated",
    noHistory: "No login history",
    filterByAction: "Filter by action",
    allActions: "All actions",
    search: "Search by IP...",
    showing: "Showing",
    of: "of",
    entries: "entries",
    loadMore: "Load more",
  },
};

const ACTION_TYPES = ["login", "logout", "login_failed", "password_change", "terminate_session", "terminate_all_sessions"];

function getActionLabel(action: string, t: typeof translations.en): string {
  switch (action) {
    case "login": return t.login;
    case "logout": return t.logout;
    case "login_failed": return t.loginFailed;
    case "password_change": return t.passwordChange;
    case "terminate_session":
    case "terminate_all_sessions":
      return t.sessionTerminated;
    default: return action;
  }
}

function getActionIcon(action: string) {
  switch (action) {
    case "login":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "logout":
    case "terminate_session":
    case "terminate_all_sessions":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case "login_failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <History className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusBadge(action: string, t: typeof translations.en) {
  if (action === "login_failed") {
    return <Badge variant="destructive">{t.failed}</Badge>;
  }
  if (action === "login") {
    return <Badge variant="default" className="bg-green-500">{t.success}</Badge>;
  }
  return <Badge variant="secondary">{t.success}</Badge>;
}

function formatDate(date: Date | string, language: string): string {
  const d = new Date(date);
  return d.toLocaleString(
    language === "ru" ? "ru-RU" : language === "uk" ? "uk-UA" : "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

export default function LoginHistory() {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect non-admin users
  if (!loading && user && user.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }
  
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [ipSearch, setIpSearch] = useState("");
  const [limit, setLimit] = useState(50);
  
  const { data, isLoading } = trpc.auth.getLoginHistory.useQuery(
    { 
      limit,
      actionFilter: actionFilter === "all" ? undefined : actionFilter,
    },
    { enabled: !!user }
  );

  const filteredLogs = data?.logs.filter(log => {
    if (ipSearch && !log.ipAddress?.toLowerCase().includes(ipSearch.toLowerCase())) {
      return false;
    }
    return true;
  }) || [];

  return (
    <DashboardLayout>
      <div className="container max-w-6xl py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            {t.title}
          </h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t.filterByAction} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allActions}</SelectItem>
                    {ACTION_TYPES.map(action => (
                      <SelectItem key={action} value={action}>
                        {getActionLabel(action, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.search}
                  value={ipSearch}
                  onChange={(e) => setIpSearch(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              {t.noHistory}
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.date}</TableHead>
                      <TableHead>{t.action}</TableHead>
                      <TableHead>{t.ip}</TableHead>
                      <TableHead>{t.browser}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead>{t.details}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(log.createdAt, language)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <span>{getActionLabel(log.action, t)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono text-sm">{log.ipAddress || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Monitor className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[200px]" title={log.userAgent || ""}>
                              {log.userAgent?.split(" ")[0] || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(log.action, t)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={log.details || ""}>
                          {log.details || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            {/* Load more */}
            {data && data.total > filteredLogs.length && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t.showing} {filteredLogs.length} {t.of} {data.total} {t.entries}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setLimit(prev => prev + 50)}
                >
                  {t.loadMore}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
