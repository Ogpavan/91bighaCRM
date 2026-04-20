import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
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
import { getUsers } from "@/api/users-service";
import { formatTaskDateTime } from "@/lib/tasks-formatters";
import { completeTask, getTaskById, getTaskMeta, getTasks, updateTask } from "@/api/tasks-service";
import type { Task, TaskDetail } from "@/api/tasks-types";
import { cn } from "@/lib/utils";

const today = new Date().toISOString().slice(0, 10);
const TABLE_COLUMNS = 8;
const TABLE_SKELETON_ROWS = 6;

function TaskTableSkeleton() {
  return (
    <Table className="[&_th]:px-2 [&_td]:px-2">
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Assigned To</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Lead</TableHead>
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

export default function AllTasksPage() {
  const [items, setItems] = useState<Task[]>([]);
  const [assignees, setAssignees] = useState<Array<{ id: string; fullName: string }>>([]);
  const [meta, setMeta] = useState<{ statuses: string[]; priorities: string[]; types: string[] }>({ statuses: [], priorities: [], types: [] });
  const [filters, setFilters] = useState({ assignedTo: "", status: "", priority: "", type: "", fromDate: "", toDate: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [notice, setNotice] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailTask, setDetailTask] = useState<TaskDetail | null>(null);
  const [detailStatuses, setDetailStatuses] = useState<string[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [metaResponse, usersResponse, tasksResponse] = await Promise.all([
        getTaskMeta(),
        getUsers({ page: 1, limit: 100 }),
        getTasks({
          page,
          limit: 10,
          assignedTo: filters.assignedTo || undefined,
          status: filters.status || undefined,
          priority: filters.priority || undefined,
          type: filters.type || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined
        })
      ]);

      setMeta(metaResponse);
      setAssignees(usersResponse.items);
      setItems(tasksResponse.items);
      setTotalPages(tasksResponse.pagination.totalPages || 1);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    if (page === 1) {
      void load();
    } else {
      setPage(1);
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

  useEffect(() => {
    void load();
  }, [page, filters]);

  return (
    <section className="space-y-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between px-3 py-3">
          <CardTitle className="text-sm">All Tasks</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={loading} onClick={() => setShowCreateModal(true)}>
              {loading ? "Loading..." : "Create Task"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-3 pb-3 pt-0">
          {notice ? <p className="text-xs text-green-600">{notice}</p> : null}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <Select className="h-9 text-xs" disabled={loading} value={filters.assignedTo} onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, assignedTo: event.target.value })); }}>
              <option value="">All Assignees</option>
              {assignees.map((assignee) => (<option key={assignee.id} value={assignee.id}>{assignee.fullName}</option>))}
            </Select>
            <Select className="h-9 text-xs" disabled={loading} value={filters.status} onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, status: event.target.value })); }}>
              <option value="">All Statuses</option>
              {meta.statuses.map((status) => (<option key={status} value={status}>{status}</option>))}
            </Select>
            <Select className="h-9 text-xs" disabled={loading} value={filters.priority} onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, priority: event.target.value })); }}>
              <option value="">All Priorities</option>
              {meta.priorities.map((priority) => (<option key={priority} value={priority}>{priority}</option>))}
            </Select>
            <Select className="h-9 text-xs" disabled={loading} value={filters.type} onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, type: event.target.value })); }}>
              <option value="">All Types</option>
              {meta.types.map((type) => (<option key={type} value={type}>{type}</option>))}
            </Select>
            <div className="flex items-center gap-2 rounded-sm border border-gray-200 bg-gray-50 px-2">
              <span className="text-[11px] text-gray-500">From</span>
              <Input type="date" className="h-9 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0" disabled={loading} value={filters.fromDate} onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, fromDate: event.target.value })); }} />
            </div>
            <div className="flex items-center gap-2 rounded-sm border border-gray-200 bg-gray-50 px-2">
              <span className="text-[11px] text-gray-500">To</span>
              <Input type="date" className="h-9 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0" disabled={loading} value={filters.toDate} onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, toDate: event.target.value })); }} />
            </div>
          </div>

          {loading ? (
            <TaskTableSkeleton />
          ) : (
            <Table className="[&_th]:px-2 [&_td]:px-2">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((task) => {
                  const overdue = Boolean(task.dueDate && new Date(task.dueDate).getTime() < Date.now() && task.status !== "Completed");
                  return (
                    <TableRow key={task.id} className={cn(getTaskStatusRowClassName(task.status))}>
                      <TableCell>{task.title}</TableCell>
                      <TableCell><TaskTypeBadge type={task.type} /></TableCell>
                      <TableCell>{task.assignedToName || "-"}</TableCell>
                      <TableCell className={overdue ? "text-red-600" : ""}>{formatTaskDateTime(task.dueDate)}</TableCell>
                      <TableCell><TaskPriorityBadge priority={task.priority} /></TableCell>
                      <TableCell><TaskStatusBadge status={task.status} /></TableCell>
                      <TableCell>{task.leadName || "-"}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => void openDetailModal(task.id)}>
                          View
                        </Button>
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
