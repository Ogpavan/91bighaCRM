import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  createProject,
  getProjects,
  importProperties,
  type ImportPropertiesResponse,
  type ProjectListing,
  type ProjectPropertyType
} from "@/api/projects-service";

type FormState = {
  title: string;
  description: string;
  listingType: string;
  propertyTypeId: string;
  locality: string;
  city: string;
  state: string;
  addressLine1: string;
  pincode: string;
  status: string;
  possessionStatus: string;
  priceAmount: string;
  rentAmount: string;
  securityDeposit: string;
  maintenanceAmount: string;
  priceLabel: string;
  bedrooms: string;
  bathrooms: string;
  balconies: string;
  builtupArea: string;
  builtupAreaUnit: string;
  parkingCount: string;
  furnishingStatus: string;
  coverImageUrl: string;
  isFeatured: boolean;
  isVerified: boolean;
};

const INITIAL_FORM: FormState = {
  title: "",
  description: "",
  listingType: "sale",
  propertyTypeId: "",
  locality: "",
  city: "Bareilly",
  state: "Uttar Pradesh",
  addressLine1: "",
  pincode: "",
  status: "active",
  possessionStatus: "",
  priceAmount: "",
  rentAmount: "",
  securityDeposit: "",
  maintenanceAmount: "",
  priceLabel: "",
  bedrooms: "",
  bathrooms: "",
  balconies: "",
  builtupArea: "",
  builtupAreaUnit: "sqft",
  parkingCount: "",
  furnishingStatus: "",
  coverImageUrl: "",
  isFeatured: false,
  isVerified: false
};

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function parseOptionalNumber(value: string) {
  return value.trim() ? Number(value) : undefined;
}

function formatPrice(project: ProjectListing) {
  if (project.listingType === "rent" || project.listingType === "lease") {
    return project.rentAmount != null ? currency.format(project.rentAmount) : project.priceLabel || "-";
  }

  return project.priceAmount != null ? currency.format(project.priceAmount) : project.priceLabel || "-";
}

