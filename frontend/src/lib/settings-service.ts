import { apiRequest } from "@/lib/api";

export type AppSettings = {
  app_name: string;
  support_email: string;
  brand_primary_color: string;
  brand_logo_url: string;
  allow_user_signup: boolean;
  feature_leads: boolean;
  feature_tasks: boolean;
  feature_users: boolean;
  feature_teams: boolean;
  feature_reports: boolean;
};

type SettingsResponse = {
  success: boolean;
  settings: AppSettings;
};

const SETTINGS_CACHE_KEY = "crm_app_settings";

export function getCachedAppSettings(): AppSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AppSettings;
  } catch {
    return null;
  }
}

export function cacheAppSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
}

export function clearCachedAppSettings(): void {
  localStorage.removeItem(SETTINGS_CACHE_KEY);
}

export async function getAppSettings(): Promise<AppSettings> {
  const response = await apiRequest<SettingsResponse>("/api/v1/settings");
  cacheAppSettings(response.settings);
  return response.settings;
}

export async function updateAppSettings(payload: Partial<AppSettings>): Promise<AppSettings> {
  const response = await apiRequest<SettingsResponse>("/api/v1/settings", {
    method: "PUT",
    body: payload
  });

  cacheAppSettings(response.settings);
  return response.settings;
}

export async function uploadBrandLogo(file: File): Promise<AppSettings> {
  const formData = new FormData();
  formData.append("logo", file);

  const response = await apiRequest<SettingsResponse>("/api/v1/settings/logo", {
    method: "POST",
    body: formData
  });

  cacheAppSettings(response.settings);
  return response.settings;
}
