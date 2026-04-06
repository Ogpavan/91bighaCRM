import { NextResponse } from "next/server";
import { getAppSettings, updateAppSettings } from "@/lib/app-settings";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    const settings = await getAppSettings();
    const response = NextResponse.json({
      success: true,
      settings
    });
    response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return withCors(response, request);
  } catch (error) {
    return withCors(
      NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : "Unable to fetch settings."
        },
        { status: 500 }
      ),
      request
    );
  }
}

export async function PUT(request: Request) {
  try {
    requirePermission(request, "manage_settings");
    const payload = await request.json();
    const settings = await updateAppSettings(payload);

    return withCors(
      NextResponse.json({
        success: true,
        settings
      }),
      request
    );
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    return withCors(
      NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : "Unable to save settings."
        },
        { status }
      ),
      request
    );
  }
}
