import { NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import { createProjectEntity, listProjectsEntity } from "@/lib/projects-entity";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    requireAuth(request);
    const items = await listProjectsEntity();

    return withCors(NextResponse.json({ success: true, items }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to fetch projects.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}

export async function POST(request: Request) {
  try {
    requireAuth(request);
    const body = await request.json();
    const project = await createProjectEntity(body);

    return withCors(
      NextResponse.json({
        success: true,
        project,
        message: "Project created successfully."
      }),
      request
    );
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to create project.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
