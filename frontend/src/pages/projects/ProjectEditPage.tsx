import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { resolveApiAssetUrl } from "@/api/api";
import { deleteProject, getProjectById, type UpdateProjectPayload, updateProject } from "@/api/projects-service";
import { getCrmPropertyTypeItems } from "@/lib/property-types";

const PROPERTY_TYPES = getCrmPropertyTypeItems();

type FormState = {
  title: string;
  description: string;
  listingType: string;
  propertyType: string;
  status: string;
  country: string;
  state: string;
  city: string;
  locality: string;
  subLocality: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  pincode: string;
  possessionStatus: string;
  facing: string;
  latitude: string;
  longitude: string;
  priceAmount: string;
  rentAmount: string;
  securityDeposit: string;
  maintenanceAmount: string;
  priceLabel: string;
  bedrooms: string;
  bathrooms: string;
  balconies: string;
  floorNumber: string;
  floorsTotal: string;
  builtupArea: string;
  builtupAreaUnit: string;
  carpetArea: string;
  plotArea: string;
  parkingCount: string;
  furnishingStatus: string;
  ageOfProperty: string;
  coverImageUrl: string;
  imageUrls: string;
  features: string;
  isFeatured: boolean;
  isVerified: boolean;
};

const INITIAL_FORM: FormState = {
  title: "",
  description: "",
  listingType: "sale",
  propertyType: "",
  status: "active",
  country: "India",
  state: "Uttar Pradesh",
  city: "Bareilly",
  locality: "",
  subLocality: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  pincode: "",
  possessionStatus: "",
  facing: "",
  latitude: "",
  longitude: "",
  priceAmount: "",
  rentAmount: "",
  securityDeposit: "",
  maintenanceAmount: "",
  priceLabel: "",
  bedrooms: "",
  bathrooms: "",
  balconies: "",
  floorNumber: "",
  floorsTotal: "",
  builtupArea: "",
  builtupAreaUnit: "sqft",
  carpetArea: "",
  plotArea: "",
  parkingCount: "",
  furnishingStatus: "",
  ageOfProperty: "",
  coverImageUrl: "",
  imageUrls: "",
  features: "",
  isFeatured: false,
  isVerified: false
};

