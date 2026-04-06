import { NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import { searchGlobal } from "@/lib/global-search";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    const url = new URL(request.url);
    const q = url.searchParams.get("q") || "";
    const items = await searchGlobal(q, auth);
    return withCors(NextResponse.json({ success: true, items }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to search.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