export default function ProjectsPage() {
  const [panelMode, setPanelMode] = useState<"create" | "import">("create");
  const [items, setItems] = useState<ProjectListing[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<ProjectPropertyType[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportPropertiesResponse | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProjects = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getProjects();
      setItems(response.items);
      setPropertyTypes(response.propertyTypes);
      setForm((prev) => ({
        ...prev,
        propertyTypeId: prev.propertyTypeId || String(response.propertyTypes[0]?.id || "")
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load properties.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const setText = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value } as FormState));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const created = await createProject({
        title: form.title,
        description: form.description || undefined,
        listingType: form.listingType,
        propertyTypeId: Number(form.propertyTypeId),
        locality: form.locality,
        city: form.city || undefined,
        state: form.state || undefined,
        addressLine1: form.addressLine1 || undefined,
        pincode: form.pincode || undefined,
        status: form.status,
        possessionStatus: form.possessionStatus || undefined,
        priceAmount: parseOptionalNumber(form.priceAmount),
        rentAmount: parseOptionalNumber(form.rentAmount),
        securityDeposit: parseOptionalNumber(form.securityDeposit),
        maintenanceAmount: parseOptionalNumber(form.maintenanceAmount),
        priceLabel: form.priceLabel || undefined,
        bedrooms: parseOptionalNumber(form.bedrooms),
        bathrooms: parseOptionalNumber(form.bathrooms),
        balconies: parseOptionalNumber(form.balconies),
        builtupArea: parseOptionalNumber(form.builtupArea),
        builtupAreaUnit: form.builtupAreaUnit,
        parkingCount: parseOptionalNumber(form.parkingCount),
        furnishingStatus: form.furnishingStatus || undefined,
        coverImageUrl: form.coverImageUrl || undefined,
        isFeatured: form.isFeatured,
        isVerified: form.isVerified
      });

      setSuccess(`Property saved as ${created?.propertyCode || "new listing"}. Active sale/rent listings appear on the homepage automatically.`);
      setForm((prev) => ({
        ...INITIAL_FORM,
        city: prev.city,
        state: prev.state,
        propertyTypeId: prev.propertyTypeId || String(propertyTypes[0]?.id || "")
      }));
      setPanelOpen(false);
      await loadProjects();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save property.");
    } finally {
      setSubmitting(false);
    }
  };

  const openCreatePanel = () => {
    setPanelMode("create");
    setError("");
    setPanelOpen(true);
  };

  const openImportPanel = () => {
    setPanelMode("import");
    setError("");
    setImportResult(null);
    setImportFile(null);
    setPanelOpen(true);
  };

  const onImportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!importFile) {
      setError("Choose a CSV, Excel, or JSON file to import.");
      return;
    }

    setImporting(true);
    setError("");
    setSuccess("");
    setImportResult(null);

    try {
      const result = await importProperties(importFile);
      setImportResult(result);
      setSuccess(`Imported ${result.importedCount} properties.${result.failedCount ? ` ${result.failedCount} rows failed.` : ""}`);
      await loadProjects();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Failed to import properties.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">Properties</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={openImportPanel}>
                Import Properties
              </Button>
              <Button size="sm" onClick={openCreatePanel}>
                Add Property
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {success ? <p className="mb-3 text-xs text-green-600">{success}</p> : null}
          {error && !panelOpen ? <p className="mb-3 text-xs text-red-600">{error}</p> : null}
          {loading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Listing</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={`property-skeleton-${index}`}>
                      <TableCell><div className="h-4 w-24 animate-pulse rounded bg-gray-200" /></TableCell>
                      <TableCell><div className="h-4 w-36 animate-pulse rounded bg-gray-200" /></TableCell>
                      <TableCell><div className="h-4 w-20 animate-pulse rounded bg-gray-200" /></TableCell>
                      <TableCell><div className="h-4 w-32 animate-pulse rounded bg-gray-200" /></TableCell>
                      <TableCell><div className="h-4 w-20 animate-pulse rounded bg-gray-200" /></TableCell>
                      <TableCell><div className="h-4 w-24 animate-pulse rounded bg-gray-200" /></TableCell>
                      <TableCell><div className="h-4 w-20 animate-pulse rounded bg-gray-200" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
          {!loading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Listing</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.propertyCode}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-[11px] text-gray-500">{item.propertyType}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{item.listingType}</TableCell>
                    <TableCell>{[item.locality, item.city].filter(Boolean).join(", ") || "-"}</TableCell>
                    <TableCell>{item.isFeatured ? "Featured" : "Standard"}</TableCell>
                    <TableCell>{formatPrice(item)}</TableCell>
                    <TableCell className="capitalize">{item.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      {panelOpen
        ? createPortal(
            <>
              <div className="fixed inset-0 z-40 bg-slate-950/30">
                <button aria-label="Close property popup overlay" className="h-full w-full" onClick={() => setPanelOpen(false)} />
              </div>

              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <Card className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{panelMode === "create" ? "Add Property" : "Import Properties"}</p>
                      <p className="text-[11px] text-gray-500">
                        {panelMode === "create"
                          ? "Create a listing that can also appear on the homepage."
                          : "Upload CSV, Excel, or 99acres JSON and import property data automatically."}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPanelOpen(false)} aria-label="Close popup">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="overflow-y-auto">
                {panelMode === "create" ? (
                <form className="space-y-3 p-4" onSubmit={onSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
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
              <Select className="h-9 text-xs" value={form.propertyTypeId} onChange={(event) => setText("propertyTypeId", event.target.value)} required>
                <option value="">Select type</option>
                {propertyTypes.map((type) => (
                  <option key={type.id} value={type.id}>
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
            <Field label="City">
              <Input className="h-9 text-xs" value={form.city} onChange={(event) => setText("city", event.target.value)} />
            </Field>
            <Field label="State">
              <Input className="h-9 text-xs" value={form.state} onChange={(event) => setText("state", event.target.value)} />
            </Field>
            <Field label="Pincode">
              <Input className="h-9 text-xs" value={form.pincode} onChange={(event) => setText("pincode", event.target.value)} />
            </Field>
            <Field label="Sale Price">
              <Input className="h-9 text-xs" type="number" value={form.priceAmount} onChange={(event) => setText("priceAmount", event.target.value)} />
            </Field>
            <Field label="Monthly Rent">
              <Input className="h-9 text-xs" type="number" value={form.rentAmount} onChange={(event) => setText("rentAmount", event.target.value)} />
            </Field>
            <Field label="Bedrooms">
              <Input className="h-9 text-xs" type="number" value={form.bedrooms} onChange={(event) => setText("bedrooms", event.target.value)} />
            </Field>
            <Field label="Bathrooms">
              <Input className="h-9 text-xs" type="number" value={form.bathrooms} onChange={(event) => setText("bathrooms", event.target.value)} />
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
          </div>

          <Field label="Address">
            <Input className="h-9 text-xs" value={form.addressLine1} onChange={(event) => setText("addressLine1", event.target.value)} />
          </Field>
          <Field label="Description">
            <textarea
              className="min-h-24 w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.description}
              onChange={(event) => setText("description", event.target.value)}
            />
          </Field>
          <Field label="Cover Image URL">
            <Input className="h-9 text-xs" value={form.coverImageUrl} onChange={(event) => setText("coverImageUrl", event.target.value)} />
          </Field>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-slate-200">
              <input type="checkbox" checked={form.isFeatured} onChange={(event) => setText("isFeatured", event.target.checked)} />
              Featured on homepage
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-slate-200">
              <input type="checkbox" checked={form.isVerified} onChange={(event) => setText("isVerified", event.target.checked)} />
              Verified listing
            </label>
          </div>

          <p className="text-[11px] text-gray-500">
            Active sale, rent, and lease listings are available to the homepage sections immediately after save.
          </p>

          {error ? <p className="text-xs text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setPanelOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting || loading}>
              {submitting ? "Saving..." : "Save Project"}
            </Button>
          </div>
                </form>
                ) : (
                <form className="space-y-4 p-4" onSubmit={onImportSubmit}>
          <div className="rounded-sm border border-dashed border-gray-300 bg-gray-50 p-4 text-xs text-gray-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
            <p className="font-medium text-gray-800 dark:text-slate-100">Supported files</p>
            <p className="mt-1">`.csv`, `.xlsx`, `.xls`, `.json`</p>
            <p className="mt-3 font-medium text-gray-800 dark:text-slate-100">Recognized column headers</p>
            <p className="mt-1">
              `title`, `listing type`, `property type`, `locality`, `city`, `state`, `address`, `sale price`, `rent`, `bedrooms`,
              `bathrooms`, `floor`, `total floors`, `builtup area`, `facing`, `age`, `latitude`, `longitude`, `featured`, `verified`
            </p>
            <p className="mt-3">Required spreadsheet columns: `title`, `listing type`, `property type`, `locality`. 99acres JSON payloads are auto-mapped from the `properties` array.</p>
          </div>

          <Field label="Import File">
            <Input
              className="h-10 text-xs"
              type="file"
              accept=".csv,.xlsx,.xls,.json,application/json"
              onChange={(event) => setImportFile(event.target.files?.[0] || null)}
            />
          </Field>

          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          {importResult ? (
            <div className="space-y-3 rounded-sm border border-gray-200 bg-gray-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/50">
              <p className="font-medium text-gray-800 dark:text-slate-100">
                Imported {importResult.importedCount} properties{importResult.failedCount ? `, ${importResult.failedCount} failed` : ""}.
              </p>
              <div>
                <p className="font-medium text-gray-700 dark:text-slate-200">Detected mappings</p>
                <div className="mt-2 grid gap-1 md:grid-cols-2">
                  {Object.entries(importResult.mapping).map(([key, value]) => (
                    <p key={key} className="text-[11px] text-gray-600 dark:text-slate-300">
                      <span className="font-medium">{key}</span>: {value || "not mapped"}
                    </p>
                  ))}
                </div>
              </div>
              {importResult.errors.length ? (
                <div>
                  <p className="font-medium text-red-600">Row Errors</p>
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {importResult.errors.map((entry) => (
                      <p key={`${entry.row}-${entry.error}`} className="text-[11px] text-red-600">
                        Row {entry.row}: {entry.error}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setPanelOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={importing || loading}>
              {importing ? "Importing..." : "Import File"}
            </Button>
          </div>
                </form>
                )}
                  </div>
                </Card>
              </div>
            </>,
            document.body
          )
        : null}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-700 dark:text-slate-200">{label}</label>
      {children}
    </div>
  );
}
