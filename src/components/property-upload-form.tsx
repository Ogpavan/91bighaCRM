"use client";

import { useState } from "react";
import type { PropertyTypeOption } from "@/lib/properties";

type PropertyUploadFormProps = {
  propertyTypes: PropertyTypeOption[];
};

type SubmitState = {
  error: string | null;
  success: string | null;
  pending: boolean;
};

const initialState: SubmitState = {
  error: null,
  success: null,
  pending: false
};

export function PropertyUploadForm({ propertyTypes }: PropertyUploadFormProps) {
  const [submitState, setSubmitState] = useState<SubmitState>(initialState);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    setSubmitState({
      error: null,
      success: null,
      pending: true
    });

    try {
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as { ok: boolean; error?: string; property?: { propertyCode: string } };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Property upload failed.");
      }

      form.reset();
      setSubmitState({
        error: null,
        success: `Property saved successfully with code ${result.property?.propertyCode || ""}.`.trim(),
        pending: false
      });
    } catch (error) {
      setSubmitState({
        error: error instanceof Error ? error.message : "Property upload failed.",
        success: null,
        pending: false
      });
    }
  }

  return (
    <form className="property-upload-form" onSubmit={handleSubmit}>
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="property-upload-panel">
            <h4 className="mb-3">Property Details</h4>
            <div className="row g-3">
              <div className="col-md-8">
                <label className="form-label">Title</label>
                <input name="title" className="form-control" placeholder="3 BHK villa in Civil Lines" required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Listing Type</label>
                <select name="listingType" className="form-select" defaultValue="sale" required>
                  <option value="sale">Sale</option>
                  <option value="rent">Rent</option>
                  <option value="lease">Lease</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="form-control"
                  rows={5}
                  placeholder="Write a clear summary of the property, highlights, and nearby landmarks."
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Property Type</label>
                <select name="propertyType" className="form-select" required defaultValue="">
                  <option value="" disabled>
                    Select type
                  </option>
                  {propertyTypes.map((type) => (
                    <option key={type.slug} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Status</label>
                <select name="status" className="form-select" defaultValue="active">
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="sold">Sold</option>
                  <option value="rented">Rented</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Possession Status</label>
                <select name="possessionStatus" className="form-select" defaultValue="">
                  <option value="">Not set</option>
                  <option value="ready_to_move">Ready to move</option>
                  <option value="under_construction">Under construction</option>
                  <option value="resale">Resale</option>
                  <option value="new_launch">New launch</option>
                </select>
              </div>
            </div>
          </div>

          <div className="property-upload-panel mt-4">
            <h4 className="mb-3">Location</h4>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Locality</label>
                <input name="locality" className="form-control" placeholder="Civil Lines" required />
              </div>
              <div className="col-md-4">
                <label className="form-label">City</label>
                <input name="city" className="form-control" defaultValue="Bareilly" />
              </div>
              <div className="col-md-4">
                <label className="form-label">State</label>
                <input name="state" className="form-control" defaultValue="Uttar Pradesh" />
              </div>
              <div className="col-md-8">
                <label className="form-label">Address Line</label>
                <input name="addressLine1" className="form-control" placeholder="House no, street, landmark" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Pincode</label>
                <input name="pincode" className="form-control" placeholder="243001" />
              </div>
            </div>
          </div>

          <div className="property-upload-panel mt-4">
            <h4 className="mb-3">Pricing and Specs</h4>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Sale Price</label>
                <input name="priceAmount" type="number" min="0" step="0.01" className="form-control" placeholder="8500000" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Monthly Rent</label>
                <input name="rentAmount" type="number" min="0" step="0.01" className="form-control" placeholder="25000" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Price Label</label>
                <input name="priceLabel" className="form-control" placeholder="Price on request" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Security Deposit</label>
                <input name="securityDeposit" type="number" min="0" step="0.01" className="form-control" placeholder="50000" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Maintenance</label>
                <input name="maintenanceAmount" type="number" min="0" step="0.01" className="form-control" placeholder="3500" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Built-up Area Unit</label>
                <select name="builtupAreaUnit" className="form-select" defaultValue="sqft">
                  <option value="sqft">sqft</option>
                  <option value="sqyd">sqyd</option>
                  <option value="sqm">sqm</option>
                  <option value="acre">acre</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Bedrooms</label>
                <input name="bedrooms" type="number" min="0" className="form-control" placeholder="3" />
              </div>
              <div className="col-md-3">
                <label className="form-label">Bathrooms</label>
                <input name="bathrooms" type="number" min="0" className="form-control" placeholder="2" />
              </div>
              <div className="col-md-3">
                <label className="form-label">Balconies</label>
                <input name="balconies" type="number" min="0" className="form-control" placeholder="1" />
              </div>
              <div className="col-md-3">
                <label className="form-label">Parking</label>
                <input name="parkingCount" type="number" min="0" className="form-control" placeholder="1" />
              </div>
              <div className="col-md-6">
                <label className="form-label">Built-up Area</label>
                <input name="builtupArea" type="number" min="0" step="0.01" className="form-control" placeholder="1650" />
              </div>
              <div className="col-md-6">
                <label className="form-label">Furnishing Status</label>
                <select name="furnishingStatus" className="form-select" defaultValue="">
                  <option value="">Not set</option>
                  <option value="unfurnished">Unfurnished</option>
                  <option value="semi_furnished">Semi furnished</option>
                  <option value="fully_furnished">Fully furnished</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="property-upload-panel sticky-lg-top property-upload-sidebar">
            <h4 className="mb-3">Media and Publish</h4>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Cover Image URL</label>
                <input
                  name="coverImageUrl"
                  className="form-control"
                  placeholder="https://example.com/property-cover.jpg"
                />
              </div>
              <div className="col-12">
                <div className="form-check mb-2">
                  <input id="isFeatured" name="isFeatured" className="form-check-input" type="checkbox" value="true" />
                  <label htmlFor="isFeatured" className="form-check-label">
                    Mark as featured
                  </label>
                </div>
                <div className="form-check">
                  <input id="isVerified" name="isVerified" className="form-check-input" type="checkbox" value="true" />
                  <label htmlFor="isVerified" className="form-check-label">
                    Mark as verified
                  </label>
                </div>
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-dark rounded-0 w-100" disabled={submitState.pending}>
                  {submitState.pending ? "Saving..." : "Save Property"}
                </button>
              </div>
              <div className="col-12">
                <p className="small text-muted mb-0">
                  The form writes directly to the flattened `properties` table, including location, pricing, specs,
                  and media fields.
                </p>
              </div>
              {submitState.success ? (
                <div className="col-12">
                  <div className="alert alert-success rounded-0 mb-0">{submitState.success}</div>
                </div>
              ) : null}
              {submitState.error ? (
                <div className="col-12">
                  <div className="alert alert-danger rounded-0 mb-0">{submitState.error}</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