function toText(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseCsvList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ProjectEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [propertyCode, setPropertyCode] = useState("");
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [galleryImageFiles, setGalleryImageFiles] = useState<File[]>([]);
  const coverPreviewUrl = resolveApiAssetUrl(form.coverImageUrl);
  const galleryPreviewUrls = parseCsvList(form.imageUrls).map((url) => resolveApiAssetUrl(url)).filter(Boolean);
  const coverFilePreviewUrl = useMemo(() => (coverImageFile ? URL.createObjectURL(coverImageFile) : ""), [coverImageFile]);
  const galleryFilePreviewUrls = useMemo(
    () => galleryImageFiles.map((file) => URL.createObjectURL(file)),
    [galleryImageFiles]
  );

  useEffect(() => {
    return () => {
      if (coverFilePreviewUrl) {
        URL.revokeObjectURL(coverFilePreviewUrl);
      }
      galleryFilePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [coverFilePreviewUrl, galleryFilePreviewUrls]);

  const removeExistingGalleryUrl = (url: string) => {
    const existing = parseCsvList(form.imageUrls);
    const next = existing.filter((item) => item.trim() && item.trim() !== url);
    setForm((prev) => ({ ...prev, imageUrls: next.join(", ") }));
  };

  const removeGalleryFileAt = (index: number) => {
    setGalleryImageFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  useEffect(() => {
    if (!id) {
      setError("Invalid property id.");
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const property = await getProjectById(id);
        setPropertyCode(property.propertyCode);
        setCoverImageFile(null);
        setGalleryImageFiles([]);
        setForm({
          title: property.title || "",
          description: property.description || "",
          listingType: property.listingType || "sale",
          propertyType: property.propertyType || PROPERTY_TYPES[0]?.name || "",
          status: property.status || "active",
          country: property.country || "India",
          state: property.state || "Uttar Pradesh",
          city: property.city || "Bareilly",
          locality: property.locality || "",
          subLocality: property.subLocality || "",
          addressLine1: property.addressLine1 || "",
          addressLine2: property.addressLine2 || "",
          landmark: property.landmark || "",
          pincode: property.pincode || "",
          possessionStatus: property.possessionStatus || "",
          facing: property.facing || "",
          latitude: toText(property.latitude),
          longitude: toText(property.longitude),
          priceAmount: toText(property.priceAmount),
          rentAmount: toText(property.rentAmount),
          securityDeposit: toText(property.securityDeposit),
          maintenanceAmount: toText(property.maintenanceAmount),
          priceLabel: property.priceLabel || "",
          bedrooms: toText(property.bedrooms),
          bathrooms: toText(property.bathrooms),
          balconies: toText(property.balconies),
          floorNumber: toText(property.floorNumber),
          floorsTotal: toText(property.floorsTotal),
          builtupArea: toText(property.builtupArea),
          builtupAreaUnit: property.builtupAreaUnit || "sqft",
          carpetArea: toText(property.carpetArea),
          plotArea: toText(property.plotArea),
          parkingCount: toText(property.parkingCount),
          furnishingStatus: property.furnishingStatus || "",
          ageOfProperty: toText(property.ageOfProperty),
          coverImageUrl: property.coverImage || "",
          imageUrls: property.images.join(", "),
          features: property.features.join(", "),
          isFeatured: property.isFeatured,
          isVerified: property.isVerified
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load property details.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const setText = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value } as FormState));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const normalizedCoverUrl = form.coverImageUrl.trim();
    const existingImageUrls = parseCsvList(form.imageUrls);
    const preservedImageUrls = coverImageFile && normalizedCoverUrl
      ? existingImageUrls.filter((url) => url.trim() && url.trim() !== normalizedCoverUrl)
      : existingImageUrls;

    const payload: UpdateProjectPayload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      listingType: form.listingType,
      propertyType: form.propertyType,
      status: form.status,
      country: form.country.trim() || undefined,
      state: form.state.trim() || undefined,
      city: form.city.trim() || undefined,
      locality: form.locality.trim(),
      subLocality: form.subLocality.trim() || undefined,
      addressLine1: form.addressLine1.trim() || undefined,
      addressLine2: form.addressLine2.trim() || undefined,
      landmark: form.landmark.trim() || undefined,
      pincode: form.pincode.trim() || undefined,
      possessionStatus: form.possessionStatus.trim() || undefined,
      facing: form.facing.trim() || undefined,
      latitude: parseOptionalNumber(form.latitude),
      longitude: parseOptionalNumber(form.longitude),
      priceAmount: parseOptionalNumber(form.priceAmount),
      rentAmount: parseOptionalNumber(form.rentAmount),
      securityDeposit: parseOptionalNumber(form.securityDeposit),
      maintenanceAmount: parseOptionalNumber(form.maintenanceAmount),
      priceLabel: form.priceLabel.trim() || undefined,
      bedrooms: parseOptionalNumber(form.bedrooms),
      bathrooms: parseOptionalNumber(form.bathrooms),
      balconies: parseOptionalNumber(form.balconies),
      floorNumber: parseOptionalNumber(form.floorNumber),
      floorsTotal: parseOptionalNumber(form.floorsTotal),
      builtupArea: parseOptionalNumber(form.builtupArea),
      builtupAreaUnit: form.builtupAreaUnit,
      carpetArea: parseOptionalNumber(form.carpetArea),
      plotArea: parseOptionalNumber(form.plotArea),
      parkingCount: parseOptionalNumber(form.parkingCount),
      furnishingStatus: form.furnishingStatus.trim() || undefined,
      ageOfProperty: parseOptionalNumber(form.ageOfProperty),
      coverImageUrl: normalizedCoverUrl || undefined,
      imageUrls: preservedImageUrls,
      features: parseCsvList(form.features),
      isFeatured: form.isFeatured,
      isVerified: form.isVerified,
      coverImageFile: coverImageFile || undefined,
          galleryImageFiles: galleryImageFiles.length ? galleryImageFiles : undefined
        };

    try {
      const updated = await updateProject(id, payload);
      setPropertyCode(updated?.propertyCode || propertyCode);
      setSuccess("Property updated successfully.");
      setCoverImageFile(null);
      setGalleryImageFiles([]);
      const refreshed = await getProjectById(id);
      setForm((prev) => ({
        ...prev,
        coverImageUrl: refreshed.coverImage || "",
        imageUrls: refreshed.images.join(", ")
      }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update property.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!id || deleting) {
      return;
    }

    const confirmed = window.confirm(
      "This will permanently delete this property (hard delete). This cannot be undone. Continue?"
    );
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      await deleteProject(id);
      navigate("/properties");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete property.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-600">Loading property details...</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Edit Property</p>
          <p className="text-xs text-gray-500">{propertyCode || "Property"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
            type="button"
            onClick={onDelete}
            disabled={deleting || saving}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/properties")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <Button size="sm" onClick={() => navigate("/properties")}>
            Properties List
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Property Details</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <form className="grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
            <Field label="Title">
              <Input className="h-9 text-xs" value={form.title} onChange={(event) => setText("title", event.target.value)} required />
            </Field>
            <Field label="Listing Type">
              <Select className="h-9 text-xs" value={form.listingType} onChange={(event) => setText("listingType", event.target.value)}>
                <option value="sale">Sale</option>
                <option value="rent">Rent</option>
                <option value="lease">Lease</option>
              </Select>
            </Field>
            <Field label="Property Type">
              <Select className="h-9 text-xs" value={form.propertyType} onChange={(event) => setText("propertyType", event.target.value)} required>
                {PROPERTY_TYPES.map((type) => (
                  <option key={type.slug} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select className="h-9 text-xs" value={form.status} onChange={(event) => setText("status", event.target.value)}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="sold">Sold</option>
                <option value="rented">Rented</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            <Field label="Locality">
              <Input className="h-9 text-xs" value={form.locality} onChange={(event) => setText("locality", event.target.value)} required />
            </Field>
            <Field label="Sub Locality">
              <Input className="h-9 text-xs" value={form.subLocality} onChange={(event) => setText("subLocality", event.target.value)} />
            </Field>
            <Field label="City">
              <Input className="h-9 text-xs" value={form.city} onChange={(event) => setText("city", event.target.value)} />
            </Field>
            <Field label="State">
              <Input className="h-9 text-xs" value={form.state} onChange={(event) => setText("state", event.target.value)} />
            </Field>
            <Field label="Country">
              <Input className="h-9 text-xs" value={form.country} onChange={(event) => setText("country", event.target.value)} />
            </Field>
            <Field label="Pincode">
              <Input className="h-9 text-xs" value={form.pincode} onChange={(event) => setText("pincode", event.target.value)} />
            </Field>
            <Field label="Facing">
              <Input className="h-9 text-xs" value={form.facing} onChange={(event) => setText("facing", event.target.value)} />
            </Field>
            <Field label="Possession Status">
              <Input className="h-9 text-xs" value={form.possessionStatus} onChange={(event) => setText("possessionStatus", event.target.value)} />
            </Field>
            <Field label="Address Line 1" className="md:col-span-2">
              <Input className="h-9 text-xs" value={form.addressLine1} onChange={(event) => setText("addressLine1", event.target.value)} />
            </Field>
            <Field label="Address Line 2">
              <Input className="h-9 text-xs" value={form.addressLine2} onChange={(event) => setText("addressLine2", event.target.value)} />
            </Field>
            <Field label="Landmark">
              <Input className="h-9 text-xs" value={form.landmark} onChange={(event) => setText("landmark", event.target.value)} />
            </Field>
            <Field label="Latitude">
              <Input className="h-9 text-xs" value={form.latitude} onChange={(event) => setText("latitude", event.target.value)} />
            </Field>
            <Field label="Longitude">
              <Input className="h-9 text-xs" value={form.longitude} onChange={(event) => setText("longitude", event.target.value)} />
            </Field>
            <Field label="Sale Price">
              <Input className="h-9 text-xs" type="number" value={form.priceAmount} onChange={(event) => setText("priceAmount", event.target.value)} />
            </Field>
            <Field label="Monthly Rent">
              <Input className="h-9 text-xs" type="number" value={form.rentAmount} onChange={(event) => setText("rentAmount", event.target.value)} />
            </Field>
            <Field label="Security Deposit">
              <Input className="h-9 text-xs" type="number" value={form.securityDeposit} onChange={(event) => setText("securityDeposit", event.target.value)} />
            </Field>
            <Field label="Maintenance">
              <Input className="h-9 text-xs" type="number" value={form.maintenanceAmount} onChange={(event) => setText("maintenanceAmount", event.target.value)} />
            </Field>
            <Field label="Price Label">
              <Input className="h-9 text-xs" value={form.priceLabel} onChange={(event) => setText("priceLabel", event.target.value)} />
            </Field>
            <Field label="Bedrooms">
              <Input className="h-9 text-xs" type="number" value={form.bedrooms} onChange={(event) => setText("bedrooms", event.target.value)} />
            </Field>
            <Field label="Bathrooms">
              <Input className="h-9 text-xs" type="number" value={form.bathrooms} onChange={(event) => setText("bathrooms", event.target.value)} />
            </Field>
            <Field label="Balconies">
              <Input className="h-9 text-xs" type="number" value={form.balconies} onChange={(event) => setText("balconies", event.target.value)} />
            </Field>
            <Field label="Floor Number">
              <Input className="h-9 text-xs" type="number" value={form.floorNumber} onChange={(event) => setText("floorNumber", event.target.value)} />
            </Field>
            <Field label="Total Floors">
              <Input className="h-9 text-xs" type="number" value={form.floorsTotal} onChange={(event) => setText("floorsTotal", event.target.value)} />
            </Field>
            <Field label="Built-up Area">
              <Input className="h-9 text-xs" type="number" value={form.builtupArea} onChange={(event) => setText("builtupArea", event.target.value)} />
            </Field>
            <Field label="Area Unit">
              <Select className="h-9 text-xs" value={form.builtupAreaUnit} onChange={(event) => setText("builtupAreaUnit", event.target.value)}>
                <option value="sqft">sqft</option>
                <option value="sqyd">sqyd</option>
                <option value="sqm">sqm</option>
                <option value="acre">acre</option>
              </Select>
            </Field>
            <Field label="Carpet Area">
              <Input className="h-9 text-xs" type="number" value={form.carpetArea} onChange={(event) => setText("carpetArea", event.target.value)} />
            </Field>
            <Field label="Plot Area">
              <Input className="h-9 text-xs" type="number" value={form.plotArea} onChange={(event) => setText("plotArea", event.target.value)} />
            </Field>
            <Field label="Parking Count">
              <Input className="h-9 text-xs" type="number" value={form.parkingCount} onChange={(event) => setText("parkingCount", event.target.value)} />
            </Field>
            <Field label="Furnishing Status">
              <Input className="h-9 text-xs" value={form.furnishingStatus} onChange={(event) => setText("furnishingStatus", event.target.value)} />
            </Field>
            <Field label="Age of Property">
              <Input className="h-9 text-xs" type="number" value={form.ageOfProperty} onChange={(event) => setText("ageOfProperty", event.target.value)} />
            </Field>
            <div className="space-y-3 md:col-span-3">
              <p className="text-xs font-medium text-gray-700 dark:text-slate-200">Images</p>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-slate-200">Upload new cover image</label>
                  <Input
                    className="h-9 text-xs"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setCoverImageFile(event.target.files?.[0] || null)}
                  />
                  <p className="text-[11px] text-gray-500">Uploading a cover image keeps your current gallery.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-slate-200">Upload new gallery images</label>
                  <Input
                    className="h-9 text-xs"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => setGalleryImageFiles(Array.from(event.target.files || []))}
                  />
                  <p className="text-[11px] text-gray-500">Uploading gallery images replaces the existing gallery.</p>
                </div>
              </div>

              {(coverFilePreviewUrl || coverPreviewUrl) ? (
                <div className="overflow-hidden rounded border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  <img
                    src={coverFilePreviewUrl || coverPreviewUrl}
                    alt="Cover"
                    className="h-44 w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <p className="text-[11px] text-gray-500">No cover image set.</p>
              )}

              {(galleryFilePreviewUrls.length || galleryPreviewUrls.length) ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {(galleryFilePreviewUrls.length ? galleryFilePreviewUrls : galleryPreviewUrls).map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      className="relative overflow-hidden rounded border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                    >
                      <img src={url} alt={`Gallery ${index + 1}`} className="h-20 w-full object-cover" loading="lazy" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute right-1 top-1 h-7 px-2 text-[11px]"
                        onClick={() => {
                          if (galleryFilePreviewUrls.length) {
                            removeGalleryFileAt(index);
                          } else {
                            removeExistingGalleryUrl(url);
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-gray-500">No gallery images set.</p>
              )}
            </div>
            <Field label="Features (comma separated)" className="md:col-span-3">
              <textarea
                className="min-h-20 w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                value={form.features}
                onChange={(event) => setText("features", event.target.value)}
              />
            </Field>
            <Field label="Description" className="md:col-span-3">
              <textarea
                className="min-h-24 w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                value={form.description}
                onChange={(event) => setText("description", event.target.value)}
              />
            </Field>

            <div className="grid gap-2 md:col-span-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-slate-200">
                <input type="checkbox" checked={form.isFeatured} onChange={(event) => setText("isFeatured", event.target.checked)} />
                Featured on homepage
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-slate-200">
                <input type="checkbox" checked={form.isVerified} onChange={(event) => setText("isVerified", event.target.checked)} />
                Verified listing
              </label>
            </div>

            {error ? <p className="text-xs text-red-600 md:col-span-3">{error}</p> : null}
            {success ? <p className="text-xs text-green-600 md:col-span-3">{success}</p> : null}

            <div className="flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-slate-800 md:col-span-3">
              <Button type="button" variant="outline" size="sm" onClick={() => navigate("/properties")}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className ? `space-y-1 ${className}` : "space-y-1"}>
      <label className="text-xs font-medium text-gray-700 dark:text-slate-200">{label}</label>
      {children}
    </div>
  );
}
