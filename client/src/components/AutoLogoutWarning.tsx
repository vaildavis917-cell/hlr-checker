import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";

interface AutoLogoutWarningProps {
  open: boolean;
  remainingTime: number;
  onExtend: () => void;
  onLogout: () => void;
}

const translations = {
  ru: {
    title: "Сессия истекает",
    description: "Вы будете автоматически выйдены из системы через",
    seconds: "секунд",
    stayLoggedIn: "Остаться в системе",
    logout: "Выйти сейчас",
  },
  uk: {
    title: "Сесія закінчується",
    description: "Ви будете автоматично вийдені з системи через",
    seconds: "секунд",
    stayLoggedIn: "Залишитися в системі",
    logout: "Вийти зараз",
  },
  en: {
    title: "Session Expiring",
    description: "You will be automatically logged out in",
    seconds: "seconds",
    stayLoggedIn: "Stay Logged In",
    logout: "Logout Now",
  },
};

export function AutoLogoutWarning({
  open,
  remainingTime,
  onExtend,
  onLogout,
}: AutoLogoutWarningProps) {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  
  const seconds = Math.ceil(remainingTime / 1000);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="text-yellow-500">⚠️</span>
            {t.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {t.description}
            <span className="block text-4xl font-bold text-foreground my-4">
              {seconds}
            </span>
            {t.seconds}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onLogout}>
            {t.logout}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onExtend}>
            {t.stayLoggedIn}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AutoLogoutWarning;
