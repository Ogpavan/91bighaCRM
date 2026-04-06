import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { completeTask } from "@/lib/crm-tasks";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";

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
    const auth = requirePermission(request, "edit_tasks");
    const { id } = await context.params;
    const task = await completeTask(id, auth);
    return withCors(NextResponse.json({ success: true, task, message: "Task marked as complete." }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to complete task.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
