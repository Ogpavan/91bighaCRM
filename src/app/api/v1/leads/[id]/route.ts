import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { deleteLead, getLeadById, updateLead } from "@/lib/crm-leads";
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
    const lead = await getLeadById(id, auth);

    return withCors(NextResponse.json({ success: true, lead }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 404;
    const message = error instanceof Error ? error.message : "Unable to fetch lead.";

    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = requirePermission(request, "edit_leads");
    const { id } = await context.params;
    const body = await request.json();
    const lead = await updateLead(id, body, auth);

    return withCors(
      NextResponse.json({
        success: true,
        lead,
        message: "Lead updated successfully."
      }),
      request
    );
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to update lead.";

    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = requirePermission(request, "delete_leads");
    const { id } = await context.params;
    await deleteLead(id, auth);

    return withCors(
      NextResponse.json({
        success: true,
        message: "Lead deleted successfully."
      }),
      request
    );
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to delete lead.";

    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
