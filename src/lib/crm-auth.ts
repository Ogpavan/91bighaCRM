import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { withDbClient } from "@/lib/db";

const TOKEN_HEADER = {
  alg: "HS256",
  typ: "JWT"
} as const;

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  Admin: [
    "view_dashboard",
    "view_leads",
    "create_leads",
    "edit_leads",
    "delete_leads",
    "view_tasks",
    "create_tasks",
    "edit_tasks",
    "delete_tasks",
    "view_users",
    "manage_users",
    "view_reports",
    "manage_settings"
  ],
  SalesManager: [
    "view_dashboard",
    "view_leads",
    "create_leads",
    "edit_leads",
    "delete_leads",
    "view_tasks",
    "create_tasks",
    "edit_tasks",
    "view_users",
    "view_reports"
  ],
  SalesExecutive: [
    "view_dashboard",
    "view_leads",
    "create_leads",
    "edit_leads",
    "view_tasks",
    "create_tasks",
    "edit_tasks"
  ]
};

export type CrmAuthUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  roleId: number;
  role: string;
  teamId: string | null;
  isActive: boolean;
  createdAt: string;
};

type AuthTokenPayload = {
  userId: string;
  role: string;
  permissions: string[];
  exp: number;
};

export type CrmAuthTokenPayload = AuthTokenPayload;

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

type UserRow = {
  id: string | number;
  name: string;
  email: string;
  phone: string | null;
  role_id: number | string;
  role: string;
  team_id: string | number | null;
  is_active: boolean;
  created_at: string;
  password_hash?: string | null;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createSignature(input: string) {
  return createHmac("sha256", getAuthTokenSecret()).update(input).digest("base64url");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function getAuthTokenSecret() {
  return (
    process.env.AUTH_TOKEN_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    `${process.env.DB_USER || ""}:${process.env.DB_PASSWORD || ""}:${process.env.DB_NAME || ""}`
  );
}

function normalizeStoredHash(passwordHash: string) {
  const [salt, hash] = passwordHash.split(":");

  if (!salt || !hash) {
    throw new Error("Stored password hash is malformed.");
  }

  return {
    salt,
    hash: Buffer.from(hash, "hex")
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validatePassword(password: string) {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }
}

export function getDefaultRoleSlug(roleName = "SalesExecutive") {
  switch (roleName) {
    case "Admin":
      return "admin";
    case "SalesManager":
      return "sales-manager";
    default:
      return "sales-executive";
  }
}

export function hashPassword(password: string) {
  validatePassword(password);
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const { salt, hash } = normalizeStoredHash(storedHash);
  const derived = scryptSync(password, salt, hash.length);
  return timingSafeEqual(hash, derived);
}

export function createAuthToken(user: Pick<CrmAuthUser, "id" | "role">, permissions: string[]) {
  const header = base64UrlEncode(JSON.stringify(TOKEN_HEADER));
  const payload: AuthTokenPayload = {
    userId: String(user.id),
    role: user.role,
    permissions,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  };
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  const input = `${header}.${payloadSegment}`;
  const signature = createSignature(input);
  return `${input}.${signature}`;
}

export function verifyAuthToken(token: string): CrmAuthTokenPayload {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new AuthError("Invalid authentication token.", 401);
  }

  const [headerSegment, payloadSegment, signatureSegment] = parts;
  const input = `${headerSegment}.${payloadSegment}`;
  const expectedSignature = createSignature(input);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(signatureSegment);

  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    throw new AuthError("Invalid authentication token.", 401);
  }

  let payload: Partial<CrmAuthTokenPayload>;
  try {
    payload = JSON.parse(base64UrlDecode(payloadSegment)) as Partial<CrmAuthTokenPayload>;
  } catch {
    throw new AuthError("Invalid authentication token.", 401);
  }

  if (!payload.userId || !payload.role || !Array.isArray(payload.permissions) || typeof payload.exp !== "number") {
    throw new AuthError("Invalid authentication token.", 401);
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new AuthError("Authentication token has expired.", 401);
  }

  return {
    userId: String(payload.userId),
    role: String(payload.role),
    permissions: payload.permissions.map((permission) => String(permission)),
    exp: payload.exp
  };
}

export function getRequestAuthToken(request: Request) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");

  if (!header) {
    throw new AuthError("Authentication required.", 401);
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AuthError("Authentication required.", 401);
  }

  return token;
}

export function requireAuth(request: Request) {
  return verifyAuthToken(getRequestAuthToken(request));
}

export function requirePermission(request: Request, permissionKey: string) {
  const auth = requireAuth(request);

  if (!auth.permissions.includes(permissionKey)) {
    throw new AuthError("You do not have permission to perform this action.", 403);
  }

  return auth;
}

export function mapUserRowToAuthUser(row: UserRow): CrmAuthUser {
  return {
    id: String(row.id),
    fullName: row.name,
    email: row.email,
    phone: row.phone,
    roleId: Number(row.role_id),
    role: row.role,
    teamId: row.team_id === null ? null : String(row.team_id),
    isActive: row.is_active,
    createdAt: row.created_at
  };
}

