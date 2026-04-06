import { apiRequest } from "@/lib/api";
import type {
  AgentPerformanceItem,
  LeadSummaryReport,
  ProjectPerformanceItem,
  ReportFilters,
  SalesSummaryReport,
  SourcePerformanceItem,
  TaskSummaryReport
} from "@/lib/reports-types";

type Wrapped<T> = {
  success: boolean;
  data: T;
};

const normalizeLeadSummary = (payload?: Partial<LeadSummaryReport> | null): LeadSummaryReport => ({
  totalLeads: Number(payload?.totalLeads ?? 0),
  newLeads: Number(payload?.newLeads ?? 0),
  convertedLeads: Number(payload?.convertedLeads ?? 0),
  lostLeads: Number(payload?.lostLeads ?? 0),
  conversionRate: Number(payload?.conversionRate ?? 0)
});

const normalizeSalesSummary = (payload?: Partial<SalesSummaryReport> | null): SalesSummaryReport => ({
  totalBookings: Number(payload?.totalBookings ?? 0),
  totalRevenue: Number(payload?.totalRevenue ?? 0),
  averageDealSize: Number(payload?.averageDealSize ?? 0),
  pendingPayments: Number(payload?.pendingPayments ?? 0),
  bookingsThisMonth: Number(payload?.bookingsThisMonth ?? 0),
  revenueByMonth: Array.isArray(payload?.revenueByMonth)
    ? payload.revenueByMonth.map((item) => ({
        month: String(item?.month ?? ""),
        revenue: Number(item?.revenue ?? 0),
        bookings: Number(item?.bookings ?? 0)
      }))
    : []
});

const normalizeTaskSummary = (payload?: Partial<TaskSummaryReport> | null): TaskSummaryReport => ({
  totalTasks: Number(payload?.totalTasks ?? 0),
  completedTasks: Number(payload?.completedTasks ?? 0),
  overdueTasks: Number(payload?.overdueTasks ?? 0),
  tasksByType: Array.isArray(payload?.tasksByType)
    ? payload.tasksByType.map((item) => ({
        type: String(item?.type ?? ""),
        total: Number(item?.total ?? 0)
      }))
    : [],
  tasksByUser: Array.isArray(payload?.tasksByUser)
    ? payload.tasksByUser.map((item) => ({
        user: String(item?.user ?? ""),
        total: Number(item?.total ?? 0)
      }))
    : []
});

const buildQuery = (filters: ReportFilters): string => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
};

export async function getLeadSummaryReport(filters: ReportFilters): Promise<LeadSummaryReport> {
  const response = await apiRequest<Wrapped<LeadSummaryReport>>(`/api/v1/reports/lead-summary${buildQuery(filters)}`);
  return normalizeLeadSummary(response.data);
}

export async function getSourcePerformanceReport(filters: ReportFilters): Promise<SourcePerformanceItem[]> {
  const response = await apiRequest<Wrapped<SourcePerformanceItem[]>>(`/api/v1/reports/source-performance${buildQuery(filters)}`);
  return response.data;
}

export async function getAgentPerformanceReport(filters: ReportFilters): Promise<AgentPerformanceItem[]> {
  const response = await apiRequest<Wrapped<AgentPerformanceItem[]>>(`/api/v1/reports/agent-performance${buildQuery(filters)}`);
  return response.data;
}

export async function getProjectPerformanceReport(filters: ReportFilters): Promise<ProjectPerformanceItem[]> {
  const response = await apiRequest<Wrapped<ProjectPerformanceItem[]>>(`/api/v1/reports/project-performance${buildQuery(filters)}`);
  return response.data;
}

export async function getSalesSummaryReport(filters: ReportFilters): Promise<SalesSummaryReport> {
  const response = await apiRequest<Wrapped<SalesSummaryReport>>(`/api/v1/reports/sales-summary${buildQuery(filters)}`);
  return normalizeSalesSummary(response.data);
}

export async function getTaskSummaryReport(filters: ReportFilters): Promise<TaskSummaryReport> {
  const response = await apiRequest<Wrapped<TaskSummaryReport>>(`/api/v1/reports/task-summary${buildQuery(filters)}`);
  return normalizeTaskSummary(response.data);
}
