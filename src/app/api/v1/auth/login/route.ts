import { NextResponse } from "next/server";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import {
  createAuthToken,
  ensureCrmAuthSchema,
  getUserPermissions,
  mapUserRowToAuthUser,
  normalizeEmail,
  verifyPassword
} from "@/lib/crm-auth";
import { withDbClient } from "@/lib/db";

type LoginPayload = {
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
  password_hash: string | null;
};

function jsonResponse(data: unknown, status: number, request: Request) {
  return withCors(NextResponse.json(data, { status }), request);
}

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function POST(request: Request) {
  let payload: LoginPayload;
  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return jsonResponse({ success: false, message: "Invalid JSON payload." }, 400, request);
  }

  const email = normalizeEmail(String(payload.email || ""));
  const password = String(payload.password || "");

  if (!email || !password) {
    return jsonResponse({ success: false, message: "Email and password are required." }, 400, request);
  }

  await ensureCrmAuthSchema();

  const userRow = await withDbClient(async (client) => {
    const result = await client.query<UserRow>(
      `
        select
          u.id::text as id,
          u.name,
          u.email,
          u.phone,
          u.role_id::text as role_id,
          r.name as role,
          u.team_id::text as team_id,
          u.is_active,
          u.created_at::text as created_at,
          u.password_hash
        from users u
        left join roles r on r.id = u.role_id
        where lower(u.email) = lower($1)
        limit 1
      `,
      [email]
    );

    return result.rows[0] || null;
  });

  if (!userRow || !userRow.password_hash || !verifyPassword(password, userRow.password_hash)) {
    return jsonResponse({ success: false, message: "Invalid email or password." }, 401, request);
  }

  if (!userRow.is_active) {
    return jsonResponse({ success: false, message: "Your account is inactive. Please contact admin to activate it." }, 403, request);
  }

  const permissions = await getUserPermissions(String(userRow.id));
  const token = createAuthToken({ id: String(userRow.id), role: userRow.role }, permissions);

  await withDbClient(async (client) => {
    await client.query("update users set last_login_at = now() where id = $1", [String(userRow.id)]);
  });

  return jsonResponse(
    {
      success: true,
      user: mapUserRowToAuthUser(userRow),
      token
    },
    200,
    request
  );
}
