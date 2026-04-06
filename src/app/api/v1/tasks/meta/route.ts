import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { withCors, createCorsPreflightResponse } from "@/lib/cors";
import { getTaskMeta } from "@/lib/crm-tasks";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    requirePermission(request, "view_tasks");
    const meta = await getTaskMeta();
    return withCors(NextResponse.json({ success: true, ...meta }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to fetch task metadata.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
