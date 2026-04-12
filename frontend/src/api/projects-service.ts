import { apiRequest } from "@/api/api";
import { getCrmPropertyTypeItems } from "@/lib/property-types";

export type ProjectPropertyType = {
  id: number;
  name: string;
  slug: string;
};

export type ProjectListing = {
  id: string;
  propertyCode: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  listingType: string;
  propertyType: string;
  locality: string | null;
  city: string | null;
  state: string | null;
  addressLine1: string | null;
  priceAmount: number | null;
  rentAmount: number | null;
  priceLabel: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  builtupArea: number | null;
  builtupAreaUnit: string | null;
  coverImage: string | null;
  isFeatured: boolean;
  isVerified: boolean;
  publishedAt: string | null;
};

export type ProjectDetail = ProjectListing & {
  country: string | null;
  subLocality: string | null;
  addressLine2: string | null;
  landmark: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  possessionStatus: string | null;
  facing: string | null;
  securityDeposit: number | null;
  maintenanceAmount: number | null;
  balconies: number | null;
  floorsTotal: number | null;
  floorNumber: number | null;
  carpetArea: number | null;
  plotArea: number | null;
  parkingCount: number | null;
  furnishingStatus: string | null;
  ageOfProperty: number | null;
  images: string[];
  features: string[];
};

export type CreateProjectPayload = {
  title: string;
  description?: string;
  listingType: string;
  propertyType: string;
  locality: string;
  country?: string;
  city?: string;
  state?: string;
  subLocality?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  pincode?: string;
  status?: string;
  possessionStatus?: string;
  facing?: string;
  latitude?: number;
  longitude?: number;
  priceAmount?: number;
  rentAmount?: number;
  securityDeposit?: number;
  maintenanceAmount?: number;
  priceLabel?: string;
  bedrooms?: number;
  bathrooms?: number;
  balconies?: number;
  floorNumber?: number;
  floorsTotal?: number;
  builtupArea?: number;
  builtupAreaUnit?: string;
  carpetArea?: number;
  plotArea?: number;
  parkingCount?: number;
  furnishingStatus?: string;
  ageOfProperty?: number;
  coverImageUrl?: string;
  imageUrls?: string[];
  features?: string[];
  source?: string;
  coverImageFile?: File | null;
  galleryImageFiles?: File[];
  isFeatured?: boolean;
  isVerified?: boolean;
};

export type UpdateProjectPayload = CreateProjectPayload;

type ProjectsResponse = {
  ok: boolean;
  items: ProjectListing[];
  propertyTypes: ProjectPropertyType[];
  error?: string;
};

type ProjectCreateResponse = {
  ok: boolean;
  property?: {
    id: string;
    propertyCode: string;
    slug: string;
  };
  error?: string;
};

type ProjectDeleteResponse = {
  ok: boolean;
  error?: string;
};

type ProjectDetailResponse = {
  ok: boolean;
  property: ProjectDetail;
  error?: string;
};

export type ImportPropertiesResponse = {
  ok: boolean;
  importedCount: number;
  failedCount: number;
  imported: Array<{ row: number; propertyCode: string; slug: string }>;
  errors: Array<{ row: number; error: string }>;
  mapping: Record<string, string | null>;
  headers: string[];
  error?: string;
};

export async function getProjects(): Promise<{ items: ProjectListing[]; propertyTypes: ProjectPropertyType[] }> {
  const data = await apiRequest<ProjectsResponse>("/api/properties");
  return {
    items: data.items,
    propertyTypes: getCrmPropertyTypeItems()
  };
}

export async function createProject(payload: CreateProjectPayload) {
  const formData = buildProjectFormData(payload);

  const data = await apiRequest<ProjectCreateResponse>("/api/properties", {
    method: "POST",
    body: formData
  });
  return data.property;
}

export async function getProjectById(propertyId: string): Promise<ProjectDetail> {
  const data = await apiRequest<ProjectDetailResponse>(`/api/properties/${propertyId}`);
  return data.property;
}

export async function updateProject(propertyId: string, payload: UpdateProjectPayload) {
  const hasFiles = Boolean(payload.coverImageFile) || Boolean(payload.galleryImageFiles?.length);
  const data = await apiRequest<ProjectCreateResponse>(`/api/properties/${propertyId}`, {
    method: "PUT",
    body: hasFiles ? buildProjectFormData(payload) : payload
  });
  return data.property;
}

export async function deleteProject(propertyId: string) {
  return apiRequest<ProjectDeleteResponse>(`/api/properties/${propertyId}`, {
    method: "DELETE"
  });
}

function buildProjectFormData(payload: CreateProjectPayload) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (key === "coverImageFile" || key === "galleryImageFiles") {
      return;
    }

    if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
      return;
    }

    formData.append(key, String(value));
  });

  if (payload.coverImageFile) {
    formData.append("coverImage", payload.coverImageFile);
  }

  for (const file of payload.galleryImageFiles || []) {
    formData.append("galleryImages", file);
  }

  return formData;
}

export async function importProperties(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<ImportPropertiesResponse>("/api/properties/import", {
    method: "POST",
    body: formData
  });
}
