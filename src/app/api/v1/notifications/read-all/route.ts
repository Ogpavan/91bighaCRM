import { NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import { markAllNotificationsRead } from "@/lib/crm-notifications";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request);
    await markAllNotificationsRead(auth.userId);
    return withCors(NextResponse.json({ success: true, message: "All notifications marked as read." }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to update notifications.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
