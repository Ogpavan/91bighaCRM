import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/crm-auth";
import { createTask, listTasks } from "@/lib/crm-tasks";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    const auth = requirePermission(request, "view_tasks");
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "10")));

    const response = await listTasks(
      {
        page,
        limit,
        assignedTo: url.searchParams.get("assignedTo"),
        status: url.searchParams.get("status"),
        priority: url.searchParams.get("priority"),
        type: url.searchParams.get("type"),
        fromDate: url.searchParams.get("fromDate"),
        toDate: url.searchParams.get("toDate"),
        leadId: url.searchParams.get("leadId"),
        projectId: url.searchParams.get("projectId")
      },
      auth
    );

    return withCors(NextResponse.json({ success: true, items: response.items, pagination: response.pagination }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to fetch tasks.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}

export async function POST(request: Request) {
  try {
    const auth = requirePermission(request, "create_tasks");
    const body = await request.json();
    const task = await createTask(body, auth);

    return withCors(
      NextResponse.json({
        success: true,
        task,
        message: "Task created successfully."
      }),
      request
    );
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to create task.";
    return withCors(NextResponse.json({ success: false, message }, { status }), request);
  }
}
