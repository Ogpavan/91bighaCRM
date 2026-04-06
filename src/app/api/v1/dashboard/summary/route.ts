import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import { getDashboardSummary } from "@/lib/dashboard-summary";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    const auth = requirePermission(request, "view_dashboard");
    const summary = await getDashboardSummary(auth);

    return withCors(NextResponse.json({ success: true, summary }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to load dashboard summary.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
