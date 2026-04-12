import { getCrmPropertyTypeItems } from "@/lib/property-types";

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
  return getCrmPropertyTypeItems().map((item) => ({
    ...item,
    property_count: "0"
  }));
}

export async function createPropertyType(payload: { name: string }): Promise<PropertyTypeItem> {
  throw new Error(`Property types are fixed in CRM. "${payload.name}" cannot be created.`);
}

export async function updatePropertyType(propertyTypeId: string, payload: { name: string }): Promise<PropertyTypeItem> {
  throw new Error(`Property types are fixed in CRM. "${payload.name}" cannot be updated.`);
}

export async function deletePropertyType(propertyTypeId: string): Promise<void> {
  throw new Error(`Property types are fixed in CRM. "${propertyTypeId}" cannot be deleted.`);
}
