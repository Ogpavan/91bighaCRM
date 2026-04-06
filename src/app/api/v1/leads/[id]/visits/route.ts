import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { addLeadVisit, listLeadVisits } from "@/lib/crm-leads";
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
    const items = await listLeadVisits(id, auth);
    return withCors(NextResponse.json({ success: true, items }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 404;
    const message = error instanceof Error ? error.message : "Unable to fetch visits.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = requirePermission(request, "edit_leads");
    const { id } = await context.params;
    const body = await request.json();
    const visit = await addLeadVisit(id, body, auth);

    return withCors(
      NextResponse.json({
        success: true,
        visit,
        message: "Visit added successfully."
      }),
      request
    );
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to add visit.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
