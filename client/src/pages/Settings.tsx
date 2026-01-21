import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Settings as SettingsIcon, Globe, User } from "lucide-react";

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">{t.nav.settings}</h1>
          <p className="text-muted-foreground">{t.settings?.description || "Manage your account settings"}</p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t.settings?.profile || "Profile"}
            </CardTitle>
            <CardDescription>{t.settings?.profileDesc || "Your account information"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>{t.settings?.username || "Username"}</Label>
              <div className="p-3 rounded-lg bg-muted/50 font-medium">{user?.name || "-"}</div>
            </div>
            <div className="grid gap-2">
              <Label>{t.settings?.role || "Role"}</Label>
              <div className="p-3 rounded-lg bg-muted/50 font-medium">
                {user?.role === "admin" ? "Administrator" : "User"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t.settings?.language || "Language"}
            </CardTitle>
            <CardDescription>{t.settings?.languageDesc || "Choose your preferred language"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={language} onValueChange={(value: "ru" | "uk" | "en") => setLanguage(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">
                  <div className="flex items-center gap-2">
                    <span>🇷🇺</span>
                    <span>Русский</span>
                  </div>
                </SelectItem>
                <SelectItem value="uk">
                  <div className="flex items-center gap-2">
                    <span>🇺🇦</span>
                    <span>Українська</span>
                  </div>
                </SelectItem>
                <SelectItem value="en">
                  <div className="flex items-center gap-2">
                    <span>🇬🇧</span>
                    <span>English</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              {t.settings?.about || "About"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Version</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Support</span>
              <a 
                href="https://t.me/toskaqwe1" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                @toskaqwe1
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
