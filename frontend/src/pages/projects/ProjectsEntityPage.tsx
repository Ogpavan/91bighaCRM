import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Pencil } from "lucide-react";
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
import { Box, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createProjectEntity,
  getProjectsEntity,
  updateProjectEntity,
  type ProjectEntity
} from "@/api/projects-entity-service";

type FormState = {
  name: string;
  location: string;
  status: string;
  description: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  location: "",
  status: "active",
  description: ""
};

function TruncatedCell({ value }: { value?: string | null }) {
  const text = value?.trim() ? value : "-";
  const hasValue = text !== "-";

  return (
    <Tooltip title={hasValue ? text : ""} disableHoverListener={!hasValue} placement="top" arrow>
      <div
        className="cursor-help break-words"
        style={{
          width: "100%",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          whiteSpace: "normal"
        }}
      >
        {text}
      </div>
    </Tooltip>
  );
}

function ProjectsEntityGridToolbar() {
  return (
    <GridToolbarContainer sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Box sx={{ minWidth: 240, flex: { xs: "1 1 100%", md: "0 0 auto" } }}>
        <GridToolbarQuickFilter debounceMs={300} sx={{ width: { xs: "100%", md: 320 } }} />
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

export default function ProjectsEntityPage() {
  const [items, setItems] = useState<ProjectEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectEntity | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const projectColumns: Array<GridColDef<ProjectEntity>> = [
    { field: "projectCode", headerName: "Code", minWidth: 250 },
    { field: "name", headerName: "Name", minWidth: 160, flex: 1, renderCell: (params) => <TruncatedCell value={params.row.name} /> },
    { field: "location", headerName: "Location", minWidth: 180, renderCell: (params) => <TruncatedCell value={params.row.location} /> },
    { field: "status", headerName: "Status", minWidth: 120, renderCell: (params) => <span className="capitalize">{params.row.status}</span> },
    { field: "description", headerName: "Description", minWidth: 250, flex: 1, sortable: false, renderCell: (params) => <TruncatedCell value={params.row.description} /> },
    { field: "propertiesCount", headerName: "Properties", minWidth: 110, type: "number" },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => openEditPopup(params.row)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )
    }
  ];

  const loadProjects = async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await getProjectsEntity());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const setText = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openCreatePopup = () => {
    setEditingProject(null);
    setForm(INITIAL_FORM);
    setError("");
    setPopupOpen(true);
  };

  const openEditPopup = (project: ProjectEntity) => {
    setEditingProject(project);
    setForm({
      name: project.name,
      location: project.location || "",
      status: project.status,
      description: project.description || ""
    });
    setError("");
    setPopupOpen(true);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (editingProject) {
        await updateProjectEntity(editingProject.id, {
          name: form.name,
          location: form.location || undefined,
          status: form.status,
          description: form.description || undefined
        });
        setSuccess(`Project ${editingProject.projectCode} updated successfully.`);
      } else {
        const created = await createProjectEntity({
          name: form.name,
          location: form.location || undefined,
          status: form.status,
          description: form.description || undefined
        });
        setSuccess(`Project ${created.projectCode} created successfully.`);
      }
      setForm(INITIAL_FORM);
      setPopupOpen(false);
      setEditingProject(null);
      await loadProjects();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save project.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">Projects</CardTitle>
            <Button size="sm" onClick={openCreatePopup}>
              Create Project
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {success ? <p className="mb-3 text-xs text-green-600">{success}</p> : null}
          {error && !popupOpen ? <p className="mb-3 text-xs text-red-600">{error}</p> : null}
          
          <div className="w-full">
            <div style={{ height: 560 }}>
              <DataGrid
                density="compact"
                rows={items}
                columns={projectColumns}
                getRowId={(row) => row.id}
                loading={loading}
                disableRowSelectionOnClick
                slots={{ toolbar: ProjectsEntityGridToolbar }}
                hideFooter
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
        </CardContent>
      </Card>

      {popupOpen
        ? createPortal(
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/30" onClick={() => !submitting && setPopupOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-xl">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm">{editingProject ? "Edit Project" : "Create Project"}</CardTitle>
                  <Button size="sm" variant="outline" disabled={submitting} onClick={() => setPopupOpen(false)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onSubmit}>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Project Name</label>
                    <Input className="h-9 text-xs" value={form.name} onChange={(event) => setText("name", event.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Location</label>
                    <Input className="h-9 text-xs" value={form.location} onChange={(event) => setText("location", event.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Status</label>
                    <Select className="h-9 text-xs" value={form.status} onChange={(event) => setText("status", event.target.value)}>
                      <option value="active">Active</option>
                      <option value="planning">Planning</option>
                      <option value="on-hold">On Hold</option>
                      <option value="completed">Completed</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium text-gray-700">Description</label>
                    <textarea
                      className="min-h-24 w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-600"
                      value={form.description}
                      onChange={(event) => setText("description", event.target.value)}
                    />
                  </div>
                  {error ? <p className="text-xs text-red-600 md:col-span-2">{error}</p> : null}
                  <div className="flex justify-end gap-2 md:col-span-2">
                    <Button type="button" variant="outline" size="sm" disabled={submitting} onClick={() => setPopupOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={submitting}>
                      {submitting ? "Saving..." : "Save Project"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </>,
        document.body
      ) : null}
    </section>
  );
}
