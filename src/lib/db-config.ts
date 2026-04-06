type DatabaseConfig = {
  host: string;
  port: number;
  database: string;
  user: string | null;
  password: string | null;
  databaseUrl: string | null;
};

const DEFAULTS = {
  host: "72.60.96.5",
  port: 5432,
  database: "bigha"
} as const;

export function getDatabaseConfig(): DatabaseConfig {
  const host = process.env.DB_HOST?.trim() || DEFAULTS.host;
  const port = Number(process.env.DB_PORT || DEFAULTS.port);
  const database = process.env.DB_NAME?.trim() || DEFAULTS.database;
  const user = process.env.DB_USER?.trim() || null;
  const password = process.env.DB_PASSWORD?.trim() || null;
  const databaseUrl =
    process.env.DATABASE_URL?.trim() ||
    (user && password ? `postgresql://${user}:${password}@${host}:${port}/${database}` : null);

  return {
    host,
    port,
    database,
    user,
    password,
    databaseUrl
  };
}

export function assertDatabaseConfig() {
  const config = getDatabaseConfig();

  if (!config.user || !config.password || !config.databaseUrl) {
    throw new Error(
      "PostgreSQL credentials are missing. Set DB_USER, DB_PASSWORD, and DATABASE_URL before enabling the CRM-backed database connection."
    );
  }

  return config;
}
