import { NextResponse } from "next/server";
import { withDbClient } from "@/lib/db";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";

function slugifyPropertyType(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    const items = await withDbClient(async (client) => {
      const result = await client.query<{ id: string; name: string; slug: string; property_count: string }>(
        `
          select
            pt.id::text as id,
            pt.name,
            pt.slug,
            count(p.id)::text as property_count
          from property_types pt
          left join properties p on p.property_type_id = pt.id and p.deleted_at is null
          group by pt.id, pt.name, pt.slug
          order by pt.name asc
        `
      );
      return result.rows;
    });

    return withCors(NextResponse.json({ success: true, items }), request);
  } catch (error) {
    return withCors(
      NextResponse.json(
        { success: false, message: error instanceof Error ? error.message : "Unable to load property types." },
        { status: 500 }
      ),
      request
    );
  }
}

export async function POST(request: Request) {
  try {
    requirePermission(request, "manage_users");
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      throw new Error("Property type name is required.");
    }

    const slug = slugifyPropertyType(name);
    if (!slug) {
      throw new Error("Property type name must contain letters or numbers.");
    }

    const propertyType = await withDbClient(async (client) => {
      const existing = await client.query<{ id: string }>(
        "select id::text as id from property_types where lower(name) = lower($1) or slug = $2 limit 1",
        [name, slug]
      );
      if (existing.rows.length) {
        throw new Error("A property type with this name already exists.");
      }

      const result = await client.query<{ id: string; name: string; slug: string; property_count: string }>(
        `
          insert into property_types (name, slug)
          values ($1, $2)
          returning id::text as id, name, slug, '0'::text as property_count
        `,
        [name, slug]
      );
      return result.rows[0];
    });

    return withCors(NextResponse.json({ success: true, propertyType }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    return withCors(
      NextResponse.json(
        { success: false, message: error instanceof Error ? error.message : "Unable to create property type." },
        { status }
      ),
      request
    );
  }
}
