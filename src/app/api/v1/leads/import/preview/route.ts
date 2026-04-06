import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import { previewLeadImport } from "@/lib/crm-leads-import";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function POST(request: Request) {
  try {
    requirePermission(request, "create_leads");
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new Error("A CSV or Excel file is required.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = await previewLeadImport(buffer);

    return withCors(NextResponse.json({ success: true, ...preview }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to preview lead import file.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
