import { apiRequest } from "@/api/api";
import type {
  Lead,
  LeadActivity,
  LeadFollowup,
  LeadsMetadata,
  LeadsPagination,
  LeadVisit
} from "@/api/leads-types";

export type LeadsFilters = {
  page?: number;
  limit?: number;
  status?: string;
  telecaller?: string;
  source?: string;
  project?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
};

type LeadsListResponse = {
  success: boolean;
  items: Lead[];
  pagination: LeadsPagination;
};

type LeadResponse = {
  success: boolean;
  lead: Lead;
};

type LeadsMetaResponse = LeadsMetadata & {
  success: boolean;
};

type FollowupsResponse = {
  success: boolean;
  items: LeadFollowup[];
};

type FollowupResponse = {
  success: boolean;
  followup: LeadFollowup;
};

type VisitsResponse = {
  success: boolean;
  items: LeadVisit[];
};

type VisitResponse = {
  success: boolean;
  visit: LeadVisit;
};

type ActivitiesResponse = {
  success: boolean;
  items: LeadActivity[];
};

export type LeadImportField =
  | "name"
  | "date"
  | "mobileNumber"
  | "whatsappNumber"
  | "occupation"
  | "address"
  | "associate"
  | "oldFollowup"
  | "telecaller"
  | "project"
  | "recall"
  | "remark"
  | "source"
  | "status";

export type LeadImportPreview = {
  headers: string[];
  totalRows: number;
  sampleRows: Array<Record<string, unknown>>;
  suggestedMappings: Partial<Record<LeadImportField, string>>;
};

export type LeadImportResult = {
  importedCount: number;
  failedCount: number;
  errors: Array<{ row: number; message: string }>;
  message: string;
};

export type CreateLeadPayload = {
  name: string;
  date: string;
  mobileNumber: string;
  whatsappNumber?: string;
  occupation?: string;
  address?: string;
  associate?: string;
  oldFollowup?: string;
  telecallerId?: string;
  projectId?: string;
  recall?: string;
  remark?: string;
  sourceId: number;
  statusId?: number;
};

export type UpdateLeadPayload = Partial<CreateLeadPayload>;

export async function getLeads(filters: LeadsFilters): Promise<{ items: Lead[]; pagination: LeadsPagination }> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const response = await apiRequest<LeadsListResponse>(`/api/v1/leads?${params.toString()}`);
  return {
    items: response.items,
    pagination: response.pagination
  };
}

export async function getLeadsMeta(): Promise<LeadsMetadata> {
  const response = await apiRequest<LeadsMetaResponse>("/api/v1/leads/meta");
  return {
    statuses: response.statuses,
    sources: response.sources,
    telecallers: response.telecallers,
    projects: response.projects
  };
}

export async function getLeadById(id: string): Promise<Lead> {
  const response = await apiRequest<LeadResponse>(`/api/v1/leads/${id}`);
  return response.lead;
}

export async function createLead(payload: CreateLeadPayload): Promise<Lead> {
  const response = await apiRequest<LeadResponse>("/api/v1/leads", {
    method: "POST",
    body: payload
  });

  return response.lead;
}

export async function updateLead(id: string, payload: UpdateLeadPayload): Promise<Lead> {
  const response = await apiRequest<LeadResponse>(`/api/v1/leads/${id}`, {
    method: "PUT",
    body: payload
  });

  return response.lead;
}

export async function deleteLead(id: string): Promise<void> {
  await apiRequest<{ success: boolean; message: string }>(`/api/v1/leads/${id}`, {
    method: "DELETE"
  });
}

export async function getLeadFollowups(id: string): Promise<LeadFollowup[]> {
  const response = await apiRequest<FollowupsResponse>(`/api/v1/leads/${id}/followups`);
  return response.items;
}

export async function addLeadFollowup(
  id: string,
  payload: { type: string; notes?: string; nextFollowUpDate?: string }
): Promise<LeadFollowup> {
  const response = await apiRequest<FollowupResponse>(`/api/v1/leads/${id}/followups`, {
    method: "POST",
    body: payload
  });

  return response.followup;
}

export async function getLeadVisits(id: string): Promise<LeadVisit[]> {
  const response = await apiRequest<VisitsResponse>(`/api/v1/leads/${id}/visits`);
  return response.items;
}

export async function addLeadVisit(
  id: string,
  payload: { visitDate: string; projectId?: string; unitId?: string; feedback?: string }
): Promise<LeadVisit> {
  const response = await apiRequest<VisitResponse>(`/api/v1/leads/${id}/visits`, {
    method: "POST",
    body: payload
  });

  return response.visit;
}

export async function getLeadActivities(id: string): Promise<LeadActivity[]> {
  const response = await apiRequest<ActivitiesResponse>(`/api/v1/leads/${id}/activities`);
  return response.items;
}

export async function previewLeadImport(file: File): Promise<LeadImportPreview> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiRequest<LeadImportPreview & { success: boolean }>("/api/v1/leads/import/preview", {
    method: "POST",
    body: formData
  });

  return {
    headers: response.headers,
    totalRows: response.totalRows,
    sampleRows: response.sampleRows,
    suggestedMappings: response.suggestedMappings
  };
}

export async function importLeadsFromFile(input: {
  file: File;
  mappings: Partial<Record<LeadImportField, string>>;
  defaultSourceId?: string;
  defaultStatusId?: string;
}): Promise<LeadImportResult> {
  const formData = new FormData();
  formData.append("file", input.file);
  Object.entries(input.mappings).forEach(([field, header]) => {
    if (header) {
      formData.append(`mapping_${field}`, header);
    }
  });
  if (input.defaultSourceId) {
    formData.append("defaultSourceId", input.defaultSourceId);
  }
  if (input.defaultStatusId) {
    formData.append("defaultStatusId", input.defaultStatusId);
  }

  const response = await apiRequest<LeadImportResult & { success: boolean }>("/api/v1/leads/import", {
    method: "POST",
    body: formData
  });

  return {
    importedCount: response.importedCount,
    failedCount: response.failedCount,
    errors: response.errors,
    message: response.message
  };
}
