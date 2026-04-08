export type LeadStatus = {
  Id: number;
  Name: string;
  SortOrder: number;
};

export type LeadSource = {
  Id: number;
  Name: string;
};

export type LeadOption = {
  Id: string;
  Name: string;
};

export type Lead = {
  id: string;
  sno: number;
  name: string;
  date: string;
  mobileNumber: string | null;
  whatsappNumber: string | null;
  occupation: string | null;
  address: string | null;
  associate: string | null;
  oldFollowup: string | null;
  telecallerId: string | null;
  telecallerName: string | null;
  projectId: string | null;
  projectName: string | null;
  recall: string | null;
  remark: string | null;
  sourceId: number;
  sourceName: string;
  statusId: number;
  statusName: string;
  statusSortOrder: number;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string | null;
  isDeleted: boolean;
  lastActivityAt: string | null;
};

export type LeadFollowup = {
  id: string;
  leadId: string;
  type: string;
  notes: string | null;
  nextFollowUpDate: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  isOverdue: boolean;
};

export type LeadVisit = {
  id: string;
  leadId: string;
  visitDate: string;
  projectId: string | null;
  projectName: string | null;
  unitId: string | null;
  feedback: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
};

export type LeadActivity = {
  id: string;
  type: string;
  text: string;
  meta: Record<string, unknown> | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
};

export type LeadsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type LeadsMetadata = {
  statuses: LeadStatus[];
  sources: LeadSource[];
  telecallers: LeadOption[];
  projects: LeadOption[];
};
