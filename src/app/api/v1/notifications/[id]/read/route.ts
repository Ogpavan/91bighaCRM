import { NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import { markNotificationRead } from "@/lib/crm-notifications";

type RouteContext = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
};

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = requireAuth(request);
    const { id } = await context.params;
    const notification = await markNotificationRead(id, auth.userId);
    return withCors(NextResponse.json({ success: true, notification }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to update notification.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
