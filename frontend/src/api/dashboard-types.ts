export type DashboardLabeledCount = {
  label: string;
  count: number;
};

export type DashboardTaskItem = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  priority: string;
};

export type DashboardTaskSummary = {
  dueToday: number;
  overdue: number;
  completedToday: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  upcoming: DashboardTaskItem[];
};

export type DashboardLeadItem = {
  id: string;
  name: string;
  statusName: string;
  sourceName: string;
  telecallerName: string | null;
  projectName: string | null;
  leadDate: string;
  recallDate: string | null;
  createdAt: string;
};

export type DashboardLeadSummary = {
  total: number;
  addedToday: number;
  recallToday: number;
  statusBreakdown: DashboardLabeledCount[];
  sourceBreakdown: DashboardLabeledCount[];
  recent: DashboardLeadItem[];
};

export type DashboardWorkspaceSummary = {
  users: number;
  activeUsers: number;
  teams: number;
  roles: number;
  projects: number;
  activeProjects: number;
  properties: number;
  propertyTypes: number;
  roleBreakdown: DashboardLabeledCount[];
  propertyTypeBreakdown: DashboardLabeledCount[];
};

export type DashboardSummary = {
  role: string;
  permissions: string[];
  tasks: DashboardTaskSummary | null;
  leads: DashboardLeadSummary | null;
  workspace: DashboardWorkspaceSummary | null;
};
