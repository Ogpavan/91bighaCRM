import { apiRequest } from "@/api/api";

export type PropertyTypeItem = {
  id: string;
  name: string;
  slug: string;
  property_count?: string;
};

type PropertyTypesResponse = {
  success: boolean;
  items: PropertyTypeItem[];
};

type PropertyTypeResponse = {
  success: boolean;
  propertyType: PropertyTypeItem;
};

export async function getPropertyTypes(): Promise<PropertyTypeItem[]> {
  const response = await apiRequest<PropertyTypesResponse>("/api/v1/property-types");
  return response.items;
}

export async function createPropertyType(payload: { name: string }): Promise<PropertyTypeItem> {
  const response = await apiRequest<PropertyTypeResponse>("/api/v1/property-types", {
    method: "POST",
    body: payload
  });
  return response.propertyType;
}

export async function updatePropertyType(propertyTypeId: string, payload: { name: string }): Promise<PropertyTypeItem> {
  const response = await apiRequest<PropertyTypeResponse>(`/api/v1/property-types/${propertyTypeId}`, {
    method: "PUT",
    body: payload
  });
  return response.propertyType;
}

export async function deletePropertyType(propertyTypeId: string): Promise<void> {
  await apiRequest<{ success: boolean; message: string }>(`/api/v1/property-types/${propertyTypeId}`, {
    method: "DELETE"
  });
}
