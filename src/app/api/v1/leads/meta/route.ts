import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { getLeadsMetadata } from "@/lib/crm-leads";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    requirePermission(request, "view_leads");
    const meta = await getLeadsMetadata();

    return withCors(
      NextResponse.json({
        success: true,
        ...meta
      }),
      request
    );
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to fetch lead metadata.";

    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
