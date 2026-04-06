import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/app-settings";
import { withDbClient } from "@/lib/db";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import {
  createAuthToken,
  ensureCrmAuthSchema,
  getDefaultRoleSlug,
  getRoleByName,
  getUserPermissions,
  getRoleBySlug,
  hashPassword,
  mapUserRowToAuthUser,
  normalizeEmail
} from "@/lib/crm-auth";

type RegisterRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role_id: string;
  role: string;
  team_id: string | null;
  is_active: boolean;
  created_at: string;
};

function getRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
}

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function POST(request: Request) {
  try {
    await ensureCrmAuthSchema();
    const settings = await getAppSettings();
    if (!settings.allow_user_signup) {
      throw new Error("User signup is currently disabled.");
    }

    const body = await request.json();
    const fullName = getRequiredString(body.fullName, "Full name");
    const email = normalizeEmail(getRequiredString(body.email, "Email"));
    const password = getRequiredString(body.password, "Password");
    const passwordHash = hashPassword(password);
    const requestedRoleSlug =
      typeof body.roleSlug === "string" && body.roleSlug.trim() ? body.roleSlug.trim().toLowerCase() : null;
    const requestedRoleName =
      typeof body.roleName === "string" && body.roleName.trim() ? body.roleName.trim() : null;

    const defaultRole = requestedRoleSlug
      ? await getRoleBySlug(requestedRoleSlug)
      : requestedRoleName
        ? await getRoleByName(requestedRoleName)
        : await getRoleBySlug(getDefaultRoleSlug());

    if (!defaultRole) {
      throw new Error("Selected CRM role is missing.");
    }

    const user = await withDbClient(async (client) => {
      const existing = await client.query<{ id: string }>(
        "select id::text as id from users where lower(email) = lower($1) limit 1",
        [email]
      );

      if (existing.rows.length > 0) {
        throw new Error("An account with this email already exists.");
      }

      const result = await client.query<RegisterRow>(
        `
          insert into users (name, email, role, role_id, password_hash, is_active)
          values ($1, $2, $3, $4, $5, true)
          returning id::text as id, name, email, phone, role_id::text as role_id, role, team_id::text as team_id, is_active, created_at::text as created_at
        `,
        [fullName, email, defaultRole.name, Number(defaultRole.id), passwordHash]
      );

      return result.rows[0];
    });

    const authUser = mapUserRowToAuthUser(user);
    const permissions = await getUserPermissions(authUser.id);
    const token = createAuthToken(authUser, permissions);

    return withCors(
      NextResponse.json({
        success: true,
        user: authUser,
        token,
        message: "Account created successfully."
      }),
      request
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account.";

    return withCors(
      NextResponse.json(
        {
          success: false,
          message
        },
        { status: 400 }
      ),
      request
    );
  }
}
