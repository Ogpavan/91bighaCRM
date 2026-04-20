import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Filter, Upload, Users } from "lucide-react";
import {
  DataGrid,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarDensitySelector,
  GridToolbarExport,
  GridToolbarFilterButton,
  GridToolbarQuickFilter,
  type GridColDef,
  type GridRowSelectionModel
} from "@mui/x-data-grid";
import { Box, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import Pagination from "@/components/Pagination";
import LeadActionsMenu from "@/components/leads/LeadActionsMenu";
import LeadStatusBadge from "@/components/leads/LeadStatusBadge";
import {
  addLeadFollowup,
  addLeadVisit,
  deleteLead,
  getLeads,
  getLeadsMeta,
  importLeadsFromFile,
  previewLeadImport,
  updateLead,
  type LeadImportField,
  type LeadImportPreview,
  type LeadsFilters
} from "@/api/leads-service";
import type { Lead, LeadsMetadata } from "@/api/leads-types";

const LEADS_GRID_COLUMN_VISIBILITY_STORAGE_KEY = "crm_leads_grid_column_visibility_v1";
const IMPORT_FIELDS: Array<{ key: LeadImportField; label: string; required?: boolean }> = [
  { key: "name", label: "Name", required: true },
  { key: "date", label: "Date" },
  { key: "mobileNumber", label: "Mobile Number", required: true },
  { key: "whatsappNumber", label: "WhatsApp Number" },
  { key: "occupation", label: "Occupation" },
  { key: "address", label: "Address" },
  { key: "associate", label: "Associate" },
  { key: "oldFollowup", label: "Old Followup" },
  { key: "telecaller", label: "Telecaller" },
  { key: "project", label: "Project" },
  { key: "recall", label: "Recall" },
  { key: "remark", label: "Remark" },
  { key: "source", label: "Source" },
  { key: "status", label: "Status" }
];

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatText = (value?: string | null) => value || "-";

type ImportSummary = {
  message: string;
  importedCount: number;
  failedCount: number;
  errors: Array<{ row: number; message: string }>;
};

function TruncatedCell({ value }: { value?: string | null }) {
  const text = value || "-";
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

function LeadsGridToolbar() {
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

export default function LeadsListPage() {
  const [metadata, setMetadata] = useState<LeadsMetadata | null>(null);
  const [items, setItems] = useState<Lead[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [followupLead, setFollowupLead] = useState<Lead | null>(null);
  const [followupForm, setFollowupForm] = useState({
    type: "Call",
    notes: "",
    nextFollowUpDate: ""
  });
  const [addingQuickFollowup, setAddingQuickFollowup] = useState(false);
  const [statusLead, setStatusLead] = useState<Lead | null>(null);
  const [statusId, setStatusId] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkTelecallerId, setBulkTelecallerId] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [deleteLeadTarget, setDeleteLeadTarget] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<LeadImportPreview | null>(null);
  const [importMappings, setImportMappings] = useState<Partial<Record<LeadImportField, string>>>({});
  const [defaultSourceId, setDefaultSourceId] = useState("");
  const [defaultStatusId, setDefaultStatusId] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [leadsGridColumnVisibilityModel, setLeadsGridColumnVisibilityModel] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") {
      return {};
    }

    try {
      const stored = window.localStorage.getItem(LEADS_GRID_COLUMN_VISIBILITY_STORAGE_KEY);
      if (!stored) {
        return {};
      }
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, boolean>;
      }
      return {};
    } catch {
      return {};
    }
  });
  const [filters, setFilters] = useState({
    status: "",
    source: "",
    telecaller: "",
    project: "",
    fromDate: "",
    toDate: "",
    search: ""
  });

  const query = useMemo<LeadsFilters>(
    () => ({
      page,
      limit: pageSize,
      status: filters.status,
      source: filters.source,
      telecaller: filters.telecaller,
      project: filters.project,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      search: filters.search
    }),
    [filters, page, pageSize]
  );

  const loadAll = async () => {
    setLoading(true);
    setError("");

    try {
      const [meta, leadsResponse] = await Promise.all([getLeadsMeta(), getLeads(query)]);
      setMetadata(meta);
      setItems(leadsResponse.items);
      setTotalPages(leadsResponse.pagination.totalPages || 1);
      if (!defaultSourceId && meta.sources[0]) {
        setDefaultSourceId(String(meta.sources[0].Id));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, [page, query]);

  const handleQuickFollowup = async () => {
    if (!followupLead) {
      return;
    }

    setAddingQuickFollowup(true);
    setError("");
    setNotice("");

    try {
      await addLeadFollowup(followupLead.id, {
        type: followupForm.type,
        notes: followupForm.notes || undefined,
        nextFollowUpDate: followupForm.nextFollowUpDate ? new Date(followupForm.nextFollowUpDate).toISOString() : undefined
      });

      setFollowupLead(null);
      setFollowupForm({
        type: "Call",
        notes: "",
        nextFollowUpDate: ""
      });
      setNotice("Follow-up added successfully.");
      await loadAll();
    } catch (followupError) {
      setError(followupError instanceof Error ? followupError.message : "Failed to add follow-up");
    } finally {
      setAddingQuickFollowup(false);
    }
  };

  const handleQuickVisit = async (leadId: string) => {
    await addLeadVisit(leadId, {
      visitDate: new Date().toISOString(),
      feedback: "Scheduled from lead list"
    });

    await loadAll();
  };

  const handleDeleteLead = async () => {
    if (!deleteLeadTarget) {
      return;
    }

    setError("");
    setNotice("");
    setDeletingLead(true);

    try {
      await deleteLead(deleteLeadTarget.id);
      setNotice("Lead deleted successfully.");
      setDeleteLeadTarget(null);
      await loadAll();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete lead");
    } finally {
      setDeletingLead(false);
    }
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({
      status: "",
      source: "",
      telecaller: "",
      project: "",
      fromDate: "",
      toDate: "",
      search: ""
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(LEADS_GRID_COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(leadsGridColumnVisibilityModel));
    } catch {
      // ignore storage errors
    }
  }, [leadsGridColumnVisibilityModel]);

  const leadColumns: Array<GridColDef<Lead>> = [
    { field: "sno", headerName: "CRN", width: 90 },
    { field: "name", headerName: "Name", minWidth: 170, flex: 1, renderCell: (params) => <TruncatedCell value={params.row.name} /> },
    { field: "date", headerName: "Date", width: 120, renderCell: (params) => formatDate(params.row.date) },
    {
      field: "mobileNumber",
      headerName: "Mobile Number",
      width: 140,
      renderCell: (params) =>
        params.row.mobileNumber ? (
          <Tooltip title={params.row.mobileNumber} placement="top" arrow>
            <a href={`tel:${params.row.mobileNumber}`} className="block truncate text-blue-600 hover:underline">
              {params.row.mobileNumber}
            </a>
          </Tooltip>
        ) : (
          "-"
        )
    },
    { field: "whatsappNumber", headerName: "WhatsApp Number", width: 150, renderCell: (params) => <TruncatedCell value={formatText(params.row.whatsappNumber)} /> },
    { field: "occupation", headerName: "Occupation", width: 140, renderCell: (params) => <TruncatedCell value={formatText(params.row.occupation)} /> },
    { field: "address", headerName: "Address", minWidth: 220, flex: 1, renderCell: (params) => <TruncatedCell value={params.row.address} />, sortable: false },
    { field: "associate", headerName: "Associate", width: 140, renderCell: (params) => <TruncatedCell value={formatText(params.row.associate)} /> },
    { field: "oldFollowup", headerName: "Old Followup", minWidth: 180, flex: 1, renderCell: (params) => <TruncatedCell value={params.row.oldFollowup} />, sortable: false },
    { field: "telecallerName", headerName: "Telecaller", width: 150, renderCell: (params) => <TruncatedCell value={formatText(params.row.telecallerName)} /> },
    { field: "projectName", headerName: "Project", minWidth: 180, flex: 1, renderCell: (params) => <TruncatedCell value={params.row.projectName} />, sortable: false },
    { field: "recall", headerName: "Recall", width: 120, renderCell: (params) => formatDate(params.row.recall) },
    { field: "remark", headerName: "Remark", minWidth: 200, flex: 1, renderCell: (params) => <TruncatedCell value={params.row.remark} />, sortable: false },
    { field: "sourceName", headerName: "Source", width: 150, renderCell: (params) => <TruncatedCell value={params.row.sourceName} /> },
    {
      field: "statusName",
      headerName: "Status",
      width: 140,
      sortComparator: (_a, _b, param1, param2) => param1.row.statusSortOrder - param2.row.statusSortOrder,
      renderCell: (params) => <LeadStatusBadge name={params.row.statusName} sortOrder={params.row.statusSortOrder} />
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 110,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <LeadActionsMenu
          leadId={params.row.id}
          onAddFollowup={() => setFollowupLead(params.row)}
          onScheduleVisit={() => void handleQuickVisit(params.row.id)}
          onChangeStatus={() => openStatusModal(params.row)}
          onDelete={() => setDeleteLeadTarget(params.row)}
        />
      )
    }
  ];

  const onLeadsSelectionModelChange = (model: GridRowSelectionModel) => {
    setSelectedLeadIds(model.map(String));
  };

  const handleBulkAssign = async () => {
    if (!bulkTelecallerId || !selectedLeadIds.length) {
      return;
    }

    setBulkAssigning(true);
    setError("");
    setNotice("");

    try {
      await Promise.all(selectedLeadIds.map((leadId) => updateLead(leadId, { telecallerId: bulkTelecallerId })));
      setNotice(`Assigned ${selectedLeadIds.length} lead${selectedLeadIds.length > 1 ? "s" : ""} successfully.`);
      setBulkAssignOpen(false);
      setBulkTelecallerId("");
      await loadAll();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Failed to assign selected leads");
    } finally {
      setBulkAssigning(false);
    }
  };

  const closeImportModal = (options?: { force?: boolean }) => {
    if (!options?.force && (previewLoading || importing)) {
      return;
    }

    setImportOpen(false);
    setImportFile(null);
    setImportPreview(null);
    setImportMappings({});
    setDefaultSourceId("");
    setDefaultStatusId("");
  };

  const handleFilePreview = async (file: File) => {
    setPreviewLoading(true);
    setError("");
    setNotice("");
    setImportSummary(null);

    try {
      const preview = await previewLeadImport(file);
      setImportFile(file);
      setImportPreview(preview);
      setImportMappings(preview.suggestedMappings);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Failed to preview import file");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile || !importPreview) {
      return;
    }

    if (!importMappings.name || !importMappings.mobileNumber) {
      setError("Please map Name and Mobile Number before importing.");
      return;
    }

    if (!importMappings.source && !defaultSourceId) {
      setError("Please map Source or choose a default source.");
      return;
    }

    setImporting(true);
    setError("");
    setNotice("");
    setImportSummary(null);

    try {
      const result = await importLeadsFromFile({
        file: importFile,
        mappings: importMappings,
        defaultSourceId: importMappings.source ? undefined : defaultSourceId,
        defaultStatusId
      });
      setImportSummary(result);
      setNotice(result.message);
      closeImportModal({ force: true });
      await loadAll();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Failed to import leads");
    } finally {
      setImporting(false);
    }
  };

  function openStatusModal(lead: Lead) {
    setStatusLead(lead);
    setStatusId(String(lead.statusId));
  }

  const closeStatusModal = () => {
    if (savingStatus) {
      return;
    }

    setStatusLead(null);
    setStatusId("");
  };

  const handleStatusUpdate = async () => {
    if (!statusLead || !statusId) {
      return;
    }

    setSavingStatus(true);
    setError("");

    try {
      await updateLead(statusLead.id, { statusId: Number(statusId) });
      setSavingStatus(false);
      closeStatusModal();
      await loadAll();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to update lead status");
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <section className="space-y-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between px-2 py-3">
          <CardTitle className="text-sm">Leads</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={!selectedLeadIds.length} onClick={() => setBulkAssignOpen(true)}>
              <Users className="mr-1 h-4 w-4" />
              Bulk Assign
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowFilters((prev) => !prev)}>
              <Filter className="mr-1 h-4 w-4" />
              Filter
            </Button>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1 h-4 w-4" />
              Import Leads
            </Button>
            <Link to="/leads/create">
              <Button size="sm">Create Lead</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-2 pb-3 pt-0">
          {showFilters ? (
            <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-4">
                <Input
                  className="h-9 text-xs"
                  placeholder="Search name, mobile, WhatsApp, address"
                  value={filters.search}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((prev) => ({ ...prev, search: event.target.value }));
                  }}
                />
                <Select
                  className="h-9 text-xs"
                  value={filters.status}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((prev) => ({ ...prev, status: event.target.value }));
                  }}
                >
                  <option value="">All Statuses</option>
                  {(metadata?.statuses || []).map((status) => (
                    <option key={status.Id} value={String(status.Id)}>
                      {status.Name}
                    </option>
                  ))}
                </Select>
                <Select
                  className="h-9 text-xs"
                  value={filters.source}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((prev) => ({ ...prev, source: event.target.value }));
                  }}
                >
                  <option value="">All Sources</option>
                  {(metadata?.sources || []).map((source) => (
                    <option key={source.Id} value={String(source.Id)}>
                      {source.Name}
                    </option>
                  ))}
                </Select>
                <Select
                  className="h-9 text-xs"
                  value={filters.telecaller}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((prev) => ({ ...prev, telecaller: event.target.value }));
                  }}
                >
                  <option value="">All Telecallers</option>
                  {(metadata?.telecallers || []).map((telecaller) => (
                    <option key={telecaller.Id} value={telecaller.Id}>
                      {telecaller.Name}
                    </option>
                  ))}
                </Select>
                <Select
                  className="h-9 text-xs"
                  value={filters.project}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((prev) => ({ ...prev, project: event.target.value }));
                  }}
                >
                  <option value="">All Projects</option>
                  {(metadata?.projects || []).map((project) => (
                    <option key={project.Id} value={project.Id}>
                      {project.Name}
                    </option>
                  ))}
                </Select>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={filters.fromDate}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((prev) => ({ ...prev, fromDate: event.target.value }));
                  }}
                />
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={filters.toDate}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((prev) => ({ ...prev, toDate: event.target.value }));
                  }}
                />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowFilters(false)}>
                  Hide Filters
                </Button>
              </div>
            </div>
          ) : null}

          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          {notice ? <p className="text-xs text-green-600">{notice}</p> : null}
          {importSummary ? (
            <div className="rounded-sm border border-gray-200 bg-gray-50 p-3 text-xs">
              <p className="font-medium text-gray-800">{importSummary.message}</p>
              <p className="mt-1 text-gray-600">
                Imported: {importSummary.importedCount} | Failed: {importSummary.failedCount}
              </p>
              {importSummary.errors.length ? (
                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-sm border border-red-100 bg-white p-2">
                  {importSummary.errors.map((item, index) => (
                    <div key={`${item.row}-${index}`} className="rounded-sm border border-red-100 bg-red-50 p-2 text-red-700">
                      <p className="font-medium">Row {item.row}</p>
                      <p className="mt-1">{item.message}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="w-full overflow-x-auto">
            <div style={{ minWidth: 1100, height: 560 }}>
              <DataGrid
                density="compact"
                rows={items}
                columns={leadColumns}
                getRowId={(row) => row.id}
                loading={loading}
                checkboxSelection
                disableRowSelectionOnClick
                rowSelectionModel={selectedLeadIds as GridRowSelectionModel}
                onRowSelectionModelChange={onLeadsSelectionModelChange}
                columnVisibilityModel={leadsGridColumnVisibilityModel}
                onColumnVisibilityModelChange={setLeadsGridColumnVisibilityModel}
                slots={{ toolbar: LeadsGridToolbar }}
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

          {loading ? <p className="text-xs text-gray-500">Loading leads...</p> : null}
          {!loading ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPage(1);
                setPageSize(value);
              }}
            />
          ) : null}
        </CardContent>
      </Card>

      {followupLead
        ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Add Follow-up</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="rounded-sm border border-gray-200 bg-gray-50 p-3 text-xs">
                <p className="font-medium text-gray-800">{followupLead.name}</p>
                <p className="text-gray-500">{followupLead.mobileNumber || "-"}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Type</label>
                  <Select
                    className="h-9 text-xs"
                    value={followupForm.type}
                    disabled={addingQuickFollowup}
                    onChange={(event) => setFollowupForm((prev) => ({ ...prev, type: event.target.value }))}
                  >
                    <option value="Call">Call</option>
                    <option value="Meeting">Meeting</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Site Visit">Site Visit</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Next Follow-up</label>
                  <Input
                    type="datetime-local"
                    className="h-9 text-xs"
                    disabled={addingQuickFollowup}
                    value={followupForm.nextFollowUpDate}
                    onChange={(event) => setFollowupForm((prev) => ({ ...prev, nextFollowUpDate: event.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Notes</label>
                <Input
                  className="h-9 text-xs"
                  placeholder="Enter follow-up notes"
                  disabled={addingQuickFollowup}
                  value={followupForm.notes}
                  onChange={(event) => setFollowupForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" disabled={addingQuickFollowup} onClick={() => setFollowupLead(null)}>
                  Cancel
                </Button>
                <Button size="sm" disabled={addingQuickFollowup} onClick={() => void handleQuickFollowup()}>
                  {addingQuickFollowup ? "Adding..." : "Add Follow-up"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>,
        document.body
      ) : null}

      {statusLead
        ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Change Lead Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="rounded-sm border border-gray-200 bg-gray-50 p-3 text-xs">
                <p className="font-medium text-gray-800">{statusLead.name}</p>
                <p className="text-gray-500">{statusLead.mobileNumber || "-"}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Status</label>
                <Select className="h-9 text-xs" value={statusId} disabled={savingStatus} onChange={(event) => setStatusId(event.target.value)}>
                  {(metadata?.statuses || []).map((status) => (
                    <option key={status.Id} value={status.Id}>
                      {status.Name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" disabled={savingStatus} onClick={closeStatusModal}>
                  Cancel
                </Button>
                <Button size="sm" disabled={savingStatus || !statusId} onClick={() => void handleStatusUpdate()}>
                  {savingStatus ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>,
        document.body
      ) : null}

      {deleteLeadTarget
        ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm text-red-600">Delete Lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <p className="text-sm text-gray-700">
                Do you want to delete lead <span className="font-medium">{deleteLeadTarget.name}</span>?
              </p>
              <p className="text-xs text-gray-500">This will remove the lead from the list.</p>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" disabled={deletingLead} onClick={() => setDeleteLeadTarget(null)}>
                  Cancel
                </Button>
                <Button size="sm" disabled={deletingLead} className="bg-red-600 hover:bg-red-700" onClick={() => void handleDeleteLead()}>
                  {deletingLead ? "Deleting..." : "Delete Lead"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>,
        document.body
      ) : null}

      {bulkAssignOpen
        ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Bulk Assign Telecaller</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <p className="text-sm text-gray-700">
                Assign <span className="font-medium">{selectedLeadIds.length}</span> selected lead{selectedLeadIds.length > 1 ? "s" : ""} to a telecaller.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Telecaller</label>
                <Select className="h-9 text-xs" value={bulkTelecallerId} disabled={bulkAssigning} onChange={(event) => setBulkTelecallerId(event.target.value)}>
                  <option value="">Select Telecaller</option>
                  {(metadata?.telecallers || []).map((telecaller) => (
                    <option key={telecaller.Id} value={telecaller.Id}>
                      {telecaller.Name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" disabled={bulkAssigning} onClick={() => setBulkAssignOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" disabled={bulkAssigning || !bulkTelecallerId} onClick={() => void handleBulkAssign()}>
                  {bulkAssigning ? "Assigning..." : "Assign Leads"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>,
        document.body
      ) : null}

      {importOpen
        ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col">
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
              <CardTitle className="text-sm">Import Leads</CardTitle>
              <Button size="sm" variant="outline" disabled={previewLoading || importing} onClick={() => closeImportModal()}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto p-4 pt-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleFilePreview(file);
                  }
                }}
              />
              <div
                className="rounded-sm border border-dashed border-gray-300 bg-gray-50 p-6 text-center"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (file) {
                    void handleFilePreview(file);
                  }
                }}
              >
                <p className="text-sm font-medium text-gray-800">Drag and drop a CSV or Excel file here</p>
                <p className="mt-1 text-xs text-gray-500">or browse to upload `.csv`, `.xlsx`, or `.xls` files</p>
                <div className="mt-3 flex justify-center">
                  <Button size="sm" variant="outline" disabled={previewLoading || importing} onClick={() => fileInputRef.current?.click()}>
                    {previewLoading ? "Reading File..." : "Browse File"}
                  </Button>
                </div>
                {importFile ? <p className="mt-2 text-xs text-gray-600">Selected file: {importFile.name}</p> : null}
              </div>

              {importPreview ? (
                <>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-sm border border-gray-200 bg-gray-50 p-3 text-xs">
                      <p className="text-gray-500">Rows Found</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">{importPreview.totalRows}</p>
                    </div>
                    <div className="rounded-sm border border-gray-200 bg-gray-50 p-3 text-xs">
                      <p className="text-gray-500">Default Source</p>
                      <Select className="mt-1 h-9 text-xs" value={defaultSourceId} onChange={(event) => setDefaultSourceId(event.target.value)}>
                        <option value="">Select Source</option>
                        {(metadata?.sources || []).map((source) => (
                          <option key={source.Id} value={source.Id}>
                            {source.Name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="rounded-sm border border-gray-200 bg-gray-50 p-3 text-xs">
                      <p className="text-gray-500">Default Status</p>
                      <Select className="mt-1 h-9 text-xs" value={defaultStatusId} onChange={(event) => setDefaultStatusId(event.target.value)}>
                        <option value="">Default New Status</option>
                        {(metadata?.statuses || []).map((status) => (
                          <option key={status.Id} value={status.Id}>
                            {status.Name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="rounded-sm border border-gray-200 p-3">
                    <p className="mb-3 text-sm font-medium text-gray-800">Map File Columns</p>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {IMPORT_FIELDS.map((field) => (
                        <div key={field.key} className="space-y-1">
                          <label className="text-xs font-medium text-gray-700">
                            {field.label}
                            {field.required ? <span className="ml-1 text-red-600">*</span> : null}
                          </label>
                          <Select
                            className="h-9 text-xs"
                            value={importMappings[field.key] || ""}
                            onChange={(event) =>
                              setImportMappings((prev) => ({
                                ...prev,
                                [field.key]: event.target.value || undefined
                              }))
                            }
                          >
                            <option value="">Do not import</option>
                            {importPreview.headers.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-sm border border-gray-200 p-3">
                    <p className="mb-3 text-sm font-medium text-gray-800">Preview Rows</p>
                    <div className="overflow-x-auto">
                      <Table className="[&_th]:px-2 [&_td]:px-2">
                        <TableHeader>
                          <TableRow>
                            {importPreview.headers.map((header) => (
                              <TableHead key={header}>{header}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.sampleRows.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              {importPreview.headers.map((header) => (
                                <TableCell key={`${rowIndex}-${header}`}>{String(row[header] ?? "-")}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" disabled={importing} onClick={() => closeImportModal()}>
                      Cancel
                    </Button>
                    <Button size="sm" disabled={importing} onClick={() => void handleImport()}>
                      {importing ? "Importing..." : "Import Leads"}
                    </Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>,
        document.body
      ) : null}
    </section>
  );
}
