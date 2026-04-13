import { PropertySearchResultsPage } from "@/components/property-search-results-page";
import { getPropertyTypeOptions, searchProperties } from "@/lib/properties";

type BuyPropertyGridSidebarPageProps = {
  searchParams: Promise<{
    propertyType?: string;
    location?: string;
    minPrice?: string;
    maxPrice?: string;
    bedrooms?: string;
    bathrooms?: string;
    minArea?: string;
    maxArea?: string;
    page?: string;
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

function parsePage(value?: string) {
  const parsed = parseInteger(value);
  return parsed && parsed > 0 ? parsed : 1;
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

export default async function BuyPropertyGridSidebarPage({
  searchParams
}: BuyPropertyGridSidebarPageProps) {
  const pageSize = 20;
  const params = await searchParams;
  const page = parsePage(params.page);
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

  const result = await searchProperties({
    listingType: "sale",
    page,
    limit: pageSize,
    ...filters
  });
  const propertyTypeOptions = await getPropertyTypeOptions();

  return (
    <PropertySearchResultsPage
      listingType="sale"
      properties={result.items}
      propertyTypeOptions={propertyTypeOptions}
      filters={filters}
      pagination={{
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages
      }}
    />
  );
}
