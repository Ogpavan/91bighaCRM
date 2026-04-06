import { NextResponse } from "next/server";
import { withDbClient } from "@/lib/db";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import {
  createAuthToken,
  ensureCrmAuthSchema,
  getUserPermissions,
  mapUserRowToAuthUser,
  normalizeEmail,
  verifyPassword
} from "@/lib/crm-auth";

type LoginRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role_id: string;
  role: string;
  team_id: string | null;
  is_active: boolean;
  created_at: string;
  password_hash: string | null;
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
    const body = await request.json();
    const email = normalizeEmail(getRequiredString(body.email, "Email"));
    const password = getRequiredString(body.password, "Password");

    const user = await withDbClient(async (client) => {
      const result = await client.query<LoginRow>(
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
          join roles r on r.id = u.role_id
          where lower(u.email) = lower($1)
          limit 1
        `,
        [email]
      );

      const row = result.rows[0];

      if (!row || !row.password_hash) {
        throw new Error("Invalid email or password.");
      }

      if (!row.is_active) {
        throw new Error("This account is inactive.");
      }

      if (!verifyPassword(password, row.password_hash)) {
        throw new Error("Invalid email or password.");
      }

      await client.query("update users set last_login_at = now(), updated_at = now() where id = $1", [row.id]);
      return row;
    });

    const authUser = mapUserRowToAuthUser(user);
    const permissions = await getUserPermissions(authUser.id);
    const token = createAuthToken(authUser, permissions);

    return withCors(
      NextResponse.json({
        success: true,
        user: authUser,
        token
      }),
      request
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sign in.";
    const status = message === "Invalid email or password." || message === "This account is inactive." ? 401 : 400;

    return withCors(
      NextResponse.json(
        {
          success: false,
          message
        },
        { status }
      ),
      request
    );
  }
}
