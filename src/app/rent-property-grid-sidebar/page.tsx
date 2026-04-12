import { PropertySearchResultsPage } from "@/components/property-search-results-page";
import { getPropertyTypeOptions, searchProperties } from "@/lib/properties";

type RentPropertyGridSidebarPageProps = {
  searchParams: Promise<{
    propertyType?: string;
    location?: string;
    minPrice?: string;
    maxPrice?: string;
    bedrooms?: string;
    bathrooms?: string;
    minArea?: string;
    maxArea?: string;
  }>;
};

function parseAmount(value?: string) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^0-9.]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function parseInteger(value?: string) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^0-9]/g, "");
  const amount = Number.parseInt(normalized, 10);
  return Number.isFinite(amount) ? amount : null;
}

function normalizePriceRange(minPrice: number | null, maxPrice: number | null) {
  if (
    typeof minPrice === "number" &&
    typeof maxPrice === "number" &&
    Number.isFinite(minPrice) &&
    Number.isFinite(maxPrice) &&
    minPrice > maxPrice
  ) {
    return { minPrice: maxPrice, maxPrice: minPrice };
  }

  return { minPrice, maxPrice };
}

function normalizeRange(minValue: number | null, maxValue: number | null) {
  if (
    typeof minValue === "number" &&
    typeof maxValue === "number" &&
    Number.isFinite(minValue) &&
    Number.isFinite(maxValue) &&
    minValue > maxValue
  ) {
    return { minValue: maxValue, maxValue: minValue };
  }

  return { minValue, maxValue };
}

export const dynamic = "force-dynamic";

export default async function RentPropertyGridSidebarPage({
  searchParams
}: RentPropertyGridSidebarPageProps) {
  const params = await searchParams;
  const normalizedPrices = normalizePriceRange(
    parseAmount(params.minPrice),
    parseAmount(params.maxPrice)
  );
  const normalizedArea = normalizeRange(
    parseInteger(params.minArea),
    parseInteger(params.maxArea)
  );
  const filters = {
    propertyType: params.propertyType?.trim() || null,
    location: params.location?.trim() || null,
    minPrice: normalizedPrices.minPrice,
    maxPrice: normalizedPrices.maxPrice,
    bedrooms: parseInteger(params.bedrooms),
    bathrooms: parseInteger(params.bathrooms),
    minArea: normalizedArea.minValue,
    maxArea: normalizedArea.maxValue
  };

  const properties = await searchProperties({
    listingType: "rent",
    ...filters
  });
  const propertyTypeOptions = await getPropertyTypeOptions();

  return (
    <PropertySearchResultsPage
      listingType="rent"
      properties={properties}
      propertyTypeOptions={propertyTypeOptions}
      filters={filters}
    />
  );
}
