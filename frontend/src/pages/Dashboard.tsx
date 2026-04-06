import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Layers3,
  PhoneCall,
  Target,
  Users
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDashboardSummary } from "@/lib/dashboard-service";
import type { DashboardLabeledCount, DashboardLeadSummary, DashboardSummary, DashboardTaskSummary, DashboardWorkspaceSummary } from "@/lib/dashboard-types";
import { formatTaskDateTime } from "@/lib/tasks-formatters";

const EMPTY_SUMMARY: DashboardSummary = {
  role: "",
  permissions: [],
  tasks: null,
  leads: null,
  workspace: null
};

function formatLeadDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getRoleCopy(role: string) {
  const normalized = role.trim().toLowerCase();

  if (normalized === "admin") {
    return {
      title: "Business command center",
      description: "Live pipeline, execution, and workspace health pulled from your CRM data."
    };
  }

  if (normalized === "salesmanager") {
    return {
      title: "Team performance snapshot",
      description: "Track leads, task execution, and active inventory without leaving the dashboard."
    };
  }

  if (normalized === "salesexecutive") {
    return {
      title: "Your daily workbench",
      description: "Focus on due tasks, fresh leads, and follow-ups scheduled for today."
    };
  }

  return {
    title: "Dashboard overview",
    description: "This view adapts to the permissions available on your role."
  };
}

function getStatusTone(label: string) {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes("lost") || normalized.includes("cancel")) {
    return "bg-red-500";
  }
  if (normalized.includes("book") || normalized.includes("complete") || normalized.includes("won")) {
    return "bg-emerald-500";
  }
  if (normalized.includes("visit") || normalized.includes("progress")) {
    return "bg-blue-500";
  }
  return "bg-amber-500";
}

function getPriorityTone(priority: string) {
  const normalized = priority.trim().toLowerCase();
  if (normalized === "urgent") {
    return "text-red-600";
  }
  if (normalized === "high") {
    return "text-amber-600";
  }
  if (normalized === "medium") {
    return "text-blue-600";
  }
  return "text-gray-500";
}

