import { withDbClient } from "@/lib/db";

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

export const DEFAULT_APP_SETTINGS: AppSettings = {
  app_name: "CRM",
  support_email: "support@91bigha.com",
  brand_primary_color: "#0F172A",
  brand_logo_url: "/assets/img/logo.svg",
  allow_user_signup: true,
  feature_leads: true,
  feature_tasks: true,
  feature_users: true,
  feature_teams: true,
  feature_reports: true
};

type AppSettingsRow = AppSettings & {
  updated_at: string;
};

type AppSettingsCacheEntry = {
  settings: AppSettings;
  cachedAt: number;
};

const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var __appSettingsCache: AppSettingsCacheEntry | undefined;
}

function normalizeHexColor(input: unknown) {
  const value = typeof input === "string" ? input.trim() : "";
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : DEFAULT_APP_SETTINGS.brand_primary_color;
}

function normalizeText(input: unknown, fallback: string) {
  const value = typeof input === "string" ? input.trim() : "";
  return value || fallback;
}

function normalizeBoolean(input: unknown, fallback: boolean) {
  return typeof input === "boolean" ? input : fallback;
}

function mapRowToSettings(row: Partial<AppSettingsRow> | null | undefined): AppSettings {
  return {
    app_name: normalizeText(row?.app_name, DEFAULT_APP_SETTINGS.app_name),
    support_email: normalizeText(row?.support_email, DEFAULT_APP_SETTINGS.support_email),
    brand_primary_color: normalizeHexColor(row?.brand_primary_color),
    brand_logo_url: normalizeText(row?.brand_logo_url, DEFAULT_APP_SETTINGS.brand_logo_url),
    allow_user_signup: normalizeBoolean(row?.allow_user_signup, DEFAULT_APP_SETTINGS.allow_user_signup),
    feature_leads: normalizeBoolean(row?.feature_leads, DEFAULT_APP_SETTINGS.feature_leads),
    feature_tasks: normalizeBoolean(row?.feature_tasks, DEFAULT_APP_SETTINGS.feature_tasks),
    feature_users: normalizeBoolean(row?.feature_users, DEFAULT_APP_SETTINGS.feature_users),
    feature_teams: normalizeBoolean(row?.feature_teams, DEFAULT_APP_SETTINGS.feature_teams),
    feature_reports: normalizeBoolean(row?.feature_reports, DEFAULT_APP_SETTINGS.feature_reports)
  };
}

async function ensureAppSettingsSchema() {
  await withDbClient(async (client) => {
    await client.query(`
      create table if not exists app_settings (
        id smallint primary key default 1,
        app_name varchar(120) not null,
        support_email varchar(180) not null,
        brand_primary_color varchar(7) not null,
        brand_logo_url text not null,
        allow_user_signup boolean not null default true,
        feature_leads boolean not null default true,
        feature_tasks boolean not null default true,
        feature_users boolean not null default true,
        feature_teams boolean not null default true,
        feature_reports boolean not null default true,
        updated_at timestamptz not null default now(),
        constraint app_settings_singleton check (id = 1)
      )
    `);

    await client.query(
      `
        insert into app_settings (
          id,
          app_name,
          support_email,
          brand_primary_color,
          brand_logo_url,
          allow_user_signup,
          feature_leads,
          feature_tasks,
          feature_users,
          feature_teams,
          feature_reports
        )
        values (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        on conflict (id) do nothing
      `,
      [
        DEFAULT_APP_SETTINGS.app_name,
        DEFAULT_APP_SETTINGS.support_email,
        DEFAULT_APP_SETTINGS.brand_primary_color,
        DEFAULT_APP_SETTINGS.brand_logo_url,
        DEFAULT_APP_SETTINGS.allow_user_signup,
        DEFAULT_APP_SETTINGS.feature_leads,
        DEFAULT_APP_SETTINGS.feature_tasks,
        DEFAULT_APP_SETTINGS.feature_users,
        DEFAULT_APP_SETTINGS.feature_teams,
        DEFAULT_APP_SETTINGS.feature_reports
      ]
    );
  });
}

function readCachedSettings() {
  const cached = global.__appSettingsCache;
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.cachedAt > SETTINGS_CACHE_TTL_MS) {
    global.__appSettingsCache = undefined;
    return null;
  }

  return cached.settings;
}

function writeCachedSettings(settings: AppSettings) {
  global.__appSettingsCache = {
    settings,
    cachedAt: Date.now()
  };
}

export async function getAppSettings() {
  await ensureAppSettingsSchema();

  const cached = readCachedSettings();
  if (cached) {
    return cached;
  }

  const settings = await withDbClient(async (client) => {
    const result = await client.query<AppSettingsRow>(
      `
        select
          app_name,
          support_email,
          brand_primary_color,
          brand_logo_url,
          allow_user_signup,
          feature_leads,
          feature_tasks,
          feature_users,
          feature_teams,
          feature_reports,
          updated_at::text as updated_at
        from app_settings
        where id = 1
        limit 1
      `
    );

    return mapRowToSettings(result.rows[0]);
  });

  writeCachedSettings(settings);
  return settings;
}

export async function updateAppSettings(input: Partial<AppSettings>) {
  await ensureAppSettingsSchema();

  const current = await getAppSettings();
  const next = mapRowToSettings({
    ...current,
    ...input
  });

  const settings = await withDbClient(async (client) => {
    const result = await client.query<AppSettingsRow>(
      `
        update app_settings
        set
          app_name = $1,
          support_email = $2,
          brand_primary_color = $3,
          brand_logo_url = $4,
          allow_user_signup = $5,
          feature_leads = $6,
          feature_tasks = $7,
          feature_users = $8,
          feature_teams = $9,
          feature_reports = $10,
          updated_at = now()
        where id = 1
        returning
          app_name,
          support_email,
          brand_primary_color,
          brand_logo_url,
          allow_user_signup,
          feature_leads,
          feature_tasks,
          feature_users,
          feature_teams,
          feature_reports,
          updated_at::text as updated_at
      `,
      [
        next.app_name,
        next.support_email,
        next.brand_primary_color,
        next.brand_logo_url,
        next.allow_user_signup,
        next.feature_leads,
        next.feature_tasks,
        next.feature_users,
        next.feature_teams,
        next.feature_reports
      ]
    );

    return mapRowToSettings(result.rows[0]);
  });

  writeCachedSettings(settings);
  return settings;
}
