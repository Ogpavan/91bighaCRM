import { NextResponse } from "next/server";
import { withDbClient } from "@/lib/db";
import { ensureCrmAuthSchema, hashPassword, mapUserRowToAuthUser } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";

type CreateUserPayload = {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  roleId?: number;
  roleName?: string;
  roleSlug?: string;
  teamId?: number;
};

type CreatedUserRow = {
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

export async function GET(request: Request) {
  try {
    await ensureCrmAuthSchema();
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    const users = await withDbClient(async (client) => {
      const result = await client.query<{
        id: string;
        name: string;
        email: string;
        phone: string | null;
        role_id: string;
        role: string;
        team_id: string | null;
        team_name: string | null;
        is_active: boolean;
        created_at: string;
      }>(
        `
          select
            u.id::text as id,
            u.name,
            u.email,
            u.phone,
            u.role_id::text as role_id,
            r.name as role,
            u.team_id::text as team_id,
            t.name as team_name,
            u.is_active,
            u.created_at::text as created_at
          from users u
          join roles r on r.id = u.role_id
          left join teams t on t.id = u.team_id
          order by u.created_at desc
          limit $1
          offset $2
        `,
        [limit, offset]
      );
      return result.rows;
    });

    const total = await withDbClient(async (client) => {
      const countResult = await client.query<{ count: string }>("select count(*)::text as count from users");
      return Number(countResult.rows[0]?.count ?? 0);
    });

    return withCors(
      NextResponse.json({
        success: true,
        items: users.map((user) => ({
          id: user.id,
          fullName: user.name,
          email: user.email,
          phone: user.phone,
          roleId: Number(user.role_id),
          role: user.role,
          teamId: user.team_id,
          team: user.team_id && user.team_name ? { id: user.team_id, name: user.team_name } : null,
          isActive: user.is_active,
          createdAt: user.created_at
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit))
        }
      }),
      request
    );
  } catch (error) {
    return withCors(
      NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : "Unable to fetch users."
        },
        { status: 500 }
      ),
      request
    );
  }
}

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function POST(request: Request) {
  try {
    await ensureCrmAuthSchema();
    const body = (await request.json()) as CreateUserPayload;
    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const phone = body.phone?.trim() || null;
    const roleId = body.roleId ? Number(body.roleId) : null;
    const teamId = body.teamId ? Number(body.teamId) : null;
    const roleName = body.roleName?.trim();
    const roleSlug = body.roleSlug?.trim().toLowerCase();

    if (!fullName || !email || !password) {
      throw new Error("Full name, email, password, and role are required.");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }

    const user = await withDbClient(async (client) => {
      const existing = await client.query<{ id: string }>("select id::text as id from users where lower(email) = lower($1)", [email]);
      if (existing.rows.length > 0) {
        throw new Error("An account with this email already exists.");
      }

      let selectedRoleId = roleId;
      let roleResult;

      if (selectedRoleId) {
        roleResult = await client.query<{ name: string }>("select name from roles where id = $1", [selectedRoleId]);
      } else if (roleSlug) {
        roleResult = await client.query<{ id: string; name: string }>("select id::text as id, name from roles where slug = $1", [
          roleSlug
        ]);
        selectedRoleId = roleResult.rows[0]?.id ? Number(roleResult.rows[0].id) : null;
      } else if (roleName) {
        roleResult = await client.query<{ id: string; name: string }>("select id::text as id, name from roles where lower(name) = lower($1)", [
          roleName
        ]);
        selectedRoleId = roleResult.rows[0]?.id ? Number(roleResult.rows[0].id) : null;
      }

      if (!roleResult?.rows.length || !selectedRoleId) {
        throw new Error("Role not found.");
      }

      const teamIdValue = teamId && teamId > 0 ? teamId : null;
      if (teamIdValue) {
        const teamResult = await client.query("select id from teams where id = $1", [teamIdValue]);
        if (!teamResult.rows.length) {
          throw new Error("Team not found.");
        }
      }

      const hashedPassword = hashPassword(password);

      const result = await client.query<CreatedUserRow>(
        `
          insert into users (name, email, phone, role, role_id, team_id, password_hash, is_active, created_at, updated_at)
          values ($1, $2, $3, $4, $5, $6, $7, true, now(), now())
          returning id::text as id, name, email, phone, role, role_id::text as role_id, team_id::text as team_id, is_active, created_at::text as created_at
        `,
        [fullName, email, phone, roleResult.rows[0].name, selectedRoleId, teamIdValue, hashedPassword]
      );

      return result.rows[0];
    });

    return withCors(
      NextResponse.json({
        success: true,
        user: mapUserRowToAuthUser(user),
        message: "User created successfully."
      }),
      request
    );
  } catch (error) {
    return withCors(
      NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : "Unable to create user."
        },
        { status: 400 }
      ),
      request
    );
  }
}
