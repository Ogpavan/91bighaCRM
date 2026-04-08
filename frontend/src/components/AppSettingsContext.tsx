import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cacheAppSettings, getAppSettings, getCachedAppSettings, type AppSettings } from "@/api/settings-service";

const defaultSettings: AppSettings = {
  app_name: "Sarwe Crm",
  support_email: "support@crm.local",
  brand_primary_color: "#0c66e4",
  brand_logo_url: "/logo.png",
  allow_user_signup: true,
  feature_leads: true,
  feature_tasks: true,
  feature_users: true,
  feature_teams: true,
  feature_reports: true
};

type AppSettingsContextType = {
  settings: AppSettings;
  loading: boolean;
  refresh: () => Promise<void>;
  setSettings: (settings: AppSettings) => void;
  isFeatureEnabled: (featureKey: keyof AppSettings) => boolean;
};

const AppSettingsContext = createContext<AppSettingsContextType | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(() => getCachedAppSettings() || defaultSettings);
  const [loading, setLoading] = useState(true);

  const setSettings = (nextSettings: AppSettings) => {
    setSettingsState(nextSettings);
    cacheAppSettings(nextSettings);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const nextSettings = await getAppSettings();
      setSettings(nextSettings);
    } catch {
      const cached = getCachedAppSettings();
      setSettingsState(cached || defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const color = settings.brand_primary_color || "#0c66e4";
    root.style.setProperty("--brand-primary", color);

    const hex = color.replace("#", "");
    const validHex = /^[0-9A-Fa-f]{6}$/.test(hex);
    if (!validHex) {
      root.style.setProperty("--brand-soft", "rgba(12, 102, 228, 0.12)");
      root.style.setProperty("--brand-soft-strong", "rgba(12, 102, 228, 0.2)");
      return;
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    root.style.setProperty("--brand-soft", `rgba(${r}, ${g}, ${b}, 0.12)`);
    root.style.setProperty("--brand-soft-strong", `rgba(${r}, ${g}, ${b}, 0.2)`);
  }, [settings.brand_primary_color]);

  useEffect(() => {
    document.title = settings.app_name?.trim() || "Sarwe Crm";
  }, [settings.app_name]);

  const value = useMemo<AppSettingsContextType>(
    () => ({
      settings,
      loading,
      refresh,
      setSettings,
      isFeatureEnabled: (featureKey: keyof AppSettings) => settings[featureKey] !== false
    }),
    [loading, settings]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used within AppSettingsProvider");
  }
  return context;
}
