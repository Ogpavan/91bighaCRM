import { apiRequest } from "@/api/api";
import type { DashboardSummary } from "@/api/dashboard-types";

type DashboardSummaryResponse = {
  success: boolean;
  summary: DashboardSummary;
};

export async function getDashboardSummary() {
  const response = await apiRequest<DashboardSummaryResponse>("/api/v1/dashboard/summary");
  return response.summary;
}