let authSchemaPromise: Promise<void> | null = null;

export async function ensureCrmAuthSchema() {
  if (authSchemaPromise) {
    return authSchemaPromise;
  }

  authSchemaPromise = withDbClient(async (client) => {
    await client.query(`
      alter table users
        add column if not exists password_hash text,
        add column if not exists last_login_at timestamptz
    `);
    await client.query(`
      create index if not exists idx_users_role_active on users(role, is_active)
    `);
    await client.query(`
      create table if not exists roles (
        id bigserial primary key,
        name varchar(60) not null unique,
        slug varchar(80) not null unique,
        created_at timestamptz not null default now()
      )
    `);
    await client.query(`
      create table if not exists permissions (
        id bigserial primary key,
        permission_key varchar(80) not null unique,
        description varchar(255),
        created_at timestamptz not null default now()
      )
    `);
    await client.query(`
      create table if not exists role_permissions (
        role_id bigint not null references roles(id) on delete cascade,
        permission_id bigint not null references permissions(id) on delete cascade,
        primary key (role_id, permission_id)
      )
    `);
    await client.query(`
      create table if not exists teams (
        id bigserial primary key,
        name varchar(120) not null unique,
        description text,
        is_active boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);
    await client.query(`
      create table if not exists team_permissions (
        team_id bigint not null references teams(id) on delete cascade,
        permission_id bigint not null references permissions(id) on delete cascade,
        primary key (team_id, permission_id)
      )
    `);
    await client.query(`
      alter table users
        add column if not exists role_id bigint,
        add column if not exists team_id bigint
    `);
    await client.query(`
      insert into roles (name, slug)
      values
        ('Admin', 'admin'),
        ('SalesManager', 'sales-manager'),
        ('SalesExecutive', 'sales-executive')
      on conflict (slug) do nothing
    `);
    await client.query(`
      insert into permissions (permission_key, description)
      values
        ('view_dashboard', 'View CRM dashboard'),
        ('view_leads', 'View leads'),
        ('create_leads', 'Create leads'),
        ('edit_leads', 'Edit leads'),
        ('delete_leads', 'Delete leads'),
        ('view_tasks', 'View tasks'),
        ('create_tasks', 'Create tasks'),
        ('edit_tasks', 'Edit tasks'),
        ('delete_tasks', 'Delete tasks'),
        ('view_users', 'View users'),
        ('manage_users', 'Manage users'),
        ('view_reports', 'View reports'),
        ('manage_settings', 'Manage settings')
      on conflict (permission_key) do nothing
    `);
    for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSION_MAP)) {
      await client.query(
        `
          insert into role_permissions (role_id, permission_id)
          select r.id, p.id
          from roles r
          join permissions p on p.permission_key = any($2::text[])
          where r.name = $1
          on conflict do nothing
        `,
        [roleName, permissionKeys]
      );
    }
    await client.query(`
      update users u
      set role_id = r.id
      from roles r
      where u.role_id is null
        and lower(coalesce(u.role, '')) = lower(r.name)
    `);
    await client.query(`
      update users
      set role_id = (select id from roles where slug = 'sales-executive')
      where role_id is null
    `);
    await client.query(`
      do $$
      begin
        if not exists (
          select 1 from pg_constraint where conname = 'users_role_id_fkey'
        ) then
          alter table users
            add constraint users_role_id_fkey
            foreign key (role_id) references roles(id) on delete restrict;
        end if;
      end $$;
    `);
    await client.query(`
      do $$
      begin
        if not exists (
          select 1 from pg_constraint where conname = 'users_team_id_fkey'
        ) then
          alter table users
            add constraint users_team_id_fkey
            foreign key (team_id) references teams(id) on delete set null;
        end if;
      end $$;
    `);
    await client.query(`
      create index if not exists idx_users_role_id_active on users(role_id, is_active)
    `);
    await client.query(`
      create index if not exists idx_users_team_id on users(team_id)
    `);
  });
}

export async function getRoleBySlug(slug: string) {
  return withDbClient(async (client) => {
    const result = await client.query<{ id: string; name: string }>(
      "select id::text as id, name from roles where slug = $1 limit 1",
      [slug]
    );
    return result.rows[0] || null;
  });
}

export async function getRoleByName(name: string) {
  return withDbClient(async (client) => {
    const result = await client.query<{ id: string; name: string; slug: string }>(
      "select id::text as id, name, slug from roles where lower(name) = lower($1) limit 1",
      [name]
    );
    return result.rows[0] || null;
  });
}

export async function getUserPermissions(userId: string) {
  return withDbClient(async (client) => {
    const result = await client.query<{ permission_key: string }>(
      `
        select distinct p.permission_key
        from users u
        join roles r on r.id = u.role_id
        join role_permissions rp on rp.role_id = r.id
        join permissions p on p.id = rp.permission_id
        where u.id = $1
        union
        select distinct p.permission_key
        from users u
        join team_permissions tp on tp.team_id = u.team_id
        join permissions p on p.id = tp.permission_id
        where u.id = $1
        order by permission_key
      `,
      [userId]
    );

    return result.rows.map((row) => row.permission_key);
  });
}
