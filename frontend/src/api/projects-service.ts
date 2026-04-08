const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

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

export type CreateProjectPayload = {
  title: string;
  description?: string;
  listingType: string;
  propertyTypeId: number;
  locality: string;
  city?: string;
  state?: string;
  addressLine1?: string;
  pincode?: string;
  status?: string;
  possessionStatus?: string;
  priceAmount?: number;
  rentAmount?: number;
  securityDeposit?: number;
  maintenanceAmount?: number;
  priceLabel?: string;
  bedrooms?: number;
  bathrooms?: number;
  balconies?: number;
  builtupArea?: number;
  builtupAreaUnit?: string;
  parkingCount?: number;
  furnishingStatus?: string;
  coverImageUrl?: string;
  isFeatured?: boolean;
  isVerified?: boolean;
};

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

async function parseResponse<T extends { ok: boolean; error?: string }>(response: Response): Promise<T> {
  const data = (await response.json()) as T;
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

export async function getProjects(): Promise<{ items: ProjectListing[]; propertyTypes: ProjectPropertyType[] }> {
  const response = await fetch(`${apiBaseUrl}/api/properties`);
  const data = await parseResponse<ProjectsResponse>(response);
  return {
    items: data.items,
    propertyTypes: data.propertyTypes
  };
}

export async function createProject(payload: CreateProjectPayload) {
  const response = await fetch(`${apiBaseUrl}/api/properties`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await parseResponse<ProjectCreateResponse>(response);
  return data.property;
}

export async function importProperties(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${apiBaseUrl}/api/properties/import`, {
    method: "POST",
    body: formData
  });

  return parseResponse<ImportPropertiesResponse>(response);
}
