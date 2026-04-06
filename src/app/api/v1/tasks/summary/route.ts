import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import { getTaskSummary } from "@/lib/crm-tasks";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    const auth = requirePermission(request, "view_tasks");
    const summary = await getTaskSummary(auth);
    return withCors(NextResponse.json({ success: true, summary }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to fetch task summary.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
