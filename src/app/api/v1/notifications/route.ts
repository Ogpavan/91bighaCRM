import { NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import { listNotifications } from "@/lib/crm-notifications";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    const url = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || "12")));
    const response = await listNotifications(auth.userId, limit);

    return withCors(NextResponse.json({ success: true, items: response.items, unreadCount: response.unreadCount }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to load notifications.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
