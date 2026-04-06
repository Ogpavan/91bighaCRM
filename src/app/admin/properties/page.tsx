import type { Metadata } from "next";
import Link from "next/link";
import { PropertyUploadForm } from "@/components/property-upload-form";
import { getPropertyTypeOptions } from "@/lib/properties";

export const metadata: Metadata = {
  title: "Upload Properties | 91bigha.com",
  description: "Add sale and rent listings directly into the PostgreSQL-backed property database."
};

export default async function AdminPropertiesPage() {
  const propertyTypes = await getPropertyTypeOptions();

  return (
    <main>
      <section className="section-padding property-upload-hero">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-lg-7">
              <span className="badge bg-dark rounded-0 mb-3">Admin Upload</span>
              <h1 className="mb-3">Upload property listings</h1>
              <p className="mb-0">
                Use this page to create records across the property, pricing, specs, location, and media tables.
                Newly added active listings appear in the homepage property sections.
              </p>
              <div className="mt-4 d-flex gap-3 flex-wrap">
                <Link href="/admin/users" className="btn btn-sm btn-outline-dark rounded-0">
                  Manage CRM users
                </Link>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="property-upload-note">
                <h5 className="mb-2">What gets stored</h5>
                <p className="mb-0">
                  Each submission inserts a location row, the property record, current pricing, specs, and an optional
                  cover image.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <PropertyUploadForm propertyTypes={propertyTypes} />
          </div>
        </div>
      </section>
    </main>
  );
}
