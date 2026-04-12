import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactInquiryForm } from "@/components/contact-inquiry-form";
import { PropertyImageGallery } from "@/components/property-image-gallery";
import type { PropertyDetail } from "@/lib/properties";
import {
  formatPropertyAddress,
  formatPropertyArea,
  formatPropertyPrice,
  formatPublishedDate
} from "@/lib/home-property-formatters";

type PropertyDetailPageProps = {
  property: PropertyDetail | null;
  backHref: string;
  backLabel: string;
};

type DetailField = {
  label: string;
  value: string | number;
};
type TopFact = DetailField & {
  icon: string;
};

function asField(label: string, value: string | number | null | undefined): DetailField | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return { label, value };
}

function formatInr(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "On request";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function DetailGrid({ fields }: { fields: DetailField[] }) {
  if (!fields.length) {
    return null;
  }

  return (
    <div className="property-detail-grid">
      {fields.map((field) => (
        <div key={field.label} className="property-detail-row">
          <span className="property-detail-label">{field.label}</span>
          <strong className="property-detail-value">{field.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function PropertyDetailPage({ property, backHref, backLabel }: PropertyDetailPageProps) {
  if (!property) {
    notFound();
  }

  const images = property.images.length
    ? property.images
    : [property.coverImage || "/assets/img/home/home-03.jpg"];

  const address = formatPropertyAddress(property) || "Bareilly";
  const configurationFields = [
    asField("Bedrooms", property.bedrooms),
    asField("Bathrooms", property.bathrooms),
    asField("Balconies", property.balconies),
    asField("Built-up Area", property.builtupArea ? formatPropertyArea(property) : null),
    asField("Carpet Area", property.carpetArea ? `${property.carpetArea} sqft` : null),
    asField("Plot Area", property.plotArea ? `${property.plotArea} sqft` : null),
    asField("Floor", property.floorNumber),
    asField("Total Floors", property.floorsTotal),
    asField("Parking", property.parkingCount),
    asField("Furnishing", property.furnishingStatus),
    asField("Facing", property.facing),
    asField("Property Age", property.ageOfProperty ? `${property.ageOfProperty} years` : null)
  ].filter((value): value is DetailField => Boolean(value));

  const locationFields = [
    asField("Address Line 1", property.addressLine1),
    asField("Address Line 2", property.addressLine2),
    asField("Locality", property.locality),
    asField("Sub-locality", property.subLocality),
    asField("Landmark", property.landmark),
    asField("City", property.city),
    asField("State", property.state),
    asField("Pincode", property.pincode)
  ].filter((value): value is DetailField => Boolean(value));

  const listingFields = [
    asField("Property Code", property.propertyCode),
    asField("Property Type", property.propertyType),
    asField("Listing Type", property.listingType),
    asField("Status", property.status),
    asField("Possession", property.possessionStatus || "Ready to move"),
    asField("Published", formatPublishedDate(property.publishedAt))
  ].filter((value): value is DetailField => Boolean(value));

  const financialFields = [
    asField("Expected Price", property.listingType === "sale" ? formatPropertyPrice(property) : null),
    asField("Rent", property.listingType === "rent" ? formatPropertyPrice(property) : null),
    asField("Security Deposit", property.listingType === "rent" ? formatInr(property.securityDeposit) : null),
    asField("Maintenance", property.maintenanceAmount ? `${formatInr(property.maintenanceAmount)} / month` : null)
  ].filter((value): value is DetailField => Boolean(value));

  const topFacts = [
    property.bedrooms !== null && property.bedrooms !== undefined
      ? { label: "Beds", value: property.bedrooms, icon: "bed" }
      : null,
    property.bathrooms !== null && property.bathrooms !== undefined
      ? { label: "Baths", value: property.bathrooms, icon: "bathtub" }
      : null,
    property.builtupArea ? { label: "Area", value: formatPropertyArea(property), icon: "square_foot" } : null,
    property.parkingCount !== null && property.parkingCount !== undefined
      ? { label: "Parking", value: property.parkingCount, icon: "directions_car" }
      : null
  ].filter((value): value is TopFact => Boolean(value));

  return (
    <main className="section-padding bg-light property-detail-page">
      <div className="container">
        <div className="mb-3">
          <Link href={backHref} aria-label={backLabel} className="property-back-icon-btn">
            <span className="material-icons-outlined" aria-hidden="true">
              arrow_back
            </span>
          </Link>
        </div>

        <div className="row gx-4 gy-4 gy-lg-0 align-items-start align-items-lg-stretch">
          <div className="col-lg-8 order-2 order-lg-1">
            <article className="property-detail-shell">
              <PropertyImageGallery title={property.title} images={images} />

              <div className="property-summary-below-image mb-4">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <span className="badge bg-secondary text-uppercase">{property.listingType}</span>
                  <span className="badge bg-dark">{property.propertyType}</span>
                  {property.isFeatured ? <span className="badge bg-warning text-dark">Featured</span> : null}
                  {property.isVerified ? <span className="badge bg-success">Verified</span> : null}
                </div>
                <div className="property-title-price-row mb-2">
                  <h1 className="h3 mb-0 property-page-title">{property.title}</h1>
                  <h2 className="h4 text-primary mb-0 property-page-price">{formatPropertyPrice(property)}</h2>
                </div>
                <p className="text-muted mb-3">{address}</p>
                {topFacts.length ? (
                  <div className="property-top-facts-bar mt-2">
                    {topFacts.map((fact, index) => (
                      <div key={fact.label} className="property-top-fact-bar-item">
                        <span className="material-icons-outlined property-top-fact-icon">{fact.icon}</span>
                        <span className="property-top-fact-label">{fact.label}</span>
                        <strong className="property-top-fact-value">{fact.value}</strong>
                        {index < topFacts.length - 1 ? (
                          <span className="property-top-fact-pipe" aria-hidden="true">
                            |
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <section className="property-detail-section">
                <h3 className="h5 mb-2">About This Property</h3>
                <p className="mb-0">
                  {property.description?.trim() ||
                    "This property is available now. Contact the team for exact pricing, site visit, and booking support."}
                </p>
              </section>

              {configurationFields.length ? (
                <section className="property-detail-section">
                  <h3 className="h5 mb-3">Configuration</h3>
                  <DetailGrid fields={configurationFields} />
                </section>
              ) : null}

              {locationFields.length ? (
                <section className="property-detail-section">
                  <h3 className="h5 mb-3">Location Details</h3>
                  <DetailGrid fields={locationFields} />
                </section>
              ) : null}

              {listingFields.length ? (
                <section className="property-detail-section">
                  <h3 className="h5 mb-3">Listing Information</h3>
                  <DetailGrid fields={listingFields} />
                </section>
              ) : null}

              {financialFields.length ? (
                <section className="property-detail-section">
                  <h3 className="h5 mb-3">Financials</h3>
                  <DetailGrid fields={financialFields} />
                </section>
              ) : null}

              {property.features.length ? (
                <section className="property-detail-section">
                  <h3 className="h5 mb-3">Amenities</h3>
                  <div className="d-flex flex-wrap gap-2">
                    {property.features.map((feature) => (
                      <span key={feature} className="badge text-bg-light border px-3 py-2">
                        {feature}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}
            </article>
          </div>

          <div className="col-lg-4 property-contact-col order-1 order-lg-2">
            <aside className="card border-0 shadow-sm p-4 property-contact-card w-100">
              <h3 className="h5 mb-2">Contact For This Property</h3>
              <p className="text-muted fs-14 mb-3">
                Fill your details and connect instantly on WhatsApp for this listing.
              </p>
              <ContactInquiryForm
                propertyTitle={property.title}
                propertyCode={property.propertyCode}
                defaultRequirement={property.listingType === "rent" ? "Rent Property" : "Buy Property"}
                submitLabel="Send Enquiry"
                compact
              />
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
