export type TaskStatus = "Pending" | "In Progress" | "Completed" | "Cancelled";
export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";
export type TaskType = "Follow-up" | "Site Visit" | "Payment Reminder" | "Document Collection" | "Internal";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  type: TaskType | string;
  status: TaskStatus | string;
  priority: TaskPriority | string;
  dueDate: string | null;
  completedAt: string | null;
  assignedTo: string;
  assignedToName: string | null;
  createdBy: string;
  createdByName: string | null;
  leadId: string | null;
  leadName: string | null;
  projectId: string | null;
  projectName: string | null;
  bookingId: string | null;
  createdAt: string;
  updatedAt: string | null;
  isDeleted: boolean;
};

export type TaskActivity = {
  type: string;
  text: string;
  at: string | null;
  by: string | null;
};

export type TaskDetail = Task & {
  activityHistory: TaskActivity[];
};

export type TaskSummary = {
  dueToday: number;
  overdue: number;
  completedToday: number;
  upcoming: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    status: string;
    priority: string;
  }>;
};

export type TaskPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
