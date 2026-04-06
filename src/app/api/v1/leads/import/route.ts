import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import { importLeadsFromFile, LEAD_IMPORT_FIELDS, type LeadImportField } from "@/lib/crm-leads-import";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function POST(request: Request) {
  try {
    const auth = requirePermission(request, "create_leads");
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new Error("A CSV or Excel file is required.");
    }

    const mappings = LEAD_IMPORT_FIELDS.reduce((accumulator, field) => {
      const value = formData.get(`mapping_${field}`);
      if (typeof value === "string" && value.trim()) {
        accumulator[field] = value.trim();
      }
      return accumulator;
    }, {} as Partial<Record<LeadImportField, string>>);

    const defaultSourceIdRaw = formData.get("defaultSourceId");
    const defaultStatusIdRaw = formData.get("defaultStatusId");
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await importLeadsFromFile({
      fileBuffer: buffer,
      mappings,
      defaultSourceId: typeof defaultSourceIdRaw === "string" && defaultSourceIdRaw ? Number(defaultSourceIdRaw) : null,
      defaultStatusId: typeof defaultStatusIdRaw === "string" && defaultStatusIdRaw ? Number(defaultStatusIdRaw) : null,
      actorUserId: auth.userId
    });

    return withCors(
      NextResponse.json({
        success: true,
        ...result,
        message: `Imported ${result.importedCount} leads${result.failedCount ? `, ${result.failedCount} failed` : ""}.`
      }),
      request
    );
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to import leads.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
