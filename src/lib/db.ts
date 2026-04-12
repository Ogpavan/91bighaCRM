import { assertDatabaseConfig } from "@/lib/db-config";

type QueryResult<T> = {
  rows: T[];
};

type Queryable = {
  query<T>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
};

type PoolClientLike = Queryable & {
  release(): void;
};

type PoolLike = Queryable & {
  connect(): Promise<PoolClientLike>;
};

declare global {
  // Reuse the pool across hot reloads in development.
  // eslint-disable-next-line no-var
  var __pgPool: PoolLike | undefined;
  // eslint-disable-next-line no-var
  var __pgPoolPromise: Promise<PoolLike> | undefined;
}

async function createPool(): Promise<PoolLike> {
  const config = assertDatabaseConfig();
  const pg = (await import("pg")) as unknown as {
    Pool: new (config: Record<string, unknown>) => PoolLike;
  };

  return new pg.Pool({
    connectionString: config.databaseUrl,
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user ?? undefined,
    password: config.password ?? undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
}

export async function getDb(): Promise<PoolLike> {
  if (global.__pgPool) {
    return global.__pgPool;
  }

  if (!global.__pgPoolPromise) {
    global.__pgPoolPromise = createPool().then((pool) => {
      global.__pgPool = pool;
      return pool;
    });
  }

  return global.__pgPoolPromise;
}

export async function withDbClient<T>(run: (client: PoolClientLike) => Promise<T>) {
  const db = await getDb();
  const client = await db.connect();

  try {
    return await run(client);
  } finally {
    client.release();
  }
}

export async function testDatabaseConnection() {
  const db = await getDb();
  const result = await db.query<{
    now: string;
    current_database: string;
  }>("select now()::text as now, current_database() as current_database");

  return result.rows[0];
}

export async function verifyPropertySchema() {
  const db = await getDb();
  const tableResult = await db.query<{
    table_name: string;
  }>(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'contacts',
        'users',
        'properties',
        'property_leads',
        'property_crm_sync_logs'
      )
    order by table_name
  `);

  const countsResult = await db.query<{
    properties_count: string;
    property_types_count: string;
  }>(`
    select
      (select count(*)::text from properties) as properties_count,
      (select count(distinct property_type)::text from properties where deleted_at is null and coalesce(property_type, '') <> '') as property_types_count
  `);

  const expectedTables = [
    "contacts",
    "properties",
    "property_crm_sync_logs",
    "property_leads",
    "users"
  ];

  const existingTables = tableResult.rows.map((row) => row.table_name);
  const missingTables = expectedTables.filter((tableName) => !existingTables.includes(tableName));
  const counts = countsResult.rows[0];

  return {
    existingTables,
    missingTables,
    counts: {
      propertyTypes: Number(counts.property_types_count),
      properties: Number(counts.properties_count)
    }
  };
}
