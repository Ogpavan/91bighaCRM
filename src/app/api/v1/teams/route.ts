import { NextResponse } from "next/server";
import { withDbClient } from "@/lib/db";
import { ensureCrmAuthSchema } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    await ensureCrmAuthSchema();
    const teams = await withDbClient(async (client) => {
      const result = await client.query<{ id: string; name: string; description: string | null }>(
        "select id::text as id, name, description from teams order by name"
      );
      return result.rows;
    });

    return withCors(
      NextResponse.json({
        success: true,
        items: teams
      }),
      request
    );
  } catch (error) {
    return withCors(
      NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unable to load teams."
      },
      { status: 500 }
    ),
      request
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureCrmAuthSchema();
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      throw new Error("Team name is required.");
    }

    const description = typeof body.description === "string" ? body.description.trim() : null;

    const team = await withDbClient(async (client) => {
      const existing = await client.query<{ id: string }>(
        "select id::text as id from teams where lower(name) = lower($1)",
        [name]
      );
      if (existing.rows.length > 0) {
        throw new Error("A team with that name already exists.");
      }

      const result = await client.query<{ id: string; name: string; description: string | null }>(
        `
          insert into teams (name, description, is_active, created_at, updated_at)
          values ($1, $2, true, now(), now())
          returning id::text as id, name, description
        `,
        [name, description]
      );

      return result.rows[0];
    });

    return withCors(
      NextResponse.json({
        success: true,
        team
      }),
      request
    );
  } catch (error) {
    return withCors(
      NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unable to create team."
      },
      { status: 400 }
    ),
      request
    );
  }
}
