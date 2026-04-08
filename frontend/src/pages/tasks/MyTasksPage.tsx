import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import Pagination from "@/components/Pagination";
import TaskForm from "@/components/tasks/TaskForm";
import TaskDetailContent from "@/components/tasks/TaskDetailContent";
import TaskPriorityBadge from "@/components/tasks/TaskPriorityBadge";
import TaskStatusBadge, { getTaskStatusRowClassName } from "@/components/tasks/TaskStatusBadge";
import TaskTypeBadge from "@/components/tasks/TaskTypeBadge";
import { formatTaskDateTime } from "@/lib/tasks-formatters";
import { completeTask, getTaskById, getTaskMeta, getTasks, getTaskSummary, updateTask } from "@/api/tasks-service";
import type { Task, TaskDetail, TaskSummary } from "@/api/tasks-types";
import { useAuth } from "@/components/AuthContext";
import { cn } from "@/lib/utils";

const today = new Date().toISOString().slice(0, 10);
const TABLE_COLUMNS = 7;
const TABLE_SKELETON_ROWS = 6;

function SummarySkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-2 p-3">
            <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
            <div className="h-7 w-12 animate-pulse rounded bg-gray-200" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TaskTableSkeleton() {
  return (
    <Table className="[&_th]:px-2 [&_td]:px-2">
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Linked Lead</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: TABLE_SKELETON_ROWS }).map((_, index) => (
          <TableRow key={index}>
            <TableCell colSpan={TABLE_COLUMNS}>
              <div className="h-11 animate-pulse rounded-sm bg-gray-100" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function MyTasksPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Task[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [showOpenOnly, setShowOpenOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<TaskSummary>({ dueToday: 0, overdue: 0, completedToday: 0, upcoming: [] });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notice, setNotice] = useState("");
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<TaskDetail | null>(null);
  const [detailStatuses, setDetailStatuses] = useState<string[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);

  const load = async () => {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    try {
      const [taskMeta, taskSummary, tasksData] = await Promise.all([
        getTaskMeta(),
        getTaskSummary(),
        getTasks({
          page,
          limit: 10,
          assignedTo: user.id,
          status: statusFilter || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined
        })
      ]);
      setStatuses(taskMeta.statuses);
      setSummary(taskSummary);
      setItems(tasksData.items);
      setTotalPages(tasksData.pagination.totalPages || 1);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    if (page !== 1) {
      setPage(1);
      return;
    }

    void load();
  };
 
  useEffect(() => {
    void load();
  }, [fromDate, page, statusFilter, toDate, user?.id]);

  const visibleItems = useMemo(
    () => (showOpenOnly ? items.filter((task) => task.status !== "Completed") : items),
    [items, showOpenOnly]
  );

  const handleCompleteTask = async (taskId: string) => {
    setCompletingTaskId(taskId);
    try {
      await completeTask(taskId);
      await load();
    } finally {
      setCompletingTaskId(null);
    }
  };

  const closeDetailModal = () => {
    if (detailSaving) {
      return;
    }

    setDetailTask(null);
    setDetailStatuses([]);
    setDetailLoading(false);
  };

  const openDetailModal = async (taskId: string) => {
    setDetailLoading(true);
    setDetailTask(null);
    try {
      const [taskData, taskMeta] = await Promise.all([getTaskById(taskId), getTaskMeta()]);
      setDetailTask(taskData);
      setDetailStatuses(taskMeta.statuses);
    } finally {
      setDetailLoading(false);
    }
  };

  const syncTaskRow = (updatedTask: TaskDetail) => {
    setItems((prev) => prev.map((item) => (item.id === updatedTask.id ? updatedTask : item)));
    setDetailTask(updatedTask);
  };

  return (
    <section className="space-y-3">
      {loading ? (
        <SummarySkeleton />
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <Card><CardContent className="p-3"><p className="text-[11px] text-gray-500">Due Today</p><p className="text-lg font-semibold">{summary.dueToday}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-[11px] text-gray-500">Overdue</p><p className="text-lg font-semibold text-red-600">{summary.overdue}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-[11px] text-gray-500">Completed Today</p><p className="text-lg font-semibold text-green-600">{summary.completedToday}</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between px-3 py-3">
          <CardTitle className="text-sm">My Tasks</CardTitle>
          <div className="flex items-center gap-2">
            <Select className="h-8 w-40 text-xs" disabled={loading} value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }}>
              <option value="">All Statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
            <div className="flex items-center gap-2 rounded-sm border border-gray-200 bg-gray-50 px-2">
              <span className="text-[11px] text-gray-500">From</span>
              <Input type="date" className="h-8 w-28 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0" disabled={loading} value={fromDate} onChange={(event) => { setPage(1); setFromDate(event.target.value); }} />
            </div>
            <div className="flex items-center gap-2 rounded-sm border border-gray-200 bg-gray-50 px-2">
              <span className="text-[11px] text-gray-500">To</span>
              <Input type="date" className="h-8 w-28 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0" disabled={loading} value={toDate} onChange={(event) => { setPage(1); setToDate(event.target.value); }} />
            </div>
            <Button variant="outline" size="sm" disabled={loading} onClick={() => setShowOpenOnly((prev) => !prev)}>
              {loading ? "Loading..." : showOpenOnly ? "Showing Open" : "Showing All"}
            </Button>
            <Button size="sm" disabled={loading} onClick={() => setShowCreateModal(true)}>
              {loading ? "Loading..." : "Create Task"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          {notice ? <p className="text-xs text-green-600">{notice}</p> : null}
          {loading ? (
            <TaskTableSkeleton />
          ) : (
            <Table className="[&_th]:px-2 [&_td]:px-2">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Linked Lead</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.map((task) => {
                  const overdue = Boolean(task.dueDate && new Date(task.dueDate).getTime() < Date.now() && task.status !== "Completed");
                  return (
                    <TableRow key={task.id} className={cn(getTaskStatusRowClassName(task.status))}>
                      <TableCell>{task.title}</TableCell>
                      <TableCell><TaskTypeBadge type={task.type} /></TableCell>
                      <TableCell>
                        {task.leadId ? <Link className="text-blue-600 hover:underline" to={`/leads/${task.leadId}`}>{task.leadName || "View Lead"}</Link> : "-"}
                      </TableCell>
                      <TableCell className={overdue ? "text-red-600" : ""}>{formatTaskDateTime(task.dueDate)}</TableCell>
                      <TableCell><TaskPriorityBadge priority={task.priority} /></TableCell>
                      <TableCell><TaskStatusBadge status={task.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => void openDetailModal(task.id)}>
                            View
                          </Button>
                          {task.status !== "Completed" ? (
                            <Button size="sm" disabled={completingTaskId === task.id} onClick={() => void handleCompleteTask(task.id)}>
                              {completingTaskId === task.id ? "Completing..." : "Complete"}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>
      {showCreateModal
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <TaskForm
                onCancel={() => setShowCreateModal(false)}
                onSuccess={(task: TaskDetail) => {
                  setNotice(`Task "${task.title}" created successfully.`);
                  setShowCreateModal(false);
                  refresh();
                }}
              />
            </div>,
            document.body
          )
        : null}
      {(detailLoading || detailTask)
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-sm border border-gray-200 bg-white p-3 shadow-xl">
                {detailLoading || !detailTask ? (
                  <Card>
                    <CardContent className="p-4 text-xs text-gray-500">Loading task...</CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="mb-2 flex justify-end">
                      <Button variant="outline" size="sm" disabled={detailSaving} onClick={closeDetailModal}>
                        Close
                      </Button>
                    </div>
                    <TaskDetailContent
                      task={detailTask}
                      statuses={detailStatuses}
                      saving={detailSaving}
                      onStatusChange={(status) => {
                        setDetailSaving(true);
                        void updateTask(detailTask.id, { status }).then(syncTaskRow).finally(() => setDetailSaving(false));
                      }}
                      onComplete={() => {
                        setDetailSaving(true);
                        void completeTask(detailTask.id).then(syncTaskRow).finally(() => setDetailSaving(false));
                      }}
                    />
                  </>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
