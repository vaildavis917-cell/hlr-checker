import { createContext, useContext, ReactNode } from "react";
import { useAutoLogout } from "@/hooks/useAutoLogout";
import { AutoLogoutWarning } from "@/components/AutoLogoutWarning";
import { useAuth } from "@/_core/hooks/useAuth";

interface AutoLogoutContextValue {
  resetTimer: () => void;
  extendSession: () => void;
}

const AutoLogoutContext = createContext<AutoLogoutContextValue | null>(null);

interface AutoLogoutProviderProps {
  children: ReactNode;
  timeoutMs?: number;
  warningMs?: number;
}

export function AutoLogoutProvider({
  children,
  timeoutMs = 30 * 60 * 1000, // 30 minutes default
  warningMs = 2 * 60 * 1000, // 2 minutes warning
}: AutoLogoutProviderProps) {
  const { user, loading } = useAuth();
  
  const {
    showWarning,
    remainingTime,
    extendSession,
    performLogout,
    resetTimer,
  } = useAutoLogout({
    timeoutMs,
    warningMs,
    enabled: !!user && !loading,
  });

  return (
    <AutoLogoutContext.Provider value={{ resetTimer, extendSession }}>
      {children}
      <AutoLogoutWarning
        open={showWarning}
        remainingTime={remainingTime}
        onExtend={extendSession}
        onLogout={performLogout}
      />
    </AutoLogoutContext.Provider>
  );
}

export function useAutoLogoutContext() {
  const context = useContext(AutoLogoutContext);
  if (!context) {
    throw new Error("useAutoLogoutContext must be used within AutoLogoutProvider");
  }
  return context;
}

export default AutoLogoutProvider;
