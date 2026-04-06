import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import { getLeadSummaryReport, parseReportFilters } from "@/lib/report-aggregates";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    requirePermission(request, "view_reports");
    const data = await getLeadSummaryReport(parseReportFilters(request));
    return withCors(NextResponse.json({ success: true, data }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to load lead summary.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
