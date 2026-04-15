import Link from "next/link";
import type {
  HomepageProperty,
  ListingAreaRange,
  ListingPriceRange,
  LocationLocalityOption,
  PropertyTypeOption
} from "@/lib/properties";
import {
  formatPropertyAddress,
  formatPropertyArea,
  formatPropertyPrice,
  formatPublishedDate
} from "@/lib/home-property-formatters";

type PropertySearchResultsPageProps = {
  listingType: "sale" | "rent";
  properties: HomepageProperty[];
  suggestedProperties?: HomepageProperty[];
  propertyTypeOptions: PropertyTypeOption[];
  locationLocalityOptions?: LocationLocalityOption[];
  bedBathOptions?: {
    bedrooms: number[];
    bathrooms: number[];
  };
  priceRange?: ListingPriceRange;
  areaRange?: ListingAreaRange;
  filterNotices?: {
    priceWasSwapped?: boolean;
    areaWasSwapped?: boolean;
  };
  filters: {
    propertyType?: string | null;
    location?: string | null;
    localities?: string[] | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    minArea?: number | null;
    maxArea?: number | null;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

function formatMoney(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatBudgetLabel(listingType: "sale" | "rent", amount: number) {
  if (listingType === "rent") {
    if (amount >= 100000) {
      const lakhs = amount / 100000;
      const label = Number.isInteger(lakhs) ? String(lakhs) : lakhs.toFixed(1).replace(/\.0$/, "");
      return `${label} Lakh`;
    }

    if (amount >= 1000) {
      return `${Math.round(amount / 1000)}k`;
    }

    return String(amount);
  }

  if (amount < 10000000) {
    return `${Math.round(amount / 100000)} Lacs`;
  }

  const crores = amount / 10000000;
  if (crores === 1) {
    return "1 Crore";
  }

  const croresLabel = Number.isInteger(crores)
    ? String(crores)
    : crores.toFixed(crores < 2 ? 2 : 1).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  return `${croresLabel} Crores`;
}

function roundToStepUp(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

function buildBudgetOptions(
  listingType: "sale" | "rent",
  minPrice: number | null,
  maxPrice: number | null
) {
  const min =
    typeof minPrice === "number" && Number.isFinite(minPrice) && minPrice > 0
      ? minPrice
      : 0;
  const max =
    typeof maxPrice === "number" && Number.isFinite(maxPrice) && maxPrice > 0
      ? maxPrice
      : null;

  if (!max) {
    return [];
  }

  const values = new Set<number>();

  if (listingType === "sale") {
    const step1 = 500000; // 5L
    const step2 = 1000000; // 10L
    const step3 = 100000000; // 10Cr

    const start1 = Math.max(step1, roundToStepUp(min, step1));
    const limit1 = Math.min(max, 20000000); // up to 2 Cr in 5L steps
    for (let v = start1; v <= limit1; v += step1) {
      values.add(v);
    }

    if (max > 20000000) {
      const start2 = Math.max(21000000, roundToStepUp(min, step2));
      const limit2 = Math.min(max, 100000000); // 10 Cr in 10L steps
      for (let v = start2; v <= limit2; v += step2) {
        values.add(v);
      }
    }

    if (max > 100000000) {
      const start3 = Math.max(200000000, roundToStepUp(min, step3));
      const limit3 = Math.min(max, 1000000000); // 100 Cr in 10Cr steps
      for (let v = start3; v <= limit3; v += step3) {
        values.add(v);
      }
    }
  } else {
    const step1 = 5000;
    const step2 = 10000;
    const cappedMax = Math.min(max, 500000); // cap at 5L

    const start1 = Math.max(step1, roundToStepUp(min, step1));
    for (let v = start1; v <= Math.min(cappedMax, 100000); v += step1) {
      values.add(v);
    }

    const start2 = Math.max(110000, roundToStepUp(min, step2));
    for (let v = start2; v <= cappedMax; v += step2) {
      values.add(v);
    }
  }

  return Array.from(values).sort((a, b) => a - b);
}

function roundDownToStep(value: number, step: number) {
  return Math.floor(value / step) * step;
}

function roundUpToStep(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

function buildAreaOptions(minArea: number, maxArea: number, step: number) {
  const resolvedMin = Number.isFinite(minArea) ? minArea : 0;
  const resolvedMax = Number.isFinite(maxArea) ? maxArea : 0;
  if (resolvedMax <= 0 || resolvedMax < resolvedMin) {
    return [];
  }

  const maxOptions = 120;
  const values: number[] = [];
  for (let value = resolvedMin; value <= resolvedMax; value += step) {
    values.push(value);
    if (values.length >= maxOptions) {
      break;
    }
  }

  if (values.length && values[values.length - 1] !== resolvedMax) {
    values.push(resolvedMax);
  }

  return values;
}

function ResultCard({ property }: { property: HomepageProperty }) {
  const coverImage = property.coverImage ?? "/assets/img/home/home-03.jpg";
  const detailHref =
    property.listingType === "rent"
      ? `/rent-details/${property.slug}`
      : `/buy-details/${property.slug}`;

  return (
    <div className="col-xl-6 col-md-6 d-flex">
      <div className="property-card flex-fill live-property-card">
        <Link href={detailHref} className="property-listing-item p-0 mb-0 shadow-none h-100 d-block text-reset">
          <div className="buy-grid-img mb-0 rounded-0 live-property-media">
            <img className="img-fluid live-property-image" src={coverImage} alt={property.title} />
            <div className="d-flex align-items-center justify-content-between position-absolute top-0 start-0 end-0 p-3 z-1">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="badge badge-sm bg-secondary text-uppercase">{property.listingType}</span>
                {property.isFeatured ? (
                  <span className="badge badge-sm bg-orange d-flex align-items-center gap-1">
                    <i className="material-icons-outlined">loyalty</i>
                    Featured
                  </span>
                ) : null}
                {property.isVerified ? (
                  <span className="badge badge-sm bg-success d-flex align-items-center gap-1">
                    <i className="material-icons-outlined">verified</i>
                    Verified
                  </span>
                ) : null}
              </div>
              <span className="badge badge-sm bg-dark">{property.propertyType}</span>
            </div>
            <div className="d-flex align-items-center justify-content-between position-absolute bottom-0 start-0 end-0 p-3 z-1">
              <h6 className="text-white mb-0">{formatPropertyPrice(property)}</h6>
            </div>
          </div>
          <div className="buy-grid-content">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h6 className="title mb-1">{property.title}</h6>
                <p className="d-flex align-items-center fs-14 mb-0">
                  <i className="material-icons-outlined me-1 ms-0">location_on</i>
                  {formatPropertyAddress(property) || "Bareilly"}
                </p>
              </div>
            </div>
            <ul className="d-flex buy-grid-details mb-3 bg-light rounded p-3 justify-content-between align-items-center flex-wrap gap-2">
              <li className="d-flex align-items-center gap-1">
                <i className="material-icons-outlined bg-white text-secondary">bed</i>
                {property.bedrooms ?? "-"} Bed
              </li>
              <li className="d-flex align-items-center gap-1">
                <i className="material-icons-outlined bg-white text-secondary">bathtub</i>
                {property.bathrooms ?? "-"} Bath
              </li>
              <li className="d-flex align-items-center gap-1">
                <i className="material-icons-outlined bg-white text-secondary">straighten</i>
                {formatPropertyArea(property)}
              </li>
            </ul>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-1">
              <p className="fs-14 fw-medium text-dark mb-0">
                Listed on : <span className="fw-medium text-body">{formatPublishedDate(property.publishedAt)}</span>
              </p>
              <p className="fs-14 fw-medium text-dark mb-0">
                Category : <span className="fw-medium text-body">{property.propertyType}</span>
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

export function PropertySearchResultsPage({
  listingType,
  properties,
  suggestedProperties = [],
  propertyTypeOptions,
  locationLocalityOptions = [],
  bedBathOptions = { bedrooms: [], bathrooms: [] },
  priceRange = { minPrice: null, maxPrice: null },
  areaRange = { minArea: null, maxArea: null },
  filterNotices,
  filters,
  pagination
}: PropertySearchResultsPageProps) {
  const pageTitle = listingType === "rent" ? "Rent Search Results" : "Buy Search Results";
  const emptyTitle = listingType === "rent" ? "No rental properties matched your search." : "No sale properties matched your search.";
  const gridHref = listingType === "rent" ? "/rent-property-grid-sidebar" : "/buy-property-grid-sidebar";
  const propertyTypesFromApi = propertyTypeOptions
    .map((option) => option.name?.trim())
    .filter((value): value is string => Boolean(value));
  const propertyTypesFromListings = properties
    .map((property) => property.propertyType?.trim())
    .filter((value): value is string => Boolean(value));
  const resolvedPropertyTypeOptions = Array.from(new Set([...propertyTypesFromApi, ...propertyTypesFromListings]))
    .sort((a, b) => a.localeCompare(b))
    .map((name, index) => ({
      id: index + 1,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    }));

  if (
    filters.propertyType &&
    !resolvedPropertyTypeOptions.some((option) => option.name === filters.propertyType)
  ) {
    resolvedPropertyTypeOptions.unshift({
      id: 0,
      name: filters.propertyType,
      slug: filters.propertyType
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    });
  }

  const locationOptionsFromApi = locationLocalityOptions
    .map((option) => option.location?.trim())
    .filter((value): value is string => Boolean(value));
  const locationOptionsFromListings = properties
    .map((property) => property.city?.trim() || "")
    .filter(Boolean);
  const locationOptions = Array.from(new Set([...locationOptionsFromApi, ...locationOptionsFromListings]))
    .sort((a, b) => a.localeCompare(b));

  if (filters.location && !locationOptions.some((option) => option === filters.location)) {
    locationOptions.unshift(filters.location);
  }

  const selectedLocalities = Array.isArray(filters.localities) ? filters.localities : [];
  const localitiesForSelectedLocation = filters.location
    ? locationLocalityOptions.find((option) => option.location === filters.location)?.localities ?? []
    : [];
  const localityOptionsFromApi = (filters.location ? localitiesForSelectedLocation : locationLocalityOptions.flatMap((option) => option.localities))
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  const localityOptionsFromListings = properties
    .map((property) => property.locality?.trim() || "")
    .filter(Boolean);
  const localityCollator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
  const isNumericLocality = (value: string) => /^\s*\d/.test(value);
  const localityOptionsOrdered = Array.from(
    new Set([...selectedLocalities, ...localityOptionsFromApi, ...localityOptionsFromListings])
  )
    .filter(Boolean)
    .sort((a, b) => {
      const aNumeric = isNumericLocality(a);
      const bNumeric = isNumericLocality(b);

      if (aNumeric !== bNumeric) {
        return aNumeric ? 1 : -1;
      }

      return localityCollator.compare(a, b);
    });
  const selectedLocalitiesSet = new Set(selectedLocalities);
  const mainLocalities = [
    ...selectedLocalities,
    ...localityOptionsOrdered.filter((locality) => !selectedLocalitiesSet.has(locality))
  ].slice(0, 4);
  const modalLocalities = localityOptionsOrdered.filter((locality) => !mainLocalities.includes(locality));
  const localitiesModalId = `${listingType}-localities-modal`;

  const bedroomsOptions = Array.from(new Set(bedBathOptions.bedrooms))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  const bathroomsOptions = Array.from(new Set(bedBathOptions.bathrooms))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  if (typeof filters.bedrooms === "number" && !bedroomsOptions.includes(filters.bedrooms)) {
    bedroomsOptions.push(filters.bedrooms);
    bedroomsOptions.sort((a, b) => a - b);
  }

  if (typeof filters.bathrooms === "number" && !bathroomsOptions.includes(filters.bathrooms)) {
    bathroomsOptions.push(filters.bathrooms);
    bathroomsOptions.sort((a, b) => a - b);
  }

  const maxPillsVisible = 5;
  const visibleBedrooms = bedroomsOptions.slice(0, maxPillsVisible);
  const extraBedrooms = bedroomsOptions.slice(maxPillsVisible);
  const visibleBathrooms = bathroomsOptions.slice(0, maxPillsVisible);
  const extraBathrooms = bathroomsOptions.slice(maxPillsVisible);
  const chips = [
    filters.propertyType ? `Type: ${filters.propertyType}` : null,
    filters.location ? `Location: ${filters.location}` : null,
    selectedLocalities.length ? `Localities: ${selectedLocalities.join(", ")}` : null,
    filters.minPrice ? `Min: ${formatMoney(filters.minPrice)}` : null,
    filters.maxPrice ? `Max: ${formatMoney(filters.maxPrice)}` : null,
    filters.bedrooms ? `Beds: ${filters.bedrooms}+` : null,
    filters.bathrooms ? `Baths: ${filters.bathrooms}+` : null,
    filters.minArea ? `Min Area: ${filters.minArea} sqft` : null,
    filters.maxArea ? `Max Area: ${filters.maxArea} sqft` : null
  ].filter(Boolean) as string[];
  const startItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = pagination.total === 0 ? 0 : Math.min(pagination.page * pagination.pageSize, pagination.total);

  const areaStep = 100;
  const hasAreaRange =
    typeof areaRange.minArea === "number" &&
    Number.isFinite(areaRange.minArea) &&
    typeof areaRange.maxArea === "number" &&
    Number.isFinite(areaRange.maxArea) &&
    areaRange.maxArea > 0;
  const areaMin = hasAreaRange ? roundDownToStep(Math.max(areaRange.minArea ?? 0, 0), areaStep) : 0;
  const areaMax = hasAreaRange
    ? roundUpToStep(Math.max(areaRange.maxArea ?? 0, areaMin + areaStep), areaStep)
    : 0;
  const areaFrom = hasAreaRange
    ? roundDownToStep(Math.min(Math.max(filters.minArea ?? areaMin, areaMin), areaMax), areaStep)
    : 0;
  const areaTo = hasAreaRange
    ? roundUpToStep(Math.min(Math.max(filters.maxArea ?? areaMax, areaMin), areaMax), areaStep)
    : 0;
  const areaOptions = hasAreaRange ? buildAreaOptions(areaMin, areaMax, areaStep) : [];

  const budgetOptions = buildBudgetOptions(listingType, priceRange.minPrice, priceRange.maxPrice);

  const minAreaOptions = (typeof filters.maxArea === "number" && Number.isFinite(filters.maxArea))
    ? areaOptions.filter((value) => value <= filters.maxArea!)
    : areaOptions;
  const maxAreaOptions = (typeof filters.minArea === "number" && Number.isFinite(filters.minArea))
    ? areaOptions.filter((value) => value >= filters.minArea!)
    : areaOptions;

  const minBudgetOptions = (typeof filters.maxPrice === "number" && Number.isFinite(filters.maxPrice))
    ? budgetOptions.filter((value) => value <= filters.maxPrice!)
    : budgetOptions;
  const maxBudgetOptions = (typeof filters.minPrice === "number" && Number.isFinite(filters.minPrice))
    ? budgetOptions.filter((value) => value >= filters.minPrice!)
    : budgetOptions;

  const buildPageHref = (pageNumber: number) => {
    const params = new URLSearchParams();

    if (filters.propertyType) {
      params.set("propertyType", filters.propertyType);
    }
    if (filters.location) {
      params.set("location", filters.location);
    }
    if (selectedLocalities.length) {
      selectedLocalities.forEach((locality) => params.append("locality", locality));
    }
    if (typeof filters.minPrice === "number") {
      params.set("minPrice", String(filters.minPrice));
    }
    if (typeof filters.maxPrice === "number") {
      params.set("maxPrice", String(filters.maxPrice));
    }
    if (typeof filters.bedrooms === "number") {
      params.set("bedrooms", String(filters.bedrooms));
    }
    if (typeof filters.bathrooms === "number") {
      params.set("bathrooms", String(filters.bathrooms));
    }
    if (typeof filters.minArea === "number") {
      params.set("minArea", String(filters.minArea));
    }
    if (typeof filters.maxArea === "number") {
      params.set("maxArea", String(filters.maxArea));
    }

    params.set("page", String(pageNumber));
    return `${gridHref}?${params.toString()}`;
  };

  const pageWindow = 2;
  const startPage = Math.max(1, pagination.page - pageWindow);
  const endPage = Math.min(pagination.totalPages, pagination.page + pageWindow);
  const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);

  return (
    <main className="section-padding bg-light min-vh-100">
      <div className="container">
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="mb-2">{pageTitle}</h1>
            <p className="mb-0 text-body">Showing live {listingType} listings from the property database.</p>
          </div>
          <Link href={gridHref} className="btn btn-outline-dark">
            Clear Filters
          </Link>
        </div>

        <div className="row g-4">
          <div className="col-lg-4">
            <aside className="filter-sidebar buy-grid-sidebar-item-02 mb-lg-0">
              <form action={gridHref} method="get">
                <div className="filter-head d-flex align-items-center justify-content-between">
                  <h5 className="mb-0">Filter</h5>
                  <Link href={gridHref} className="text-danger">
                    Reset
                  </Link>
                </div>
                <div className="filter-body">
                  {filterNotices?.priceWasSwapped || filterNotices?.areaWasSwapped ? (
                    <div className="alert alert-warning py-2 px-3 mb-3">
                      We adjusted your{" "}
                      {filterNotices?.priceWasSwapped && filterNotices?.areaWasSwapped
                        ? "budget and area"
                        : filterNotices?.priceWasSwapped
                          ? "budget"
                          : "area"}{" "}
                      range to keep Min ≤ Max.
                    </div>
                  ) : null}
                  <div className="filter-set">
                    <div className="d-flex align-items-center">
                      <div
                        className="d-flex justify-content-between w-100 filter-search-head"
                        role="button"
                        aria-expanded="true"
                      >
                        <h6 className="d-inline-flex align-items-center mb-0">
                          <i className="material-icons-outlined me-2 text-secondary">search</i>
                          Search
                        </h6>
                        <i className="material-icons-outlined expand-arrow">expand_less</i>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-2">
                        <label className="form-label mb-1">Property Type</label>
                        <select name="propertyType" className="form-select" defaultValue={filters.propertyType ?? ""}>
                          <option value="">All Types</option>
                          {resolvedPropertyTypeOptions.map((option) => (
                            <option key={option.slug} value={option.name}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-2">
                        <label className="form-label mb-1">Location</label>
                        <select name="location" className="form-select" defaultValue={filters.location ?? ""}>
                          <option value="">All Locations</option>
                          {locationOptions.map((location) => (
                            <option key={location} value={location}>
                              {location}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-2">
                        <label className="form-label mb-1">Locality</label>
                        <div className="d-flex flex-column gap-2">
                          {mainLocalities.map((locality) => {
                            const id = `locality-${locality.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                            return (
                              <div key={locality} className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  name="locality"
                                  id={id}
                                  value={locality}
                                  defaultChecked={selectedLocalities.includes(locality)}
                                />
                                <label className="form-check-label" htmlFor={id}>
                                  {locality}
                                </label>
                              </div>
                            );
                          })}

                          {modalLocalities.length ? (
                            <button
                              type="button"
                              className="btn btn-link p-0 text-primary small d-inline-flex align-items-center gap-1 text-start"
                              data-bs-toggle="modal"
                              data-bs-target={`#${localitiesModalId}`}
                            >
                              <i className="material-icons-outlined" aria-hidden="true">search</i>
                              <span>More Localities</span>
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {modalLocalities.length ? (
                        <div
                          className="modal fade"
                          id={localitiesModalId}
                          tabIndex={-1}
                          aria-hidden="true"
                          aria-labelledby={`${localitiesModalId}-title`}
                        >
                          <div className="modal-dialog modal-lg modal-dialog-scrollable">
                            <div className="modal-content">
                              <div className="modal-header">
                                <h5 className="modal-title" id={`${localitiesModalId}-title`}>
                                  Select Localities
                                </h5>
                                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                              </div>
                              <div className="modal-body">
                                <div className="row g-2">
                                  {modalLocalities.map((locality) => {
                                    const id = `locality-modal-${locality.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                                    return (
                                      <div key={locality} className="col-6 col-md-3">
                                        <div className="form-check">
                                          <input
                                            className="form-check-input"
                                            type="checkbox"
                                            name="locality"
                                            id={id}
                                            value={locality}
                                            defaultChecked={selectedLocalities.includes(locality)}
                                          />
                                          <label className="form-check-label" htmlFor={id}>
                                            {locality}
                                          </label>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="modal-footer">
                                <button type="button" className="btn btn-dark" data-bs-dismiss="modal">
                                  Done
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      <div className="mb-2">
                        <label className="form-label mb-1">No of Bedrooms</label>
                        <div className="d-flex flex-wrap gap-2">
                          <input
                            type="radio"
                            className="btn-check"
                            name="bedrooms"
                            id={`bedrooms-any-${listingType}`}
                            value=""
                            defaultChecked={!filters.bedrooms}
                          />
                          <label className="btn btn-sm btn-outline-dark rounded-pill" htmlFor={`bedrooms-any-${listingType}`}>
                            Any
                          </label>
                          {visibleBedrooms.map((value) => {
                            const id = `bedrooms-${listingType}-${value}`;
                            return (
                              <span key={value}>
                                <input
                                  type="radio"
                                  className="btn-check"
                                  name="bedrooms"
                                  id={id}
                                  value={String(value)}
                                  defaultChecked={filters.bedrooms === value}
                                />
                                <label className="btn btn-sm btn-outline-dark rounded-pill" htmlFor={id}>
                                  {value}+
                                </label>
                              </span>
                            );
                          })}
                        </div>
                        {extraBedrooms.length ? (
                          <details className="mt-2">
                            <summary className="text-primary small" style={{ cursor: "pointer" }}>
                              More
                            </summary>
                            <div className="d-flex flex-wrap gap-2 mt-2">
                              {extraBedrooms.map((value) => {
                                const id = `bedrooms-${listingType}-${value}`;
                                return (
                                  <span key={value}>
                                    <input
                                      type="radio"
                                      className="btn-check"
                                      name="bedrooms"
                                      id={id}
                                      value={String(value)}
                                      defaultChecked={filters.bedrooms === value}
                                    />
                                    <label className="btn btn-sm btn-outline-dark rounded-pill" htmlFor={id}>
                                      {value}+
                                    </label>
                                  </span>
                                );
                              })}
                            </div>
                          </details>
                        ) : null}
                      </div>
                      <div>
                        <label className="form-label mb-1">No of Bathrooms</label>
                        <div className="d-flex flex-wrap gap-2">
                          <input
                            type="radio"
                            className="btn-check"
                            name="bathrooms"
                            id={`bathrooms-any-${listingType}`}
                            value=""
                            defaultChecked={!filters.bathrooms}
                          />
                          <label className="btn btn-sm btn-outline-dark rounded-pill" htmlFor={`bathrooms-any-${listingType}`}>
                            Any
                          </label>
                          {visibleBathrooms.map((value) => {
                            const id = `bathrooms-${listingType}-${value}`;
                            return (
                              <span key={value}>
                                <input
                                  type="radio"
                                  className="btn-check"
                                  name="bathrooms"
                                  id={id}
                                  value={String(value)}
                                  defaultChecked={filters.bathrooms === value}
                                />
                                <label className="btn btn-sm btn-outline-dark rounded-pill" htmlFor={id}>
                                  {value}+
                                </label>
                              </span>
                            );
                          })}
                        </div>
                        {extraBathrooms.length ? (
                          <details className="mt-2">
                            <summary className="text-primary small" style={{ cursor: "pointer" }}>
                              More
                            </summary>
                            <div className="d-flex flex-wrap gap-2 mt-2">
                              {extraBathrooms.map((value) => {
                                const id = `bathrooms-${listingType}-${value}`;
                                return (
                                  <span key={value}>
                                    <input
                                      type="radio"
                                      className="btn-check"
                                      name="bathrooms"
                                      id={id}
                                      value={String(value)}
                                      defaultChecked={filters.bathrooms === value}
                                    />
                                    <label className="btn btn-sm btn-outline-dark rounded-pill" htmlFor={id}>
                                      {value}+
                                    </label>
                                  </span>
                                );
                              })}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="filter-set">
                    <div className="d-flex align-items-center">
                      <div
                        className="d-flex justify-content-between w-100 filter-search-head"
                        role="button"
                        aria-expanded="true"
                      >
                        <h6 className="mb-0 d-flex align-items-center">
                          <i className="material-icons-outlined me-2 text-secondary">straighten</i>
                          Area
                        </h6>
                        <i className="material-icons-outlined expand-arrow">expand_less</i>
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="form-label mb-2">Built-up Area (sqft)</label>
                      {hasAreaRange ? (
                        <div className="row g-2">
                          <div className="col-6">
                            <select name="minArea" className="form-select" defaultValue={filters.minArea ? String(filters.minArea) : ""}>
                              <option value="">No min</option>
                              {minAreaOptions.map((value) => (
                                <option key={`min-area-${value}`} value={String(value)}>
                                  {value} sqft
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-6">
                            <select name="maxArea" className="form-select" defaultValue={filters.maxArea ? String(filters.maxArea) : ""}>
                              <option value="">No max</option>
                              {maxAreaOptions.map((value) => (
                                <option key={`max-area-${value}`} value={String(value)}>
                                  {value} sqft
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="text-muted small">Area range is not available for these listings.</div>
                      )}
                    </div>
                  </div>

                  <div className="filter-set">
                    <div className="d-flex align-items-center">
                      <div
                        className="d-flex justify-content-between w-100 filter-search-head"
                        role="button"
                        aria-expanded="true"
                      >
                        <h6 className="mb-0 d-flex align-items-center">
                          <i className="material-icons-outlined me-2 text-secondary">monetization_on</i>
                          Price
                        </h6>
                        <i className="material-icons-outlined expand-arrow">expand_less</i>
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="form-label mb-2">{listingType === "rent" ? "Rent" : "Budget"}</label>
                      <div className="row g-2">
                        <div className="col-6">
                          <select name="minPrice" className="form-select" defaultValue={filters.minPrice ? String(filters.minPrice) : ""}>
                            <option value="">{listingType === "rent" ? "No min" : "No min"}</option>
                            {minBudgetOptions.map((value) => (
                              <option key={`min-${value}`} value={String(value)}>
                                {formatBudgetLabel(listingType, value)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-6">
                          <select name="maxPrice" className="form-select" defaultValue={filters.maxPrice ? String(filters.maxPrice) : ""}>
                            <option value="">{listingType === "rent" ? "No max" : "No max"}</option>
                            {maxBudgetOptions.map((value) => (
                              <option key={`max-${value}`} value={String(value)}>
                                {formatBudgetLabel(listingType, value)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="filter-footer">
                  <button type="submit" className="btn btn-dark w-100">
                    Apply Filter
                  </button>
                </div>
              </form>
            </aside>
          </div>

          <div className="col-lg-8">
            {chips.length ? (
              <div className="d-flex flex-wrap gap-2 mb-4">
                {chips.map((chip) => (
                  <span key={chip} className="badge bg-white text-dark border px-3 py-2">
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="row g-4">
              {properties.length ? (
                properties.map((property) => <ResultCard key={property.id} property={property} />)
              ) : (
                <>
                  <div className="col-12">
                    <div className="alert alert-light border rounded-0 mb-0">
                      <h5 className="mb-2">{emptyTitle}</h5>
                      <p className="mb-1">Could not find this property, but check our other properties.</p>
                      <p className="mb-0">Try a different location, property type, or budget range.</p>
                    </div>
                  </div>
                  {suggestedProperties.length ? (
                    <>
                      <div className="col-12 pt-2">
                        <h5 className="mb-0">Other Properties You Can Explore</h5>
                      </div>
                      {suggestedProperties.map((property) => (
                        <ResultCard key={`suggested-${property.id}`} property={property} />
                      ))}
                    </>
                  ) : null}
                </>
              )}
            </div>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-4">
              <p className="mb-0 text-body fs-14">
                Showing {startItem}-{endItem} of {pagination.total} listings
              </p>
              <nav aria-label="Property results pages">
                <ul className="pagination mb-0">
                  <li className={`page-item ${pagination.page <= 1 ? "disabled" : ""}`}>
                    <Link
                      className="page-link"
                      href={buildPageHref(Math.max(1, pagination.page - 1))}
                      aria-disabled={pagination.page <= 1}
                      tabIndex={pagination.page <= 1 ? -1 : undefined}
                    >
                      Prev
                    </Link>
                  </li>
                  {(pageNumbers.length ? pageNumbers : [1]).map((pageNumber) => (
                    <li key={pageNumber} className={`page-item ${pageNumber === pagination.page ? "active" : ""}`}>
                      <Link className="page-link" href={buildPageHref(pageNumber)}>
                        {pageNumber}
                      </Link>
                    </li>
                  ))}
                  <li className={`page-item ${pagination.page >= pagination.totalPages ? "disabled" : ""}`}>
                    <Link
                      className="page-link"
                      href={buildPageHref(Math.min(pagination.totalPages, pagination.page + 1))}
                      aria-disabled={pagination.page >= pagination.totalPages}
                      tabIndex={pagination.page >= pagination.totalPages ? -1 : undefined}
                    >
                      Next
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
