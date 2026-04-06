export type ReportFilters = {
  fromDate?: string;
  toDate?: string;
  projectId?: string;
  agentId?: string;
};

export type LeadSummaryReport = {
  totalLeads: number;
  newLeads: number;
  convertedLeads: number;
  lostLeads: number;
  conversionRate: number;
};

export type SourcePerformanceItem = {
  sourceName: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
};

export type AgentPerformanceItem = {
  agentId: string;
  agentName: string;
  totalLeadsAssigned: number;
  siteVisitsDone: number;
  bookingsClosed: number;
  conversionRate: number;
  revenueGenerated: number;
};

export type ProjectPerformanceItem = {
  projectId: string;
  projectName: string;
  totalLeads: number;
  siteVisits: number;
  bookings: number;
  revenue: number;
};

export type SalesSummaryReport = {
  totalBookings: number;
  totalRevenue: number;
  averageDealSize: number;
  pendingPayments: number;
  bookingsThisMonth: number;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    bookings: number;
  }>;
};

export type TaskSummaryReport = {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  tasksByType: Array<{ type: string; total: number }>;
  tasksByUser: Array<{ user: string; total: number }>;
};