export default function Dashboard() {
  const { user, role, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const nextSummary = await getDashboardSummary();
        setSummary(nextSummary);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const copy = useMemo(() => getRoleCopy(String(role || summary.role || "")), [role, summary.role]);
  const normalizedRole = String(role || summary.role || "").trim().toLowerCase();
  const taskSummary = summary.tasks;
  const leadSummary = summary.leads;
  const workspaceSummary = summary.workspace;
  const canCreateLead = hasPermission("create_leads");
  const canCreateTask = hasPermission("create_tasks");
  const canSeeExecutiveBlocks = Boolean(
    workspaceSummary &&
      (normalizedRole === "admin" ||
        normalizedRole === "salesmanager" ||
        hasPermission("view_reports") ||
        hasPermission("manage_users") ||
        hasPermission("view_users"))
  );

  const topKpis = [
    taskSummary
      ? { label: "Due Today", value: String(taskSummary.dueToday), icon: CalendarClock, accent: "text-blue-600" }
      : null,
    taskSummary
      ? { label: "Overdue Tasks", value: String(taskSummary.overdue), icon: ClipboardList, accent: "text-red-600" }
      : null,
    leadSummary
      ? { label: "Total Leads", value: String(leadSummary.total), icon: Target, accent: "text-amber-600" }
      : null,
    leadSummary
      ? { label: "Recall Today", value: String(leadSummary.recallToday), icon: PhoneCall, accent: "text-blue-600" }
      : null,
    canSeeExecutiveBlocks && workspaceSummary
      ? { label: "Active Users", value: String(workspaceSummary.activeUsers), icon: Users, accent: "text-emerald-600" }
      : null,
    canSeeExecutiveBlocks && workspaceSummary
      ? { label: "Properties", value: String(workspaceSummary.properties), icon: BriefcaseBusiness, accent: "text-slate-700" }
      : null
  ].filter(Boolean) as Array<{ label: string; value: string; icon: typeof Users; accent: string }>;

  return (
    <section className="space-y-4">
      <Card className="overflow-hidden border-slate-200">
        <CardContent className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 p-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-blue-200">Dashboard</p>
              <h1 className="text-xl font-semibold">{copy.title}</h1>
              <p className="max-w-2xl text-sm text-slate-200">{copy.description}</p>
              <p className="text-xs text-slate-300">
                Signed in as <span className="font-medium text-white">{user?.fullName || "User"}</span>
                {" · "}
                {role || summary.role || "Role"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canCreateLead ? <Link to="/leads/create"><Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100">Add Lead</Button></Link> : null}
              {canCreateTask ? <Link to="/tasks/create"><Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/15">Create Task</Button></Link> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                  <div className="mt-3 h-7 w-16 animate-pulse rounded bg-slate-200" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="space-y-3 p-4">
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                  {Array.from({ length: 4 }).map((__, rowIndex) => (
                    <div key={rowIndex} className="h-10 animate-pulse rounded bg-slate-100" />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && error ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error ? (
        <>
          <div className={`grid gap-3 ${topKpis.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3"}`}>
            {topKpis.map((item) => (
              <KpiCard key={item.label} label={item.label} value={item.value} icon={item.icon} accent={item.accent} />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {taskSummary ? (
              <TaskBoardCard taskSummary={taskSummary} />
            ) : null}

            {leadSummary ? (
              <BreakdownCard
                title="Lead Status Mix"
                description="Current status spread from your stored leads."
                items={leadSummary.statusBreakdown}
                emptyLabel="No leads available."
              />
            ) : null}

            {leadSummary ? (
              <BreakdownCard
                title="Top Lead Sources"
                description="Where most leads are currently coming from."
                items={leadSummary.sourceBreakdown}
                emptyLabel="No lead sources available."
              />
            ) : null}

            {leadSummary ? (
              <RecentLeadsCard leadSummary={leadSummary} />
            ) : null}

            {canSeeExecutiveBlocks && workspaceSummary ? (
              <WorkspaceCard workspaceSummary={workspaceSummary} />
            ) : null}

            {canSeeExecutiveBlocks && workspaceSummary?.roleBreakdown?.length ? (
              <BreakdownCard
                title="Users by Role"
                description="Active user distribution across roles."
                items={workspaceSummary.roleBreakdown}
                emptyLabel="No roles assigned yet."
              />
            ) : null}

            {canSeeExecutiveBlocks && workspaceSummary?.propertyTypeBreakdown?.length ? (
              <BreakdownCard
                title="Property Type Mix"
                description="Inventory spread across property categories."
                items={workspaceSummary.propertyTypeBreakdown}
                emptyLabel="No property types in use yet."
              />
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent
}: {
  label: string;
  value: string;
  icon: typeof Users;
  accent: string;
}) {
  return (
    <Card className="border-slate-200">
      <CardContent className="flex items-start justify-between p-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className="rounded-full bg-slate-100 p-2">
          <Icon className={`h-4 w-4 ${accent}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function TaskBoardCard({ taskSummary }: { taskSummary: DashboardTaskSummary }) {
  const metrics = [
    { label: "Pending", value: taskSummary.pending, tone: "bg-amber-50 text-amber-700" },
    { label: "In Progress", value: taskSummary.inProgress, tone: "bg-blue-50 text-blue-700" },
    { label: "Completed", value: taskSummary.completed, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Cancelled", value: taskSummary.cancelled, tone: "bg-red-50 text-red-700" }
  ];

  return (
    <Card className="xl:col-span-2">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Task Focus</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Upcoming work and execution status from live tasks.</p>
          </div>
          <Link to="/my-tasks" className="inline-flex items-center text-xs text-blue-600 hover:underline">
            Open tasks <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="grid gap-2 md:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className={`rounded-sm border border-slate-200 p-3 ${metric.tone}`}>
              <p className="text-[11px] uppercase tracking-[0.14em]">{metric.label}</p>
              <p className="mt-1 text-lg font-semibold">{metric.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {(taskSummary.upcoming ?? []).length ? (
            taskSummary.upcoming.slice(0, 6).map((task) => (
              <div key={task.id} className="rounded-sm border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{task.title}</p>
                  <span className={`text-xs font-medium ${getPriorityTone(task.priority)}`}>{task.priority}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{formatTaskDateTime(task.dueDate)}</span>
                  <span>{task.status}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-sm border border-dashed border-slate-200 p-4 text-xs text-slate-500">No upcoming tasks in the next 7 days.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  description,
  items,
  emptyLabel
}: {
  title: string;
  description: string;
  items: DashboardLabeledCount[];
  emptyLabel: string;
}) {
  const max = Math.max(...items.map((item) => item.count), 0);

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-xs text-slate-500">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {items.length ? (
          items.map((item) => {
            const width = max > 0 ? `${Math.max(10, (item.count / max) * 100)}%` : "0%";
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="text-slate-500">{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className={`h-2 rounded-full ${getStatusTone(item.label)}`} style={{ width }} />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-slate-500">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

function RecentLeadsCard({ leadSummary }: { leadSummary: DashboardLeadSummary }) {
  return (
    <Card className="xl:col-span-2">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Recent Leads</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Fresh records and follow-up timing from the CRM.</p>
          </div>
          <Link to="/leads" className="inline-flex items-center text-xs text-blue-600 hover:underline">
            Open leads <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="grid gap-2 md:grid-cols-3">
          <MiniMetric label="Added Today" value={leadSummary.addedToday} />
          <MiniMetric label="Recall Today" value={leadSummary.recallToday} />
          <MiniMetric label="Lead Records" value={leadSummary.total} />
        </div>
        {(leadSummary.recent ?? []).length ? (
          <div className="space-y-2">
            {leadSummary.recent.map((lead) => (
              <div key={lead.id} className="rounded-sm border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{lead.name}</p>
                    <p className="text-xs text-slate-500">
                      {lead.sourceName}
                      {lead.projectName ? ` · ${lead.projectName}` : ""}
                      {lead.telecallerName ? ` · ${lead.telecallerName}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">{lead.statusName}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>Lead Date: {formatLeadDate(lead.leadDate)}</span>
                  <span>Recall: {formatLeadDate(lead.recallDate)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No lead records available.</p>
        )}
      </CardContent>
    </Card>
  );
}

function WorkspaceCard({ workspaceSummary }: { workspaceSummary: DashboardWorkspaceSummary }) {
  const stats = [
    { label: "Users", value: workspaceSummary.users },
    { label: "Teams", value: workspaceSummary.teams },
    { label: "Roles", value: workspaceSummary.roles },
    { label: "Projects", value: workspaceSummary.projects },
    { label: "Properties", value: workspaceSummary.properties },
    { label: "Property Types", value: workspaceSummary.propertyTypes }
  ];

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">Workspace Snapshot</CardTitle>
        <p className="text-xs text-slate-500">Core CRM inventory and team setup totals.</p>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="grid grid-cols-2 gap-2">
          {stats.map((item) => (
            <div key={item.label} className="rounded-sm border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-sm border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Layers3 className="h-4 w-4" />
            <span className="font-medium">Active Projects</span>
          </div>
          <p className="mt-1 text-sm font-semibold">{workspaceSummary.activeProjects}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        <p className="text-base font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
