import { apiRequest } from "@/api/api";
import type { Task, TaskDetail, TaskPagination, TaskSummary } from "@/api/tasks-types";

export type TaskFilters = {
  page?: number;
  limit?: number;
  assignedTo?: string;
  status?: string;
  priority?: string;
  type?: string;
  fromDate?: string;
  toDate?: string;
  leadId?: string;
  projectId?: string;
};

export type CreateTaskPayload = {
  title: string;
  description?: string;
  type: string;
  status?: string;
  priority: string;
  dueDate?: string;
  assignedTo: string;
  leadId?: string;
  projectId?: string;
  bookingId?: string;
};

type TasksResponse = {
  success: boolean;
  items: Task[];
  pagination: TaskPagination;
};

type TaskResponse = {
  success: boolean;
  task: TaskDetail;
};

type TaskSummaryResponse = {
  success: boolean;
  summary: TaskSummary;
};

type TaskMetaResponse = {
  success: boolean;
  types: string[];
  statuses: string[];
  priorities: string[];
};

const normalizeTaskSummary = (summary?: Partial<TaskSummary> | null): TaskSummary => ({
  dueToday: Number(summary?.dueToday ?? 0),
  overdue: Number(summary?.overdue ?? 0),
  completedToday: Number(summary?.completedToday ?? 0),
  upcoming: Array.isArray(summary?.upcoming)
    ? summary.upcoming.map((task) => ({
        id: String(task?.id ?? ""),
        title: String(task?.title ?? ""),
        dueDate: task?.dueDate ?? null,
        status: String(task?.status ?? ""),
        priority: String(task?.priority ?? "")
      }))
    : []
});

export async function getTasks(filters: TaskFilters): Promise<{ items: Task[]; pagination: TaskPagination }> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  const response = await apiRequest<TasksResponse>(`/api/v1/tasks${queryString ? `?${queryString}` : ""}`);
  return {
    items: response.items,
    pagination: response.pagination
  };
}

export async function getTaskById(taskId: string): Promise<TaskDetail> {
  const response = await apiRequest<TaskResponse>(`/api/v1/tasks/${taskId}`);
  return response.task;
}

export async function createTask(payload: CreateTaskPayload): Promise<TaskDetail> {
  const response = await apiRequest<TaskResponse>("/api/v1/tasks", {
    method: "POST",
    body: payload
  });
  return response.task;
}

export async function updateTask(taskId: string, payload: Partial<CreateTaskPayload>): Promise<TaskDetail> {
  const response = await apiRequest<TaskResponse>(`/api/v1/tasks/${taskId}`, {
    method: "PUT",
    body: payload
  });
  return response.task;
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiRequest<{ success: boolean; message: string }>(`/api/v1/tasks/${taskId}`, {
    method: "DELETE"
  });
}

export async function completeTask(taskId: string): Promise<TaskDetail> {
  const response = await apiRequest<TaskResponse>(`/api/v1/tasks/${taskId}/complete`, {
    method: "PUT"
  });
  return response.task;
}

export async function getTaskSummary(): Promise<TaskSummary> {
  const response = await apiRequest<TaskSummaryResponse>("/api/v1/tasks/summary");
  return normalizeTaskSummary(response.summary);
}

export async function getTaskMeta(): Promise<{ types: string[]; statuses: string[]; priorities: string[] }> {
  const response = await apiRequest<TaskMetaResponse>("/api/v1/tasks/meta");
  return {
    types: response.types,
    statuses: response.statuses,
    priorities: response.priorities
  };
}
