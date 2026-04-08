import { NextResponse } from "next/server";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import { getAppSettings } from "@/lib/app-settings";
import {
  createAuthToken,
  ensureCrmAuthSchema,
  getDefaultRoleSlug,
  getRoleBySlug,
  getUserPermissions,
  hashPassword,
  mapUserRowToAuthUser,
  normalizeEmail,
  validatePassword
} from "@/lib/crm-auth";
import { withDbClient } from "@/lib/db";

type RegisterPayload = {
  fullName?: string;
  email?: string;
  password?: string;
};

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
};

function jsonResponse(data: unknown, status: number, request: Request) {
  return withCors(NextResponse.json(data, { status }), request);
}

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function POST(request: Request) {
  let payload: RegisterPayload;
  try {
    payload = (await request.json()) as RegisterPayload;
  } catch {
    return jsonResponse({ success: false, message: "Invalid JSON payload." }, 400, request);
  }

  const fullName = String(payload.fullName || "").trim();
  const email = normalizeEmail(String(payload.email || ""));
  const password = String(payload.password || "");

  if (!fullName || !email || !password) {
    return jsonResponse(
      { success: false, message: "Full name, email, and password are required." },
      400,
      request
    );
  }

  try {
    validatePassword(password);
  } catch (error) {
    return jsonResponse(
      { success: false, message: error instanceof Error ? error.message : "Invalid password." },
      400,
      request
    );
  }

  const settings = await getAppSettings();
  if (!settings.allow_user_signup) {
    return jsonResponse({ success: false, message: "User signup is disabled." }, 403, request);
  }

  await ensureCrmAuthSchema();

  const roleSlug = getDefaultRoleSlug();
  const role = await getRoleBySlug(roleSlug);
  if (!role) {
    return jsonResponse({ success: false, message: "Default role configuration missing." }, 500, request);
  }

  const existing = await withDbClient(async (client) => {
    const result = await client.query<{ id: string }>(
      "select id::text as id from users where lower(email) = lower($1) limit 1",
      [email]
    );
    return result.rows[0] || null;
  });

  if (existing) {
    return jsonResponse({ success: false, message: "An account with this email already exists." }, 409, request);
  }

  const passwordHash = hashPassword(password);

  const userRow = await withDbClient(async (client) => {
    const result = await client.query<UserRow>(
      `
        insert into users (name, email, phone, role, is_active, role_id, password_hash)
        values ($1, $2, $3, $4, true, $5, $6)
        returning
          id::text as id,
          name,
          email,
          phone,
          role_id::text as role_id,
          role,
          team_id::text as team_id,
          is_active,
          created_at::text as created_at
      `,
      [fullName, email, null, role.name, String(role.id), passwordHash]
    );

    return result.rows[0] || null;
  });

  if (!userRow) {
    return jsonResponse({ success: false, message: "Unable to create account." }, 500, request);
  }

  const permissions = await getUserPermissions(String(userRow.id));
  const token = createAuthToken({ id: String(userRow.id), role: userRow.role }, permissions);

  return jsonResponse(
    {
      success: true,
      user: mapUserRowToAuthUser(userRow),
      token
    },
    201,
    request
  );
}
