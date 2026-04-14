import Link from "next/link";
import type { HomepageProperty, PropertyTypeOption } from "@/lib/properties";
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
  filters: {
    propertyType?: string | null;
    location?: string | null;
    locality?: string | null;
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
  filters,
  pagination
}: PropertySearchResultsPageProps) {
  const pageTitle = listingType === "rent" ? "Rent Search Results" : "Buy Search Results";
  const emptyTitle = listingType === "rent" ? "No rental properties matched your search." : "No sale properties matched your search.";
  const gridHref = listingType === "rent" ? "/rent-property-grid-sidebar" : "/buy-property-grid-sidebar";
  const propertyTypesFromListings = Array.from(
    new Set(
      properties
        .map((property) => property.propertyType?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b));

  const resolvedPropertyTypeOptions = (propertyTypesFromListings.length
    ? propertyTypesFromListings
    : propertyTypeOptions.map((option) => option.name)
  ).map((name, index) => ({
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

  const locationOptions = Array.from(
    new Set(
      properties
        .map((property) => property.city?.trim() || "")
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  if (filters.location && !locationOptions.some((option) => option === filters.location)) {
    locationOptions.unshift(filters.location);
  }

  const localityOptions = Array.from(
    new Set(
      properties
        .map((property) => property.locality?.trim() || "")
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  if (filters.locality && !localityOptions.some((option) => option === filters.locality)) {
    localityOptions.unshift(filters.locality);
  }

  const bedroomsOptions = Array.from(
    new Set(
      properties
        .map((property) => property.bedrooms)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0)
    )
  ).sort((a, b) => a - b);

  const bathroomsOptions = Array.from(
    new Set(
      properties
        .map((property) => property.bathrooms)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0)
    )
  ).sort((a, b) => a - b);

  if (typeof filters.bedrooms === "number" && !bedroomsOptions.includes(filters.bedrooms)) {
    bedroomsOptions.push(filters.bedrooms);
    bedroomsOptions.sort((a, b) => a - b);
  }

  if (typeof filters.bathrooms === "number" && !bathroomsOptions.includes(filters.bathrooms)) {
    bathroomsOptions.push(filters.bathrooms);
    bathroomsOptions.sort((a, b) => a - b);
  }
  const chips = [
    filters.propertyType ? `Type: ${filters.propertyType}` : null,
    filters.location ? `Location: ${filters.location}` : null,
    filters.locality ? `Locality: ${filters.locality}` : null,
    filters.minPrice ? `Min: ${formatMoney(filters.minPrice)}` : null,
    filters.maxPrice ? `Max: ${formatMoney(filters.maxPrice)}` : null,
    filters.bedrooms ? `Beds: ${filters.bedrooms}+` : null,
    filters.bathrooms ? `Baths: ${filters.bathrooms}+` : null,
    filters.minArea ? `Min Area: ${filters.minArea} sqft` : null,
    filters.maxArea ? `Max Area: ${filters.maxArea} sqft` : null
  ].filter(Boolean) as string[];
  const startItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = pagination.total === 0 ? 0 : Math.min(pagination.page * pagination.pageSize, pagination.total);

  const buildPageHref = (pageNumber: number) => {
    const params = new URLSearchParams();

    if (filters.propertyType) {
      params.set("propertyType", filters.propertyType);
    }
    if (filters.location) {
      params.set("location", filters.location);
    }
    if (filters.locality) {
      params.set("locality", filters.locality);
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
                        <select name="locality" className="form-select" defaultValue={filters.locality ?? ""}>
                          <option value="">All Localities</option>
                          {localityOptions.map((locality) => (
                            <option key={locality} value={locality}>
                              {locality}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-2">
                        <label className="form-label mb-1">No of Bedrooms</label>
                        <select name="bedrooms" className="form-select" defaultValue={String(filters.bedrooms ?? "")}>
                          <option value="">Any</option>
                          {(bedroomsOptions.length ? bedroomsOptions : [1, 2, 3, 4, 5]).map((value) => (
                            <option key={value} value={value}>
                              {value}+
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label mb-1">No of Bathrooms</label>
                        <select name="bathrooms" className="form-select" defaultValue={String(filters.bathrooms ?? "")}>
                          <option value="">Any</option>
                          {(bathroomsOptions.length ? bathroomsOptions : [1, 2, 3, 4]).map((value) => (
                            <option key={value} value={value}>
                              {value}+
                            </option>
                          ))}
                        </select>
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
                      <div className="mb-2">
                        <label className="form-label mb-1">Min Sqft</label>
                        <input
                          type="number"
                          name="minArea"
                          min="0"
                          className="form-control"
                          placeholder="e.g. 500"
                          defaultValue={filters.minArea ?? ""}
                        />
                      </div>
                      <div>
                        <label className="form-label mb-1">Max Sqft</label>
                        <input
                          type="number"
                          name="maxArea"
                          min="0"
                          className="form-control"
                          placeholder="e.g. 3000"
                          defaultValue={filters.maxArea ?? ""}
                        />
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
                          <i className="material-icons-outlined me-2 text-secondary">monetization_on</i>
                          Price
                        </h6>
                        <i className="material-icons-outlined expand-arrow">expand_less</i>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-2">
                        <label className="form-label mb-1">
                          {listingType === "rent" ? "Min Rent" : "Min Budget"}
                        </label>
                        <input
                          type="number"
                          name="minPrice"
                          min="0"
                          step={listingType === "rent" ? 1000 : 100000}
                          className="form-control"
                          defaultValue={filters.minPrice ?? ""}
                        />
                      </div>
                      <div>
                        <label className="form-label mb-1">
                          {listingType === "rent" ? "Max Rent" : "Max Budget"}
                        </label>
                        <input
                          type="number"
                          name="maxPrice"
                          min="0"
                          step={listingType === "rent" ? 1000 : 100000}
                          className="form-control"
                          defaultValue={filters.maxPrice ?? ""}
                        />
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
