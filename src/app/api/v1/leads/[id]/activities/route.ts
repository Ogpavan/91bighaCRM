import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { listLeadActivities } from "@/lib/crm-leads";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";

type RouteContext = {
  params: Promise<{
    id: string;
  }> | {
    id: string;
  };
};

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = requirePermission(request, "view_leads");
    const { id } = await context.params;
    const items = await listLeadActivities(id, auth);
    return withCors(NextResponse.json({ success: true, items }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 404;
    const message = error instanceof Error ? error.message : "Unable to fetch activities.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
