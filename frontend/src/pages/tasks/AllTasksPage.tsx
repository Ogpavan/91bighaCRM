import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
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
import { getUsers } from "@/api/users-service";
import { formatTaskDateTime } from "@/lib/tasks-formatters";
import { completeTask, getTaskById, getTaskMeta, getTasks, updateTask } from "@/api/tasks-service";
import type { Task, TaskDetail } from "@/api/tasks-types";

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

  const taskColumns: Array<GridColDef<Task>> = [
      { field: "title", headerName: "Title", minWidth: 300, flex: 1.2 },
      {
        field: "type",
        headerName: "Type",
        width: 120,
        renderCell: (params) => <TaskTypeBadge type={params.row.type} />
      },
      {
        field: "assignedToName",
        headerName: "Assigned To",
        minWidth: 120,
        flex: 0.6,
        renderCell: (params) => params.row.assignedToName || "-"
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
        field: "leadName",
        headerName: "Lead",
        minWidth: 100,
        flex: 0.5,
        renderCell: (params) => params.row.leadName || "-"
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 110,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <Button variant="outline" size="sm" onClick={() => void openDetailModal(params.row.id)}>
            View
          </Button>
        )
      }
    ];

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

          <div className="w-full overflow-x-auto">
            <div style={{ minWidth: 1050, height: 520 }}>
              <DataGrid
                density="compact"
                rows={items}
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
