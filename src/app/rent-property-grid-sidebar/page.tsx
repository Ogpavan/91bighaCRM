import { PropertySearchResultsPage } from "@/components/property-search-results-page";
import { getListingAreaRange, getListingPriceRange, getPropertyTypeOptions, listBedBathOptions, listLocationLocalityOptions, searchProperties } from "@/lib/properties";

type RentPropertyGridSidebarPageProps = {
  searchParams: Promise<{
    propertyType?: string;
    location?: string;
    locality?: string | string[];
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

function clampToRange(value: number | null, minValue: number | null, maxValue: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value;
  }

  let nextValue = value;
  if (typeof minValue === "number" && Number.isFinite(minValue)) {
    nextValue = Math.max(nextValue, minValue);
  }
  if (typeof maxValue === "number" && Number.isFinite(maxValue)) {
    nextValue = Math.min(nextValue, maxValue);
  }

  return nextValue;
}

function parseLocalities(value?: string | string[]) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const normalized = values
    .flatMap((entry) => String(entry).split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);

  return normalized.length ? Array.from(new Set(normalized)).slice(0, 25) : null;
}

export const dynamic = "force-dynamic";

export default async function RentPropertyGridSidebarPage({
  searchParams
}: RentPropertyGridSidebarPageProps) {
  const pageSize = 20;
  const params = await searchParams;
  const page = parsePage(params.page);
  const rawMinPrice = parseAmount(params.minPrice);
  const rawMaxPrice = parseAmount(params.maxPrice);
  const normalizedPrices = normalizePriceRange(
    rawMinPrice,
    rawMaxPrice
  );
  const priceWasSwapped =
    typeof rawMinPrice === "number" &&
    typeof rawMaxPrice === "number" &&
    Number.isFinite(rawMinPrice) &&
    Number.isFinite(rawMaxPrice) &&
    rawMinPrice > rawMaxPrice;

  const rawMinArea = parseInteger(params.minArea);
  const rawMaxArea = parseInteger(params.maxArea);
  const normalizedArea = normalizeRange(
    rawMinArea,
    rawMaxArea
  );
  const areaWasSwapped =
    typeof rawMinArea === "number" &&
    typeof rawMaxArea === "number" &&
    Number.isFinite(rawMinArea) &&
    Number.isFinite(rawMaxArea) &&
    rawMinArea > rawMaxArea;
  const priceRange = await getListingPriceRange("rent");
  const areaRange = await getListingAreaRange("rent");
  const selectedLocalities = parseLocalities(params.locality);
  const filters = {
    propertyType: params.propertyType?.trim() || null,
    location: params.location?.trim() || null,
    localities: selectedLocalities,
    minPrice: clampToRange(normalizedPrices.minPrice, priceRange.minPrice, priceRange.maxPrice),
    maxPrice: clampToRange(normalizedPrices.maxPrice, priceRange.minPrice, priceRange.maxPrice),
    bedrooms: parseInteger(params.bedrooms),
    bathrooms: parseInteger(params.bathrooms),
    minArea: clampToRange(normalizedArea.minValue, areaRange.minArea, areaRange.maxArea),
    maxArea: clampToRange(normalizedArea.maxValue, areaRange.minArea, areaRange.maxArea)
  };

  const result = await searchProperties({
    listingType: "rent",
    page,
    limit: pageSize,
    ...filters
  });
  const propertyTypeOptions = await getPropertyTypeOptions("rent");
  const locationLocalityOptions = await listLocationLocalityOptions("rent");
  const bedBathOptions = await listBedBathOptions("rent");
  const suggestedResult = result.total === 0
    ? await searchProperties({ listingType: "rent", page: 1, limit: 4 })
    : null;
  const suggestedProperties = suggestedResult?.items ?? [];

  return (
    <PropertySearchResultsPage
      listingType="rent"
      properties={result.items}
      suggestedProperties={suggestedProperties}
      propertyTypeOptions={propertyTypeOptions}
      locationLocalityOptions={locationLocalityOptions}
      bedBathOptions={bedBathOptions}
      priceRange={priceRange}
      areaRange={areaRange}
      filterNotices={{
        priceWasSwapped,
        areaWasSwapped
      }}
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
