import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Download, 
  User, 
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Redirect } from "wouter";

const translations = {
  ru: {
    title: "Журнал аудита",
    description: "Все действия пользователей в системе",
    date: "Дата",
    user: "Пользователь",
    action: "Действие",
    ip: "IP-адрес",
    details: "Детали",
    noLogs: "Журнал пуст",
    filterByAction: "Фильтр по действию",
    filterByUser: "Фильтр по пользователю",
    allActions: "Все действия",
    allUsers: "Все пользователи",
    search: "Поиск...",
    export: "Экспорт CSV",
    refresh: "Обновить",
    showing: "Показано",
    of: "из",
    entries: "записей",
    loadMore: "Загрузить ещё",
    // Actions
    login: "Вход",
    logout: "Выход",
    loginFailed: "Неудачный вход",
    passwordChange: "Смена пароля",
    createUser: "Создание пользователя",
    deleteUser: "Удаление пользователя",
    hlrCheck: "HLR проверка",
    batchStart: "Запуск батча",
    batchComplete: "Батч завершён",
    export_csv: "Экспорт CSV",
    export_excel: "Экспорт Excel",
    sessionTerminated: "Завершение сессии",
    accessDenied: "Доступ запрещён. Только для администраторов.",
  },
  uk: {
    title: "Журнал аудиту",
    description: "Всі дії користувачів у системі",
    date: "Дата",
    user: "Користувач",
    action: "Дія",
    ip: "IP-адреса",
    details: "Деталі",
    noLogs: "Журнал порожній",
    filterByAction: "Фільтр за дією",
    filterByUser: "Фільтр за користувачем",
    allActions: "Всі дії",
    allUsers: "Всі користувачі",
    search: "Пошук...",
    export: "Експорт CSV",
    refresh: "Оновити",
    showing: "Показано",
    of: "з",
    entries: "записів",
    loadMore: "Завантажити ще",
    // Actions
    login: "Вхід",
    logout: "Вихід",
    loginFailed: "Невдалий вхід",
    passwordChange: "Зміна пароля",
    createUser: "Створення користувача",
    deleteUser: "Видалення користувача",
    hlrCheck: "HLR перевірка",
    batchStart: "Запуск батчу",
    batchComplete: "Батч завершено",
    export_csv: "Експорт CSV",
    export_excel: "Експорт Excel",
    sessionTerminated: "Завершення сесії",
    accessDenied: "Доступ заборонено. Тільки для адміністраторів.",
  },
  en: {
    title: "Audit Log",
    description: "All user actions in the system",
    date: "Date",
    user: "User",
    action: "Action",
    ip: "IP Address",
    details: "Details",
    noLogs: "No logs",
    filterByAction: "Filter by action",
    filterByUser: "Filter by user",
    allActions: "All actions",
    allUsers: "All users",
    search: "Search...",
    export: "Export CSV",
    refresh: "Refresh",
    showing: "Showing",
    of: "of",
    entries: "entries",
    loadMore: "Load more",
    // Actions
    login: "Login",
    logout: "Logout",
    loginFailed: "Login Failed",
    passwordChange: "Password Change",
    createUser: "Create User",
    deleteUser: "Delete User",
    hlrCheck: "HLR Check",
    batchStart: "Batch Start",
    batchComplete: "Batch Complete",
    export_csv: "Export CSV",
    export_excel: "Export Excel",
    sessionTerminated: "Session Terminated",
    accessDenied: "Access denied. Admins only.",
  },
};

const ACTION_TYPES = [
  "login", "logout", "login_failed", "password_change", 
  "create_user", "delete_user", "hlr_single", "hlr_batch_start", 
  "hlr_batch_complete", "export_csv", "export_excel",
  "terminate_session", "terminate_all_sessions"
];

function getActionLabel(action: string, t: typeof translations.en): string {
  const map: Record<string, string> = {
    login: t.login,
    logout: t.logout,
    login_failed: t.loginFailed,
    password_change: t.passwordChange,
    create_user: t.createUser,
    delete_user: t.deleteUser,
    hlr_single: t.hlrCheck,
    hlr_batch_start: t.batchStart,
    hlr_batch_complete: t.batchComplete,
    export_csv: t.export_csv,
    export_excel: t.export_excel,
    terminate_session: t.sessionTerminated,
    terminate_all_sessions: t.sessionTerminated,
  };
  return map[action] || action;
}

function getActionBadgeVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("failed") || action.includes("delete")) return "destructive";
  if (action.includes("login") || action.includes("create")) return "default";
  if (action.includes("export")) return "outline";
  return "secondary";
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
      second: "2-digit",
    }
  );
}

export default function AuditLog() {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const { user, loading } = useAuth();
  
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [limit, setLimit] = useState(100);
  
  const { data: usersData } = trpc.admin.listUsers.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });
  
  const { data, isLoading, refetch } = trpc.admin.getActionLogs.useQuery(
    { 
      limit,
      userId: userFilter === "all" ? undefined : parseInt(userFilter),
    },
    { enabled: !!user && user.role === "admin" }
  );

  // Filter logs client-side for action type and search
  const filteredLogs = (data || []).filter(log => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesDetails = log.details?.toLowerCase().includes(query);
      const matchesIp = log.ipAddress?.toLowerCase().includes(query);
      if (!matchesDetails && !matchesIp) return false;
    }
    return true;
  });

  // Get username by userId
  const getUserName = (userId: number): string => {
    const foundUser = usersData?.find(u => u.id === userId);
    return foundUser?.username || `User #${userId}`;
  };

  // Export to CSV
  const handleExport = () => {
    const headers = ["Date", "User", "Action", "IP Address", "Details"];
    const rows = filteredLogs.map(log => [
      formatDate(log.createdAt, "en"),
      getUserName(log.userId),
      log.action,
      log.ipAddress || "",
      log.details || "",
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  return (
    <DashboardLayout>
      <div className="container max-w-7xl py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              {t.title}
            </h1>
            <p className="text-muted-foreground">{t.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t.refresh}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              {t.export}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t.filterByUser} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allUsers}</SelectItem>
                    {usersData?.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
              {t.noLogs}
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">{t.date}</TableHead>
                      <TableHead className="w-[120px]">{t.user}</TableHead>
                      <TableHead className="w-[150px]">{t.action}</TableHead>
                      <TableHead className="w-[130px]">{t.ip}</TableHead>
                      <TableHead>{t.details}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(log.createdAt, language)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium text-sm">{getUserName(log.userId)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {getActionLabel(log.action, t)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">
                            {log.ipAddress || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate" title={log.details || ""}>
                          {log.details || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            {/* Load more */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t.showing} {filteredLogs.length} {t.entries}
              </span>
              <Button
                variant="outline"
                onClick={() => setLimit(prev => prev + 100)}
              >
                {t.loadMore}
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
