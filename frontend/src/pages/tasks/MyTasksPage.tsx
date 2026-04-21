import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  DataGrid,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarDensitySelector,
  GridToolbarExport,
  GridToolbarFilterButton,
  GridToolbarQuickFilter,
  type GridColDef
} from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

function TasksGridToolbar() {
  return (
    <GridToolbarContainer sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Box sx={{ minWidth: 240, flex: { xs: "1 1 100%", md: "0 0 auto" } }}>
        <GridToolbarQuickFilter
          debounceMs={300}
          sx={{
            width: { xs: "100%", md: 320 }
          }}
        />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        <GridToolbarDensitySelector />
        <GridToolbarExport />
      </Box>
    </GridToolbarContainer>
  );
}

export default function MyTasksPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Task[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showOpenOnly, setShowOpenOnly] = useState(false);
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
    if (page === 1) {
      void load();
    } else {
      setPage(1);
    }
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

  const taskColumns: Array<GridColDef<Task>> = [
      { field: "title", headerName: "Title", minWidth: 300, flex: 1.2 },
      {
        field: "type",
        headerName: "Type",
        width: 120,
        renderCell: (params) => <TaskTypeBadge type={params.row.type} />
      },
      {
        field: "leadName",
        headerName: "Linked Lead",
        minWidth: 140,
        flex: 0.8,
        renderCell: (params) =>
          params.row.leadId ? (
            <Link className="text-blue-600 hover:underline" to={`/leads/${params.row.leadId}`}>
              {params.row.leadName || "View Lead"}
            </Link>
          ) : (
            "-"
          )
      },
      {
        field: "dueDate",
        headerName: "Due Date",
        width: 140,
        renderCell: (params) => {
          const overdue = Boolean(
            params.row.dueDate && new Date(params.row.dueDate).getTime() < Date.now() && params.row.status !== "Completed"
          );
          return <span className={overdue ? "text-red-600" : ""}>{formatTaskDateTime(params.row.dueDate)}</span>;
        }
      },
      {
        field: "priority",
        headerName: "Priority",
        width: 120,
        renderCell: (params) => <TaskPriorityBadge priority={params.row.priority} />
      },
      {
        field: "status",
        headerName: "Status",
        width: 130,
        renderCell: (params) => <TaskStatusBadge status={params.row.status} />
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 190,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => void openDetailModal(params.row.id)}>
              View
            </Button>
            {params.row.status !== "Completed" ? (
              <Button
                size="sm"
                disabled={completingTaskId === params.row.id}
                onClick={() => void handleCompleteTask(params.row.id)}
              >
                {completingTaskId === params.row.id ? "Completing..." : "Complete"}
              </Button>
            ) : null}
          </div>
        )
      }
    ];

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
          <div className="w-full overflow-x-auto">
            <div style={{ minWidth: 980, height: 520 }}>
              <DataGrid
                density="compact"
                rows={visibleItems}
                columns={taskColumns}
                getRowId={(row) => row.id}
                loading={loading}
                disableRowSelectionOnClick
                hideFooter
                slots={{ toolbar: TasksGridToolbar }}
                getRowClassName={(params) => getTaskStatusRowClassName(params.row.status)}
                sx={(theme) => ({
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: "0.375rem",
                  fontSize: "0.75rem",
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    borderBottom: `1px solid ${alpha(theme.palette.primary.contrastText, 0.2)}`
                  },
                  "& .MuiDataGrid-columnHeaderTitle": {
                    fontWeight: 700
                  },
                  "& .MuiDataGrid-row:nth-of-type(odd) .MuiDataGrid-cell": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.04)
                  },
                  "& .MuiDataGrid-row:nth-of-type(even) .MuiDataGrid-cell": {
                    backgroundColor: theme.palette.background.paper
                  },
                  "& .MuiDataGrid-row:hover .MuiDataGrid-cell": {
                    backgroundColor: theme.palette.action.hover
                  },
                  "& .MuiDataGrid-iconButtonContainer, & .MuiDataGrid-menuIcon, & .MuiDataGrid-sortIcon, & .MuiDataGrid-filterIcon": {
                    color: theme.palette.primary.contrastText
                  },
                  "& .MuiDataGrid-toolbarContainer": {
                    padding: "0.5rem"
                  },
                  "& .MuiDataGrid-toolbarContainer .MuiButtonBase-root": {
                    fontSize: "0.75rem"
                  }
                })}
              />
            </div>
          </div>

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
