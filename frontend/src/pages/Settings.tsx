import { FormEvent, useEffect, useState } from "react";
import { useAppSettings } from "@/components/AppSettingsContext";
import { useTheme } from "@/components/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resolveApiAssetUrl } from "@/api/api";
import { updateAppSettings, uploadBrandLogo, type AppSettings } from "@/api/settings-service";

type SettingsTab = "branding" | "modules" | "access";

export default function Settings() {
  const { settings, setSettings, refresh } = useAppSettings();
  const { theme, setTheme, toggleTheme } = useTheme();
  const [tab, setTab] = useState<SettingsTab>("branding");
  const [form, setForm] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const setBoolean = (key: keyof AppSettings, checked: boolean) => {
    setForm((prev) => ({ ...prev, [key]: checked }));
  };

  const setText = (key: keyof AppSettings, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updated = await updateAppSettings(form);
      setSettings(updated);
      setMessage("Settings saved successfully.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    setUploadingLogo(true);
    setMessage("");
    setError("");
    try {
      const updated = await uploadBrandLogo(file);
      setSettings(updated);
      setForm(updated);
      setMessage("Logo uploaded successfully.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <Card className="rounded-sm">
      <CardHeader className="p-6 pb-3">
        <CardTitle className="text-sm text-gray-800">App Settings</CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="inline-flex rounded-sm border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              className={`h-8 rounded-sm px-3 text-xs ${tab === "branding" ? "bg-white shadow-sm text-gray-800" : "text-gray-600"}`}
              onClick={() => setTab("branding")}
            >
              Branding
            </button>
            <button
              type="button"
              className={`h-8 rounded-sm px-3 text-xs ${tab === "modules" ? "bg-white shadow-sm text-gray-800" : "text-gray-600"}`}
              onClick={() => setTab("modules")}
            >
              Modules
            </button>
            <button
              type="button"
              className={`h-8 rounded-sm px-3 text-xs ${tab === "access" ? "bg-white shadow-sm text-gray-800" : "text-gray-600"}`}
              onClick={() => setTab("access")}
            >
              Access
            </button>
          </div>

          {tab === "branding" ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-gray-700">Appearance</label>
                <div className="flex items-center justify-between rounded-sm border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xs text-gray-700 dark:text-slate-200">Theme Mode</p>
                  <div className="inline-flex rounded-sm border border-gray-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950">
                    <button
                      type="button"
                      className={`h-7 rounded-sm px-3 text-xs ${
                        theme === "light" ? "bg-white shadow-sm text-gray-800 dark:bg-slate-800 dark:text-slate-100" : "text-gray-600 dark:text-slate-400"
                      }`}
                      onClick={() => setTheme("light")}
                    >
                      Light
                    </button>
                    <button
                      type="button"
                      className={`h-7 rounded-sm px-3 text-xs ${
                        theme === "dark" ? "bg-white shadow-sm text-gray-800 dark:bg-slate-800 dark:text-slate-100" : "text-gray-600 dark:text-slate-400"
                      }`}
                      onClick={() => setTheme("dark")}
                    >
                      Dark
                    </button>
                  </div>
                  <Button type="button" variant="outline" className="h-7 px-3 text-xs" onClick={toggleTheme}>
                    Toggle
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">App Name</label>
                <Input className="h-9 text-xs" value={form.app_name} onChange={(event) => setText("app_name", event.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Support Email</label>
                <Input className="h-9 text-xs" value={form.support_email} onChange={(event) => setText("support_email", event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">App Logo</label>
                <div className="flex h-full flex-col justify-between gap-3 rounded-sm border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-sm border border-gray-200 bg-white">
                      {form.brand_logo_url ? (
                        <img src={resolveApiAssetUrl(form.brand_logo_url)} alt={form.app_name || "App logo"} className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[11px] text-gray-400">No logo</span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Upload workspace logo</p>
                      <p className="text-[11px] text-gray-500">PNG, JPG, WEBP, or SVG up to 2MB.</p>
                    </div>
                  </div>
                  <div>
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100">
                      {uploadingLogo ? "Uploading..." : "Upload Logo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        disabled={uploadingLogo || saving}
                        onChange={(event) => {
                          const nextFile = event.target.files?.[0] || null;
                          void handleLogoUpload(nextFile);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Primary Color</label>
                <div className="flex h-full flex-col justify-between gap-3 rounded-sm border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-16 w-16 rounded-sm border border-gray-200"
                      style={{ backgroundColor: form.brand_primary_color || "#0c66e4" }}
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-700">Brand preview</p>
                      <p className="text-[11px] text-gray-500">Used for buttons, highlights, and sidebar accents.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-9 w-12 rounded-sm border border-gray-300 bg-white p-1"
                      value={form.brand_primary_color}
                      onChange={(event) => setText("brand_primary_color", event.target.value)}
                    />
                    <Input
                      className="h-9 text-xs"
                      value={form.brand_primary_color}
                      onChange={(event) => setText("brand_primary_color", event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "modules" ? (
            <div className="rounded-sm border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-700">Module Access</p>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                  <input type="checkbox" className="h-4 w-4 rounded-sm border-gray-300" checked={form.feature_leads} onChange={(e) => setBoolean("feature_leads", e.target.checked)} />
                  Leads
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                  <input type="checkbox" className="h-4 w-4 rounded-sm border-gray-300" checked={form.feature_tasks} onChange={(e) => setBoolean("feature_tasks", e.target.checked)} />
                  Tasks
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                  <input type="checkbox" className="h-4 w-4 rounded-sm border-gray-300" checked={form.feature_users} onChange={(e) => setBoolean("feature_users", e.target.checked)} />
                  Users
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                  <input type="checkbox" className="h-4 w-4 rounded-sm border-gray-300" checked={form.feature_teams} onChange={(e) => setBoolean("feature_teams", e.target.checked)} />
                  Teams
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                  <input type="checkbox" className="h-4 w-4 rounded-sm border-gray-300" checked={form.feature_reports} onChange={(e) => setBoolean("feature_reports", e.target.checked)} />
                  Reports
                </label>
              </div>
            </div>
          ) : null}

          {tab === "access" ? (
            <div className="rounded-sm border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-700">Global Access</p>
              <label className="mt-3 inline-flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded-sm border-gray-300"
                  checked={form.allow_user_signup}
                  onChange={(event) => setBoolean("allow_user_signup", event.target.checked)}
                />
                Allow user signup
              </label>
            </div>
          ) : null}

          {message ? <p className="text-xs text-green-600">{message}</p> : null}
          {error ? <p className="text-xs text-red-600">{error}</p> : null}

          <div className="flex justify-end">
            <Button type="submit" className="h-9 text-xs" disabled={saving || uploadingLogo}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
