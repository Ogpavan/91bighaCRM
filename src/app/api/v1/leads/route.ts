import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { createLead, listLeads } from "@/lib/crm-leads";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    const auth = requirePermission(request, "view_leads");

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "10")));

    const response = await listLeads(
      {
        page,
        limit,
        status: url.searchParams.get("status"),
        assignedTo: url.searchParams.get("assignedTo"),
        telecaller: url.searchParams.get("telecaller"),
        source: url.searchParams.get("source"),
        project: url.searchParams.get("project"),
        fromDate: url.searchParams.get("fromDate"),
        toDate: url.searchParams.get("toDate"),
        search: url.searchParams.get("search")
      },
      auth
    );

    return withCors(
      NextResponse.json({
        success: true,
        items: response.items,
        pagination: response.pagination
      }),
      request
    );
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to fetch leads.";

    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}

export async function POST(request: Request) {
  try {
    const auth = requirePermission(request, "create_leads");
    const body = await request.json();
    const lead = await createLead(body, auth.userId);

    return withCors(
      NextResponse.json({
        success: true,
        lead,
        message: "Lead created successfully."
      }),
      request
    );
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to create lead.";

    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
