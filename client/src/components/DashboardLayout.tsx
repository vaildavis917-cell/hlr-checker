import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, 
  LogOut, 
  Search, 
  Layers, 
  Settings, 
  HelpCircle,
  Sun, 
  Moon, 
  Bell,
  Users,
  CreditCard
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { CSSProperties, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const SUPPORT_TELEGRAM = "https://t.me/toskaqwe1";

const getMenuItems = (t: ReturnType<typeof useLanguage>["t"], isAdmin: boolean) => {
  const items: Array<{icon: any, label: string, path: string, external?: boolean}> = [
    { icon: LayoutDashboard, label: t.nav.dashboard, path: "/dashboard" },
    { icon: Search, label: t.nav.hlrLookup, path: "/lookup" },
    { icon: Layers, label: t.nav.batchChecker, path: "/" },
    { icon: Settings, label: t.nav.settings, path: "/settings" },
    { icon: HelpCircle, label: t.nav.support, path: SUPPORT_TELEGRAM, external: true },
  ];
  
  if (isAdmin) {
    items.push(
      { icon: CreditCard, label: t.nav.billing, path: "/admin/billing" },
      { icon: Users, label: t.nav.users, path: "/admin" },
    );
  }
  
  return items;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth] = useState(260);
  const { loading, user } = useAuth();

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    window.location.href = "/login";
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const menuItems = getMenuItems(t, user?.role === "admin");
  const isMobile = useIsMobile();

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border/50">
        <SidebarHeader className="h-16 justify-center border-b border-border/50">
          <div className="flex items-center gap-3 px-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-lg tracking-tight">HLR Pro</span>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-4">
          <SidebarMenu>
            {menuItems.map(item => {
              const isActive = !item.external && location === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => {
                      if (item.external) {
                        window.open(item.path, '_blank');
                      } else {
                        setLocation(item.path);
                      }
                    }}
                    tooltip={item.label}
                    className={`h-11 transition-all font-medium ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-border/50">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between px-2 py-2 mb-2">
            {!isCollapsed && (
              <span className="text-sm text-muted-foreground">
                {theme === "dark" ? "Dark" : "Light"}
              </span>
            )}
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                theme === "dark" ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  theme === "dark" ? "translate-x-6" : "translate-x-1"
                }`}
              />
              {theme === "dark" ? (
                <Moon className="absolute right-1 h-3 w-3 text-primary-foreground" />
              ) : (
                <Sun className="absolute left-1 h-3 w-3 text-muted-foreground" />
              )}
            </button>
          </div>
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-9 w-9 border shrink-0">
                  <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {user?.role === "admin" ? "Administrator" : "User"}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t.auth.signOut}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-background">
        {/* Top Header */}
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-background/95 backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {isMobile && <SidebarTrigger className="h-9 w-9" />}
            <h1 className="text-lg font-semibold">HLR Bulk Checker</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
            </Button>
            
            {/* Help Center */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2"
              onClick={() => setLocation('/help')}
            >
              <HelpCircle className="h-5 w-5" />
              <span className="hidden sm:inline">Help Center</span>
            </Button>
          </div>
        </header>
        
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
