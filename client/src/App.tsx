import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AutoLogoutProvider } from "./contexts/AutoLogoutContext";
import Home from "./pages/Home";
import History from "./pages/History";
import Admin from "./pages/Admin";
import AdminHistory from "./pages/AdminHistory";
import Login from "./pages/Login";
import Statistics from "./pages/Statistics";
import Tools from "./pages/Tools";
import Dashboard from "./pages/Dashboard";
import HlrLookup from "./pages/HlrLookup";
import SettingsPage from "./pages/Settings";
import HelpCenter from "./pages/HelpCenter";
import Sessions from "./pages/Sessions";
import LoginHistory from "./pages/LoginHistory";
import AuditLog from "./pages/AuditLog";

function Router() {
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/lookup"} component={HlrLookup} />
      <Route path={"/settings"} component={SettingsPage} />
      <Route path={"/history"} component={History} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/admin/history"} component={AdminHistory} />
      <Route path={"/admin/billing"} component={Admin} />
      <Route path={"/statistics"} component={Statistics} />
      <Route path={"/tools"} component={Tools} />
      <Route path={"/help"} component={HelpCenter} />
      <Route path={"/sessions"} component={Sessions} />
      <Route path={"/login-history"} component={LoginHistory} />
      <Route path={"/admin/audit"} component={AuditLog} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <TooltipProvider>
          <AutoLogoutProvider>
            <Toaster />
            <Router />
          </AutoLogoutProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
