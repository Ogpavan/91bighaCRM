import { NextResponse } from "next/server";
import { AuthError } from "@/lib/crm-auth";
import { withCors } from "@/lib/cors";

export function jsonResponse(data: unknown, status: number, request: Request) {
  return withCors(NextResponse.json(data, { status }), request);
}

export function handleApiError(error: unknown, request: Request) {
  if (error instanceof AuthError) {
    return jsonResponse({ success: false, message: error.message }, error.status, request);
  }

  const message = error instanceof Error ? error.message : "Request failed.";
  return jsonResponse({ success: false, message }, 500, request);
}