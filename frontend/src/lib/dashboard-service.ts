import { apiRequest } from "@/lib/api";
import type { DashboardSummary } from "@/lib/dashboard-types";

type DashboardSummaryResponse = {
  success: boolean;
  summary: DashboardSummary;
};

export async function getDashboardSummary() {
  const response = await apiRequest<DashboardSummaryResponse>("/api/v1/dashboard/summary");
  return response.summary;
}
