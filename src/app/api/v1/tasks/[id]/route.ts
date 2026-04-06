import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import { deleteTask, getTaskById, updateTask } from "@/lib/crm-tasks";

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

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = requirePermission(request, "view_tasks");
    const { id } = await context.params;
    const task = await getTaskById(id, auth);
    return withCors(NextResponse.json({ success: true, task }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 404;
    const message = error instanceof Error ? error.message : "Unable to fetch task.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = requirePermission(request, "edit_tasks");
    const { id } = await context.params;
    const body = await request.json();
    const task = await updateTask(id, body, auth);
    return withCors(NextResponse.json({ success: true, task, message: "Task updated successfully." }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to update task.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = requirePermission(request, "delete_tasks");
    const { id } = await context.params;
    await deleteTask(id, auth);
    return withCors(NextResponse.json({ success: true, message: "Task deleted successfully." }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to delete task.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
