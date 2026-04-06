import { HomepageProperty } from "@/lib/properties";
import {
  formatPropertyAddress,
  formatPropertyArea,
  formatPropertyPrice
} from "@/lib/home-property-formatters";

type HomeLivePropertiesSectionProps = {
  saleProperties: HomepageProperty[];
  rentProperties: HomepageProperty[];
};

function PropertyCard({ property }: { property: HomepageProperty }) {
  const image = property.coverImage || "/assets/img/home/home-03.jpg";

  return (
    <div className="col-lg-4 col-md-6 d-flex">
      <div className="property-card flex-fill live-property-card">
        <div className="property-listing-item p-0 mb-0 shadow-none h-100">
          <div className="buy-grid-img mb-0 rounded-0 live-property-media">
            <img className="img-fluid live-property-image" src={image} alt={property.title} />
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
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="col-12">
      <div className="alert alert-light border rounded-0 mb-0">
        No {label} properties have been uploaded yet. Use the upload page to add the first listing.
      </div>
    </div>
  );
}

export function HomeLivePropertiesSection({
  saleProperties,
  rentProperties
}: HomeLivePropertiesSectionProps) {
  return (
    <>
      <section className="features-section featured-sales-section section-padding bg-light position-relative">
        <div className="container">
          <div className="section-heading">
            <h2 className="mb-2 text-center">Featured Properties for Sales</h2>
            <div className="sec-line">
              <span className="sec-line1"></span>
              <span className="sec-line2"></span>
            </div>
          </div>
          <div className="row g-4">
            {saleProperties.length ? saleProperties.map((property) => <PropertyCard key={property.id} property={property} />) : <EmptyState label="sale" />}
          </div>
        </div>
      </section>

      <section className="features-section featured-rent-section section-padding bg-light position-relative">
        <div className="container">
          <div className="section-heading">
            <h2 className="mb-2 text-center">Featured Properties for Rent</h2>
            <div className="sec-line">
              <span className="sec-line1"></span>
              <span className="sec-line2"></span>
            </div>
          </div>
          <div className="row g-4">
            {rentProperties.length ? rentProperties.map((property) => <PropertyCard key={property.id} property={property} />) : <EmptyState label="rent" />}
          </div>
        </div>
      </section>
    </>
  );
}
