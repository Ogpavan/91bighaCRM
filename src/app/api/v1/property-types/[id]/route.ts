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

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requirePermission(request, "manage_users");
    const { id } = await context.params;
    const propertyTypeId = Number(id);
    if (!Number.isInteger(propertyTypeId) || propertyTypeId <= 0) {
      throw new Error("Invalid property type identifier.");
    }

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
      const duplicate = await client.query<{ id: string }>(
        "select id::text as id from property_types where (lower(name) = lower($1) or slug = $2) and id <> $3 limit 1",
        [name, slug, propertyTypeId]
      );
      if (duplicate.rows.length) {
        throw new Error("A property type with this name already exists.");
      }

      const result = await client.query<{ id: string; name: string; slug: string; property_count: string }>(
        `
          update property_types
          set name = $1, slug = $2
          where id = $3
          returning
            id::text as id,
            name,
            slug,
            (
              select count(*)::text
              from properties p
              where p.property_type_id = property_types.id and p.deleted_at is null
            ) as property_count
        `,
        [name, slug, propertyTypeId]
      );

      if (!result.rows.length) {
        throw new Error("Property type not found.");
      }

      return result.rows[0];
    });

    return withCors(NextResponse.json({ success: true, propertyType }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    return withCors(
      NextResponse.json(
        { success: false, message: error instanceof Error ? error.message : "Unable to update property type." },
        { status }
      ),
      request
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requirePermission(request, "manage_users");
    const { id } = await context.params;
    const propertyTypeId = Number(id);
    if (!Number.isInteger(propertyTypeId) || propertyTypeId <= 0) {
      throw new Error("Invalid property type identifier.");
    }

    await withDbClient(async (client) => {
      const inUse = await client.query<{ count: string }>(
        "select count(*)::text as count from properties where property_type_id = $1 and deleted_at is null",
        [propertyTypeId]
      );
      if (Number(inUse.rows[0]?.count ?? 0) > 0) {
        throw new Error("This property type is used by properties. Reassign them before deleting it.");
      }

      const deleted = await client.query<{ id: string }>(
        "delete from property_types where id = $1 returning id::text as id",
        [propertyTypeId]
      );
      if (!deleted.rows.length) {
        throw new Error("Property type not found.");
      }
    });

    return withCors(NextResponse.json({ success: true, message: "Property type deleted successfully." }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    return withCors(
      NextResponse.json(
        { success: false, message: error instanceof Error ? error.message : "Unable to delete property type." },
        { status }
      ),
      request
    );
  }
}
