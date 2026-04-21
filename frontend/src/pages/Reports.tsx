import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { BarChart3, BriefcaseBusiness, ClipboardList, Download, PieChart, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PieChartCard from "@/components/reports/PieChartCard";
import RevenueLineChart from "@/components/reports/RevenueLineChart";
import AgentBarChart from "@/components/reports/AgentBarChart";
import { useAuth } from "@/components/AuthContext";
import { getUsers } from "@/api/users-service";
import { getLeadsMeta } from "@/api/leads-service";
import {
  getAgentPerformanceReport,
  getLeadSummaryReport,
  getProjectPerformanceReport,
  getSalesSummaryReport,
  getSourcePerformanceReport,
  getTaskSummaryReport
} from "@/api/reports-service";
import type {
  AgentPerformanceItem,
  LeadSummaryReport,
  ProjectPerformanceItem,
  SalesSummaryReport,
  SourcePerformanceItem,
  TaskSummaryReport
} from "@/api/reports-types";

const reportCards = [
  { key: "overview", title: "Overview", description: "Cross-report business snapshot", icon: BarChart3 },
  { key: "leads", title: "Lead Reports", description: "Lead flow, source mix, and conversion", icon: PieChart },
  { key: "agents", title: "Agent Reports", description: "Assigned leads, visits, bookings, and value", icon: Users },
  { key: "projects", title: "Project Reports", description: "Project-wise leads, visits, and bookings", icon: BriefcaseBusiness },
  { key: "sales", title: "Sales Reports", description: "Bookings, deal size, and monthly value", icon: TrendingUp },
  { key: "tasks", title: "Task Reports", description: "Task execution, ownership, and load", icon: ClipboardList }
] as const;

type ReportsTab = (typeof reportCards)[number]["key"];

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const EMPTY_LEAD_SUMMARY: LeadSummaryReport = {
  totalLeads: 0,
  newLeads: 0,
  convertedLeads: 0,
  lostLeads: 0,
  conversionRate: 0
};

const EMPTY_SALES_SUMMARY: SalesSummaryReport = {
  totalBookings: 0,
  totalRevenue: 0,
  averageDealSize: 0,
  pendingPayments: 0,
  bookingsThisMonth: 0,
  revenueByMonth: []
};

const EMPTY_TASK_SUMMARY: TaskSummaryReport = {
  totalTasks: 0,
  completedTasks: 0,
  overdueTasks: 0,
  tasksByType: [],
  tasksByUser: []
};

const dateInputClassName =
  "h-9 text-xs leading-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:p-0 [&::-webkit-date-and-time-value]:min-h-0";

export default function Reports() {
  const { hasPermission } = useAuth();
  const canAccess = hasPermission("view_reports");

  const [activeTab, setActiveTab] = useState<ReportsTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ fromDate: "", toDate: "", projectId: "", agentId: "" });
  const [projects, setProjects] = useState<Array<{ Id: string; Name: string }>>([]);
  const [agents, setAgents] = useState<Array<{ id: string; fullName: string }>>([]);
  const [leadSummary, setLeadSummary] = useState<LeadSummaryReport>(EMPTY_LEAD_SUMMARY);
  const [sourcePerformance, setSourcePerformance] = useState<SourcePerformanceItem[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformanceItem[]>([]);
  const [projectPerformance, setProjectPerformance] = useState<ProjectPerformanceItem[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummaryReport>(EMPTY_SALES_SUMMARY);
  const [taskSummary, setTaskSummary] = useState<TaskSummaryReport>(EMPTY_TASK_SUMMARY);

  const reportFilters = useMemo(
    () => ({
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      projectId: filters.projectId || undefined,
      agentId: filters.agentId || undefined
    }),
    [filters]
  );

  useEffect(() => {
    if (!canAccess) {
      return;
    }

    const loadOptions = async () => {
      try {
        const [leadMeta, users] = await Promise.all([getLeadsMeta(), getUsers({ page: 1, limit: 200 })]);
        setProjects(leadMeta.projects);
        setAgents(users.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load report filters.");
      }
    };

    void loadOptions();
  }, [canAccess]);

  useEffect(() => {
    if (!canAccess) {
      return;
    }

    const loadReports = async () => {
      setLoading(true);
      setError("");
      try {
        const [leadSummaryData, sourceData, agentData, projectData, salesData, taskData] = await Promise.all([
          getLeadSummaryReport(reportFilters),
          getSourcePerformanceReport(reportFilters),
          getAgentPerformanceReport(reportFilters),
          getProjectPerformanceReport(reportFilters),
          getSalesSummaryReport(reportFilters),
          getTaskSummaryReport(reportFilters)
        ]);

        setLeadSummary(leadSummaryData);
        setSourcePerformance(sourceData);
        setAgentPerformance(agentData);
        setProjectPerformance(projectData);
        setSalesSummary(salesData);
        setTaskSummary(taskData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load reports.");
      } finally {
        setLoading(false);
      }
    };

    void loadReports();
  }, [canAccess, reportFilters]);

  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const revenueLineData = salesSummary.revenueByMonth.map((item) => ({ label: item.month, value: item.revenue }));
  const agentBarData = agentPerformance.slice(0, 8).map((item) => ({ label: item.agentName, value: item.revenueGenerated }));
  const taskTypePieData = taskSummary.tasksByType.map((item) => ({ name: item.type, value: item.total }));
  const taskUserBarData = taskSummary.tasksByUser.slice(0, 8).map((item) => ({ label: item.user, value: item.total }));

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm">Filters</CardTitle>
            <Button variant="outline" size="sm" disabled>
              <Download className="mr-1 h-4 w-4" />
              Export CSV (Soon)
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid items-end gap-3 p-4 pt-0 md:grid-cols-4">
          <div className="flex flex-col justify-end gap-1">
            <label className="text-[11px] uppercase tracking-[0.14em] text-slate-500">From</label>
            <Input
              type="date"
              className={dateInputClassName}
              value={filters.fromDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, fromDate: event.target.value }))}
            />
          </div>
          <div className="flex flex-col justify-end gap-1">
            <label className="text-[11px] uppercase tracking-[0.14em] text-slate-500">To</label>
            <Input
              type="date"
              className={dateInputClassName}
              value={filters.toDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, toDate: event.target.value }))}
            />
          </div>
          <div className="flex flex-col justify-end gap-1">
            <label className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Project</label>
            <Select className="h-9 text-xs" value={filters.projectId} onChange={(event) => setFilters((prev) => ({ ...prev, projectId: event.target.value }))}>
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.Id} value={project.Id}>{project.Name}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col justify-end gap-1">
            <label className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Agent</label>
            <Select className="h-9 text-xs" value={filters.agentId} onChange={(event) => setFilters((prev) => ({ ...prev, agentId: event.target.value }))}>
              <option value="">All Agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.fullName}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {reportCards.map((card) => {
          const Icon = card.icon;
          const isActive = activeTab === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveTab(card.key)}
              className={`rounded-sm border p-4 text-left transition ${isActive ? "border-blue-300 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-sm font-semibold ${isActive ? "text-blue-700" : "text-slate-900"}`}>{card.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{card.description}</p>
                </div>
                <div className={`rounded-full p-2 ${isActive ? "bg-blue-100" : "bg-slate-100"}`}>
                  <Icon className={`h-4 w-4 ${isActive ? "text-blue-700" : "text-slate-600"}`} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-3 p-4">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                {Array.from({ length: 5 }).map((__, rowIndex) => (
                  <div key={rowIndex} className="h-10 animate-pulse rounded bg-slate-100" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error && activeTab === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <KpiCard label="Total Leads" value={String(leadSummary.totalLeads)} />
            <KpiCard label="Conversion Rate" value={`${leadSummary.conversionRate}%`} />
            <KpiCard label="Total Revenue" value={currency.format(salesSummary.totalRevenue)} />
            <KpiCard label="Bookings This Month" value={String(salesSummary.bookingsThisMonth)} />
            <KpiCard label="Overdue Tasks" value={String(taskSummary.overdueTasks)} tone="danger" />
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-3">
              <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Revenue by Month</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><RevenueLineChart data={revenueLineData} /></CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Agent Revenue Performance</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0"><AgentBarChart data={agentBarData} /></CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && !error && activeTab === "leads" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <KpiCard label="Total Leads" value={String(leadSummary.totalLeads)} />
            <KpiCard label="New" value={String(leadSummary.newLeads)} />
            <KpiCard label="Converted" value={String(leadSummary.convertedLeads)} tone="success" />
            <KpiCard label="Lost" value={String(leadSummary.lostLeads)} tone="danger" />
            <KpiCard label="Conversion %" value={`${leadSummary.conversionRate}%`} />
          </div>
          <Card>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Source Performance</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Total Leads</TableHead>
                    <TableHead>Converted</TableHead>
                    <TableHead>Conversion %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourcePerformance.map((row) => (
                    <TableRow key={row.sourceName}>
                      <TableCell>{row.sourceName}</TableCell>
                      <TableCell>{row.totalLeads}</TableCell>
                      <TableCell>{row.convertedLeads}</TableCell>
                      <TableCell>{row.conversionRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && !error && activeTab === "agents" ? (
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Agent Performance</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Total Leads</TableHead>
                  <TableHead>Site Visits</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Conversion %</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...agentPerformance]
                  .sort((a, b) => b.revenueGenerated - a.revenueGenerated)
                  .map((row) => (
                    <TableRow key={row.agentId}>
                      <TableCell>{row.agentName}</TableCell>
                      <TableCell>{row.totalLeadsAssigned}</TableCell>
                      <TableCell>{row.siteVisitsDone}</TableCell>
                      <TableCell>{row.bookingsClosed}</TableCell>
                      <TableCell>{row.conversionRate}%</TableCell>
                      <TableCell>{currency.format(row.revenueGenerated)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error && activeTab === "projects" ? (
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Project Performance</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Total Leads</TableHead>
                  <TableHead>Site Visits</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectPerformance.map((row) => (
                  <TableRow key={row.projectId}>
                    <TableCell>{row.projectName}</TableCell>
                    <TableCell>{row.totalLeads}</TableCell>
                    <TableCell>{row.siteVisits}</TableCell>
                    <TableCell>{row.bookings}</TableCell>
                    <TableCell>{currency.format(row.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error && activeTab === "sales" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <KpiCard label="Total Bookings" value={String(salesSummary.totalBookings)} />
            <KpiCard label="Total Revenue" value={currency.format(salesSummary.totalRevenue)} tone="success" />
            <KpiCard label="Average Deal Size" value={currency.format(salesSummary.averageDealSize)} />
            <KpiCard label="Negotiation Pipeline" value={currency.format(salesSummary.pendingPayments)} />
          </div>
          <Card>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Revenue by Month</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0"><RevenueLineChart data={revenueLineData} /></CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && !error && activeTab === "tasks" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <KpiCard label="Total Tasks" value={String(taskSummary.totalTasks)} />
            <KpiCard label="Completed" value={String(taskSummary.completedTasks)} tone="success" />
            <KpiCard label="Overdue" value={String(taskSummary.overdueTasks)} tone="danger" />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Tasks by Type</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><PieChartCard data={taskTypePieData} colors={["#0c66e4", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6"]} /></CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Tasks by User</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><AgentBarChart data={taskUserBarData} /></CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Task Load</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Total Tasks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskSummary.tasksByUser.map((row) => (
                    <TableRow key={row.user}>
                      <TableCell>{row.user}</TableCell>
                      <TableCell>{row.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}

function KpiCard({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "danger" | "success" }) {
  const valueClass = tone === "danger" ? "text-red-600" : tone === "success" ? "text-green-600" : "text-slate-900";
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className={`mt-2 text-xl font-semibold ${valueClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
