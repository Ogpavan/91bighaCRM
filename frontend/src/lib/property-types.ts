export const CRM_PROPERTY_TYPES = [
  "Apartment",
  "Villa",
  "Plot",
  "Independent House",
  "Shop",
  "Office"
] as const;

export type CrmPropertyType = (typeof CRM_PROPERTY_TYPES)[number];

export function getCrmPropertyTypeItems() {
  return CRM_PROPERTY_TYPES.map((name, index) => ({
    id: String(index + 1),
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  }));
}
