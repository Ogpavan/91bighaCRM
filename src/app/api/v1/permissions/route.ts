import { NextResponse } from "next/server";
import { withDbClient } from "@/lib/db";
import { AuthError, ensureCrmAuthSchema, requirePermission } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    requirePermission(request, "manage_users");
    await ensureCrmAuthSchema();

    const items = await withDbClient(async (client) => {
      const result = await client.query<{ key: string; description: string | null }>(
        `
          select
            permission_key as key,
            description
          from permissions
          order by permission_key asc
        `
      );
      return result.rows;
    });

    return withCors(NextResponse.json({ success: true, items }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    return withCors(
      NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : "Unable to load permissions."
        },
        { status }
      ),
      request
    );
  }
}
