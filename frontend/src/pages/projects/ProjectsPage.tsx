import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Filter, X } from "lucide-react";
import {
  DataGrid,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarDensitySelector,
  GridToolbarExport,
  GridToolbarFilterButton,
  GridToolbarQuickFilter,
  type GridColDef
} from "@mui/x-data-grid";
import { Box, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import Pagination from "@/components/Pagination";
import {
  createProject,
  getProjects,
  importProperties,
  previewPropertiesImport,
  type ImportPropertiesPreview,
  type ImportPropertiesResponse,
  type ProjectFilterOptions,
  type ProjectListing,
  type ProjectPropertyType,
  type ProjectsFilters
} from "@/api/projects-service";

type FormState = {
  title: string;
  description: string;
  listingType: string;
  propertyType: string;
  status: string;
  country: string;
  locality: string;
  subLocality: string;
  city: string;
  state: string;
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
  locality: "",
  subLocality: "",
  city: "Bareilly",
  state: "Uttar Pradesh",
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
  features: "",
  isFeatured: false,
  isVerified: false
};

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const EMPTY_FILTER_OPTIONS: ProjectFilterOptions = {
  listingTypes: [],
  statuses: [],
  cities: [],
  propertyTypes: []
};

const PROPERTY_IMPORT_FIELDS: Array<{ key: string; label: string; required?: boolean }> = [
  { key: "title", label: "Title" },
  { key: "listingType", label: "Listing Type" },
  { key: "propertyType", label: "Property Type", required: true },
  { key: "locality", label: "Locality", required: true },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "subLocality", label: "Sub Locality" },
  { key: "addressLine1", label: "Address Line 1" },
  { key: "addressLine2", label: "Address Line 2" },
  { key: "landmark", label: "Landmark" },
  { key: "pincode", label: "Pincode" },
  { key: "status", label: "Status" },
  { key: "possessionStatus", label: "Possession Status" },
  { key: "facing", label: "Facing" },
  { key: "latitude", label: "Latitude" },
  { key: "longitude", label: "Longitude" },
  { key: "priceAmount", label: "Price Amount" },
  { key: "rentAmount", label: "Rent Amount" },
  { key: "priceLabel", label: "Price Label" },
  { key: "bedrooms", label: "Bedrooms" },
  { key: "bathrooms", label: "Bathrooms" },
  { key: "balconies", label: "Balconies" },
  { key: "floorNumber", label: "Floor Number" },
  { key: "floorsTotal", label: "Floors Total" },
  { key: "builtupArea", label: "Built-up Area" },
  { key: "builtupAreaUnit", label: "Built-up Area Unit" },
  { key: "carpetArea", label: "Carpet Area" },
  { key: "plotArea", label: "Plot Area" },
  { key: "parkingCount", label: "Parking Count" },
  { key: "furnishingStatus", label: "Furnishing Status" },
  { key: "ageOfProperty", label: "Age Of Property" },
  { key: "features", label: "Features" },
  { key: "isFeatured", label: "Is Featured" },
  { key: "isVerified", label: "Is Verified" }
];

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseOptionalNumber(value: unknown) {
  const trimmed = toStringValue(value).trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseCsvList(value: string) {
  return toStringValue(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatPrice(project: ProjectListing) {
  if (project.listingType === "rent" || project.listingType === "lease") {
    return project.rentAmount != null ? currency.format(project.rentAmount) : project.priceLabel || "-";
  }

  return project.priceAmount != null ? currency.format(project.priceAmount) : project.priceLabel || "-";
}

function formatPublishedDate(value: string | null) {
  if (!value) {
    return "Not published";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not published";
  }
  return dateFormatter.format(parsed);
}

function TruncatedCell({ value }: { value?: string | null }) {
  const text = value?.trim() ? value : "-";
  const hasValue = text !== "-";

  return (
    <Tooltip title={hasValue ? text : ""} disableHoverListener={!hasValue} placement="top" arrow>
      <div
        className="cursor-help break-words"
        style={{
          width: "100%",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          whiteSpace: "normal"
        }}
      >
        {text}
      </div>
    </Tooltip>
  );
}

function ProjectsGridToolbar() {
  return (
    <GridToolbarContainer sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Box sx={{ minWidth: 240, flex: { xs: "1 1 100%", md: "0 0 auto" } }}>
        <GridToolbarQuickFilter debounceMs={300} sx={{ width: { xs: "100%", md: 320 } }} />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        <GridToolbarDensitySelector />
        <GridToolbarExport />
      </Box>
    </GridToolbarContainer>
  );
}

export default function ProjectsPage() {
  const [panelMode, setPanelMode] = useState<"create" | "import">("create");
  const [items, setItems] = useState<ProjectListing[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<ProjectPropertyType[]>([]);
  const [filterOptions, setFilterOptions] = useState<ProjectFilterOptions>(EMPTY_FILTER_OPTIONS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [galleryImageFiles, setGalleryImageFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPropertiesPreview | null>(null);
  const [importMappings, setImportMappings] = useState<Partial<Record<string, string>>>({});
  const [importResult, setImportResult] = useState<ImportPropertiesResponse | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    listingType: "",
    propertyType: "",
    status: "",
    city: "",
    isFeatured: "",
    isVerified: ""
  });

  const query = useMemo<ProjectsFilters>(
    () => ({
      page,
      limit: pageSize,
      search: filters.search,
      listingType: filters.listingType,
      propertyType: filters.propertyType,
      status: filters.status,
      city: filters.city,
      isFeatured: filters.isFeatured,
      isVerified: filters.isVerified
    }),
    [filters, page, pageSize]
  );

  const projectColumns: Array<GridColDef<ProjectListing>> = [
    {
      field: "propertyCode",
      headerName: "Code",
      minWidth: 140,
      renderCell: (params) => (
        <div className="w-full">
          <Link
            to={`/properties/${params.row.id}/edit`}
            className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 transition hover:text-blue-900 dark:text-blue-300 dark:decoration-blue-600 dark:hover:text-blue-200"
          >
            {params.row.propertyCode}
          </Link>
        </div>
      )
    },
    { field: "slug", headerName: "Slug", minWidth: 170, renderCell: (params) => <TruncatedCell value={params.row.slug} /> },
    {
      field: "title",
      headerName: "Title",
      minWidth: 220,
      flex: 1,
      renderCell: (params) => <TruncatedCell value={params.row.title} />
    },
    { field: "propertyType", headerName: "Property Type", minWidth: 150, renderCell: (params) => <TruncatedCell value={params.row.propertyType} /> },
    { field: "description", headerName: "Description", minWidth: 240, flex: 1, sortable: false, renderCell: (params) => <TruncatedCell value={params.row.description} /> },
    { field: "listingType", headerName: "Listing Type", minWidth: 130, renderCell: (params) => <span className="capitalize">{params.row.listingType}</span> },
    { field: "status", headerName: "Status", minWidth: 120, renderCell: (params) => <span className="capitalize">{params.row.status}</span> },
    { field: "publishedAt", headerName: "Published Date", minWidth: 140, renderCell: (params) => formatPublishedDate(params.row.publishedAt) },
    { field: "locality", headerName: "Locality", minWidth: 150, renderCell: (params) => <TruncatedCell value={params.row.locality} /> },
    { field: "city", headerName: "City", minWidth: 130, renderCell: (params) => <TruncatedCell value={params.row.city} /> },
    { field: "state", headerName: "State", minWidth: 130, renderCell: (params) => <TruncatedCell value={params.row.state} /> },
    { field: "addressLine1", headerName: "Address", minWidth: 240, flex: 1, sortable: false, renderCell: (params) => <TruncatedCell value={params.row.addressLine1} /> },
    { field: "bedrooms", headerName: "Bedrooms", minWidth: 110, valueGetter: (params) => (params.row.bedrooms != null ? String(params.row.bedrooms) : "-") },
    { field: "bathrooms", headerName: "Bathrooms", minWidth: 110, valueGetter: (params) => (params.row.bathrooms != null ? String(params.row.bathrooms) : "-") },
    {
      field: "builtupArea",
      headerName: "Built-up Area",
      minWidth: 140,
      valueGetter: (params) =>
        params.row.builtupArea != null ? `${params.row.builtupArea} ${params.row.builtupAreaUnit || "sqft"}` : "-"
    },
    { field: "price", headerName: "Price", minWidth: 150, valueGetter: (params) => formatPrice(params.row) },
    {
      field: "rentAmount",
      headerName: "Rent Amount",
      minWidth: 150,
      valueGetter: (params) => (params.row.rentAmount != null ? currency.format(params.row.rentAmount) : "-")
    },
    {
      field: "saleAmount",
      headerName: "Sale Amount",
      minWidth: 150,
      valueGetter: (params) => (params.row.priceAmount != null ? currency.format(params.row.priceAmount) : "-")
    },
    { field: "isFeatured", headerName: "Featured", minWidth: 110, valueGetter: (params) => (params.row.isFeatured ? "Yes" : "No") },
    { field: "isVerified", headerName: "Verified", minWidth: 110, valueGetter: (params) => (params.row.isVerified ? "Yes" : "No") }
  ];

  const loadProjects = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getProjects(query);
      setItems(response.items);
      setPropertyTypes(response.propertyTypes);
      setFilterOptions(response.filterOptions);
      setPage(response.pagination.page);
      setPageSize(response.pagination.limit);
      setTotalPages(Math.max(response.pagination.totalPages, 1));
      setForm((prev) => ({
        ...prev,
        propertyType: prev.propertyType || response.propertyTypes[0]?.name || ""
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load properties.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, [query]);

  const setText = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value } as FormState));
  };

  const resetCreateForm = () => {
    setForm((prev) => ({
      ...INITIAL_FORM,
      country: prev.country,
      city: prev.city,
      state: prev.state,
      propertyType: propertyTypes[0]?.name || ""
    }));
    setCoverImageFile(null);
    setGalleryImageFiles([]);
  };

  const closePanel = () => {
    if (panelMode === "create") {
      resetCreateForm();
    } else {
      setImportFile(null);
      setImportPreview(null);
      setImportMappings({});
      setImportResult(null);
    }
    setError("");
    setPanelOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({
      search: "",
      listingType: "",
      propertyType: "",
      status: "",
      city: "",
      isFeatured: "",
      isVerified: ""
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const created = await createProject({
        title: toStringValue(form.title).trim(),
        description: toStringValue(form.description).trim() || undefined,
        listingType: form.listingType,
        propertyType: form.propertyType,
        status: form.status,
        country: toStringValue(form.country).trim() || undefined,
        locality: toStringValue(form.locality).trim(),
        subLocality: toStringValue(form.subLocality).trim() || undefined,
        city: toStringValue(form.city).trim() || undefined,
        state: toStringValue(form.state).trim() || undefined,
        addressLine1: toStringValue(form.addressLine1).trim() || undefined,
        addressLine2: toStringValue(form.addressLine2).trim() || undefined,
        landmark: toStringValue(form.landmark).trim() || undefined,
        pincode: toStringValue(form.pincode).trim() || undefined,
        possessionStatus: toStringValue(form.possessionStatus).trim() || undefined,
        facing: toStringValue(form.facing).trim() || undefined,
        latitude: parseOptionalNumber(form.latitude),
        longitude: parseOptionalNumber(form.longitude),
        priceAmount: parseOptionalNumber(form.priceAmount),
        rentAmount: parseOptionalNumber(form.rentAmount),
        securityDeposit: parseOptionalNumber(form.securityDeposit),
        maintenanceAmount: parseOptionalNumber(form.maintenanceAmount),
        priceLabel: toStringValue(form.priceLabel).trim() || undefined,
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
        furnishingStatus: toStringValue(form.furnishingStatus).trim() || undefined,
        ageOfProperty: parseOptionalNumber(form.ageOfProperty),
        features: parseCsvList(form.features),
        coverImageFile,
        galleryImageFiles,
        isFeatured: form.isFeatured,
        isVerified: form.isVerified
      });

      setSuccess(`Property saved as ${created?.propertyCode || "new listing"}. Active sale/rent listings appear on the homepage automatically.`);
      resetCreateForm();
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
    setImportPreview(null);
    setImportMappings({});
    setImportResult(null);
    setImportFile(null);
    setPanelOpen(true);
  };

  const handleFilePreview = async (file: File) => {
    setPreviewLoading(true);
    setError("");
    setSuccess("");
    setImportResult(null);

    try {
      const preview = await previewPropertiesImport(file);
      setImportFile(file);
      setImportPreview(preview);
      setImportMappings(preview.suggestedMappings || {});
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Failed to preview import file.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleHeaderMappingChange = (header: string, fieldKey: string) => {
    setImportMappings((prev) => {
      const next: Partial<Record<string, string>> = {};
      for (const field of PROPERTY_IMPORT_FIELDS) {
        const existingHeader = prev[field.key];
        if (!existingHeader) {
          continue;
        }
        if (existingHeader === header) {
          continue;
        }
        if (field.key === fieldKey) {
          continue;
        }
        next[field.key] = existingHeader;
      }

      if (fieldKey) {
        next[fieldKey] = header;
      }

      return next;
    });
  };

  const downloadSampleCsv = () => {
    downloadTextFile(
      "sample-properties-import.csv",
      [
        "title,listing_type,property_type,locality,city,state,country,sub_locality,address_line1,address_line2,landmark,pincode,status,possession_status,facing,latitude,longitude,price_amount,rent_amount,security_deposit,maintenance_amount,price_label,bedrooms,bathrooms,balconies,floor_number,floors_total,builtup_area,builtup_area_unit,carpet_area,plot_area,parking_count,furnishing_status,age_of_property,features,is_featured,is_verified",
        "Sunshine Residency,sale,Apartment,Civil Lines,Bareilly,Uttar Pradesh,India,Near Stadium,\"123 Main Road\",\"Block A\",\"City Mall\",243001,active,ready to move,East,28.3670,79.4304,6500000,,50000,2500,\"65 Lakh\",3,2,2,5,12,1450,sqft,1100,,1,Semi-furnished,2,\"Lift, Power Backup, Park\",true,false"
      ].join("\n"),
      "text/csv;charset=utf-8"
    );
  };

  const downloadSampleJson = () => {
    downloadTextFile(
      "sample-properties-import.json",
      JSON.stringify(
        [
          {
            title: "Sunshine Residency",
            listing_type: "sale",
            property_type: "Apartment",
            locality: "Civil Lines",
            city: "Bareilly",
            state: "Uttar Pradesh",
            country: "India",
            sub_locality: "Near Stadium",
            address_line1: "123 Main Road",
            address_line2: "Block A",
            landmark: "City Mall",
            pincode: "243001",
            status: "active",
            possession_status: "ready to move",
            facing: "East",
            latitude: 28.367,
            longitude: 79.4304,
            price_amount: 6500000,
            rent_amount: null,
            security_deposit: 50000,
            maintenance_amount: 2500,
            price_label: "65 Lakh",
            bedrooms: 3,
            bathrooms: 2,
            balconies: 2,
            floor_number: 5,
            floors_total: 12,
            builtup_area: 1450,
            builtup_area_unit: "sqft",
            carpet_area: 1100,
            plot_area: null,
            parking_count: 1,
            furnishing_status: "Semi-furnished",
            age_of_property: 2,
            features: "Lift, Power Backup, Park",
            is_featured: true,
            is_verified: false
          }
        ],
        null,
        2
      ),
      "application/json;charset=utf-8"
    );
  };

  const onImportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!importFile || !importPreview) {
      setError("Choose a CSV, Excel, or JSON file to import.");
      return;
    }

    if (!importMappings.propertyType || !importMappings.locality) {
      setError("Please map Property Type and Locality before importing.");
      return;
    }

    setImporting(true);
    setError("");
    setSuccess("");
    setImportResult(null);

    try {
      const result = await importProperties({ file: importFile, mappings: importMappings });
      setImportResult(result);
      const skippedCount = result.skippedCount ?? 0;
      setSuccess(
        `Imported ${result.importedCount} properties.${skippedCount ? ` ${skippedCount} duplicates skipped.` : ""}${result.failedCount ? ` ${result.failedCount} rows failed.` : ""}`
      );
      await loadProjects();
      closePanel();
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
              <Button size="sm" variant="outline" onClick={() => setShowFilters((prev) => !prev)}>
                <Filter className="mr-1 h-4 w-4" />
                Filter
              </Button>
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
          {showFilters ? (
            <div className="mb-3 rounded-sm border border-gray-200 bg-gray-50 p-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-4">
                <Input
                  className="h-9 text-xs"
                  placeholder="Search title, code, slug, location"
                  value={filters.search}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((prev) => ({ ...prev, search: event.target.value }));
                  }}
                />
                <Select
                  className="h-9 text-xs"
                  value={filters.listingType}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((prev) => ({ ...prev, listingType: event.target.value }));
                  }}
                >
                  <option value="">All Listing Types</option>
                  {filterOptions.listingTypes.map((listingType) => (
                    <option key={listingType} value={listingType}>
                      {listingType}
                    </option>
                  ))}
                </Select>
                <Select
                  className="h-9 text-xs"
                  value={filters.propertyType}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((prev) => ({ ...prev, propertyType: event.target.value }));
                  }}
                >
                  <option value="">All Property Types</option>
                  {filterOptions.propertyTypes.map((propertyType) => (
                    <option key={propertyType} value={propertyType}>
                      {propertyType}
                    </option>
                  ))}
                </Select>
                <Select
                  className="h-9 text-xs"
                  value={filters.status}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((prev) => ({ ...prev, status: event.target.value }));
                  }}
                >
                  <option value="">All Statuses</option>
                  {filterOptions.statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
                <Input
                  className="h-9 text-xs"
                  list="property-filter-city-options"
                  placeholder="Filter by city"
                  value={filters.city}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((prev) => ({ ...prev, city: event.target.value }));
                  }}
                />
                <datalist id="property-filter-city-options">
                  {filterOptions.cities.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
                <Select
                  className="h-9 text-xs"
                  value={filters.isFeatured}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((prev) => ({ ...prev, isFeatured: event.target.value }));
                  }}
                >
                  <option value="">All Featured States</option>
                  <option value="true">Featured Only</option>
                  <option value="false">Standard Only</option>
                </Select>
                <Select
                  className="h-9 text-xs"
                  value={filters.isVerified}
                  onChange={(event) => {
                    setPage(1);
                    setFilters((prev) => ({ ...prev, isVerified: event.target.value }));
                  }}
                >
                  <option value="">All Verification States</option>
                  <option value="true">Verified Only</option>
                  <option value="false">Unverified Only</option>
                </Select>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowFilters(false)}>
                  Hide Filters
                </Button>
              </div>
            </div>
          ) : null}

          {success ? <p className="mb-3 text-xs text-green-600">{success}</p> : null}
          {error && !panelOpen ? <p className="mb-3 text-xs text-red-600">{error}</p> : null}
          <div className="w-full">
            <div style={{ height: 560 }}>
              <DataGrid
                density="compact"
                rows={items}
                columns={projectColumns}
                getRowId={(row) => row.id}
                loading={loading}
                disableRowSelectionOnClick
                slots={{ toolbar: ProjectsGridToolbar }}
                hideFooter
                sx={(theme) => ({
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: "0.375rem",
                  fontSize: "0.75rem",
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    borderBottom: `1px solid ${alpha(theme.palette.primary.contrastText, 0.2)}`
                  },
                  "& .MuiDataGrid-columnHeaderTitle": {
                    fontWeight: 700
                  },
                  "& .MuiDataGrid-row:nth-of-type(odd) .MuiDataGrid-cell": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.04)
                  },
                  "& .MuiDataGrid-row:nth-of-type(even) .MuiDataGrid-cell": {
                    backgroundColor: theme.palette.background.paper
                  },
                  "& .MuiDataGrid-row:hover .MuiDataGrid-cell": {
                    backgroundColor: theme.palette.action.hover
                  },
                  "& .MuiDataGrid-iconButtonContainer, & .MuiDataGrid-menuIcon, & .MuiDataGrid-sortIcon, & .MuiDataGrid-filterIcon": {
                    color: theme.palette.primary.contrastText
                  },
                  "& .MuiDataGrid-toolbarContainer": {
                    padding: "0.5rem"
                  },
                  "& .MuiDataGrid-toolbarContainer .MuiButtonBase-root": {
                    fontSize: "0.75rem"
                  }
                })}
              />
            </div>
          </div>
          {!loading ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(nextSize) => {
                setPage(1);
                setPageSize(nextSize);
              }}
            />
          ) : null}
        </CardContent>
      </Card>

      {panelOpen
        ? createPortal(
            <>
              <div className="fixed inset-0 z-40 bg-slate-950/30">
                <button aria-label="Close property popup overlay" className="h-full w-full" onClick={closePanel} />
              </div>

              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <Card className="flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{panelMode === "create" ? "Add Property" : "Import Properties"}</p>
                      <p className="text-[11px] text-gray-500">
                        {panelMode === "create"
                          ? "Create a listing that can also appear on the homepage."
                          : "Upload CSV, Excel, or 99acres JSON and import property data automatically."}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={closePanel} aria-label="Close popup">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="overflow-y-auto">
                {panelMode === "create" ? (
                <form className="grid gap-3 p-4 md:grid-cols-3" onSubmit={onSubmit}>
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
                <option value="">Select type</option>
                {propertyTypes.map((type) => (
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
            <Field label="Country">
              <Input className="h-9 text-xs" value={form.country} onChange={(event) => setText("country", event.target.value)} />
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
            <Field label="Address Line 1">
              <Input className="h-9 text-xs" value={form.addressLine1} onChange={(event) => setText("addressLine1", event.target.value)} />
            </Field>
            {form.listingType === "sale" ? (
              <Field label="Sale Price">
                <Input className="h-9 text-xs" type="number" value={form.priceAmount} onChange={(event) => setText("priceAmount", event.target.value)} />
              </Field>
            ) : null}
            {form.listingType === "rent" || form.listingType === "lease" ? (
              <Field label="Monthly Rent">
                <Input className="h-9 text-xs" type="number" value={form.rentAmount} onChange={(event) => setText("rentAmount", event.target.value)} />
              </Field>
            ) : null}
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

          <details className="rounded-sm border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200 md:col-span-3">
            <summary className="cursor-pointer select-none font-medium">More details</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Field label="Possession Status">
                <Input className="h-9 text-xs" value={form.possessionStatus} onChange={(event) => setText("possessionStatus", event.target.value)} />
              </Field>
              <Field label="Facing">
                <Input className="h-9 text-xs" value={form.facing} onChange={(event) => setText("facing", event.target.value)} />
              </Field>
              <Field label="Latitude">
                <Input className="h-9 text-xs" type="number" value={form.latitude} onChange={(event) => setText("latitude", event.target.value)} />
              </Field>
              <Field label="Longitude">
                <Input className="h-9 text-xs" type="number" value={form.longitude} onChange={(event) => setText("longitude", event.target.value)} />
              </Field>
              <Field label="Security Deposit">
                <Input className="h-9 text-xs" type="number" value={form.securityDeposit} onChange={(event) => setText("securityDeposit", event.target.value)} />
              </Field>
              <Field label="Maintenance Amount">
                <Input className="h-9 text-xs" type="number" value={form.maintenanceAmount} onChange={(event) => setText("maintenanceAmount", event.target.value)} />
              </Field>
              <Field label="Floor Number">
                <Input className="h-9 text-xs" type="number" value={form.floorNumber} onChange={(event) => setText("floorNumber", event.target.value)} />
              </Field>
              <Field label="Total Floors">
                <Input className="h-9 text-xs" type="number" value={form.floorsTotal} onChange={(event) => setText("floorsTotal", event.target.value)} />
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
              <Field label="Landmark">
                <Input className="h-9 text-xs" value={form.landmark} onChange={(event) => setText("landmark", event.target.value)} />
              </Field>
              <Field label="Address Line 2" className="md:col-span-3">
                <Input className="h-9 text-xs" value={form.addressLine2} onChange={(event) => setText("addressLine2", event.target.value)} />
              </Field>
            </div>
          </details>

          <Field label="Description" className="md:col-span-3">
            <textarea
              className="min-h-24 w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.description}
              onChange={(event) => setText("description", event.target.value)}
            />
          </Field>
          <Field label="Features (comma separated)" className="md:col-span-3">
            <textarea
              className="min-h-20 w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.features}
              onChange={(event) => setText("features", event.target.value)}
            />
          </Field>
          <Field label="Cover Image">
            <Input
              className="h-10 text-xs"
              type="file"
              accept="image/*"
              onChange={(event) => setCoverImageFile(event.target.files?.[0] || null)}
            />
          </Field>
          {coverImageFile ? (
            <div className="rounded-sm border border-gray-200 bg-gray-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/40">
              <p className="font-medium text-gray-800 dark:text-slate-100">{coverImageFile.name}</p>
              <p className="mt-1 text-gray-500">{(coverImageFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : null}

          <Field label="Gallery Images">
            <Input
              className="h-10 text-xs"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setGalleryImageFiles(Array.from(event.target.files || []))}
            />
          </Field>
          {galleryImageFiles.length ? (
            <div className="rounded-sm border border-gray-200 bg-gray-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/40 md:col-span-2">
              <p className="font-medium text-gray-800 dark:text-slate-100">{galleryImageFiles.length} gallery image(s) selected</p>
              <div className="mt-2 space-y-1 text-gray-500">
                {galleryImageFiles.map((file) => (
                  <p key={`${file.name}-${file.size}`}>{file.name}</p>
                ))}
              </div>
            </div>
          ) : null}

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

          <p className="text-[11px] text-gray-500 md:col-span-3">
            Active sale, rent, and lease listings are available to the homepage sections immediately after save. The
            first uploaded image becomes the cover image.
          </p>

          {error ? <p className="text-xs text-red-600 md:col-span-3">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-slate-800 md:col-span-3">
            <Button type="button" variant="outline" size="sm" onClick={closePanel}>
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
		            <p className="mt-1">CSV (.csv), Excel (.xlsx/.xls), JSON (.json)</p>
		            <p className="mt-3">
		              Required columns: <span className="font-medium">title</span>, <span className="font-medium">listing type</span>,{" "}
		              <span className="font-medium">property type</span>, <span className="font-medium">locality</span>. (99acres JSON is auto-mapped.)
		            </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={downloadSampleCsv}>
                    Download sample CSV
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={downloadSampleJson}>
                    Download sample JSON
                  </Button>
                </div>
		          </div>

          <input
            id="properties-import-file"
            type="file"
            accept=".csv,.xlsx,.xls,.json,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFilePreview(file);
              }
            }}
          />
          <div
            className="rounded-sm border border-dashed border-gray-300 bg-gray-50 p-4 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) {
                void handleFilePreview(file);
              }
            }}
          >
            <p className="text-xs text-gray-600 dark:text-slate-300">Choose a file to preview and map columns before import.</p>
            <div className="mt-3 flex justify-center">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={previewLoading || importing}
                onClick={() => document.getElementById("properties-import-file")?.click()}
              >
                {previewLoading ? "Reading File..." : "Browse File"}
              </Button>
            </div>
            {importFile ? <p className="mt-2 text-xs text-gray-600">Selected file: {importFile.name}</p> : null}
          </div>

          {importPreview ? (
            <div className="space-y-3 rounded-sm border border-gray-200 p-3 dark:border-slate-700">
              <div className="rounded-sm border border-gray-200 bg-gray-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-gray-500">Rows Found</p>
                <p className="mt-1 text-sm font-medium text-gray-800 dark:text-slate-100">{importPreview.totalRows}</p>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-800 dark:text-slate-100">Map Columns</p>
                <div className="hidden grid-cols-[1fr_1fr] gap-2 border-b border-gray-200 pb-2 text-xs font-semibold text-gray-600 md:grid dark:border-slate-700 dark:text-slate-300">
                  <p>Sheet Column</p>
                  <p>CRM Column</p>
                </div>
                <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                  {importPreview.headers.map((header) => {
                    const mappedField = PROPERTY_IMPORT_FIELDS.find((field) => importMappings[field.key] === header);
                    return (
                      <div key={header} className="grid grid-cols-1 gap-2 rounded-sm border border-gray-100 p-2 md:grid-cols-[1fr_1fr] md:items-center dark:border-slate-700">
                        <div>
                          <p className="text-[11px] text-gray-500 md:hidden">Sheet Column</p>
                          <p className="text-xs font-medium text-gray-800 dark:text-slate-100">{header}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-gray-500 md:hidden">CRM Column</p>
                          <Select
                            className="h-9 text-xs"
                            value={mappedField?.key || ""}
                            onChange={(event) => handleHeaderMappingChange(header, event.target.value)}
                          >
                            <option value="">Do not import</option>
                            {PROPERTY_IMPORT_FIELDS.map((field) => (
                              <option key={field.key} value={field.key}>
                                {field.label}
                                {field.required ? " *" : ""}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-sm border border-gray-200 p-3 dark:border-slate-700">
                <p className="mb-2 text-sm font-medium text-gray-800 dark:text-slate-100">Preview Rows</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-600 dark:border-slate-700 dark:text-slate-300">
                        {importPreview.headers.map((header) => (
                          <th key={header} className="px-2 py-2 font-medium">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.sampleRows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-gray-100 dark:border-slate-800">
                          {importPreview.headers.map((header) => (
                            <td key={`${rowIndex}-${header}`} className="px-2 py-2 text-gray-700 dark:text-slate-200">
                              {String(row[header] ?? "-")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          {importResult ? (
            <div className="space-y-3 rounded-sm border border-gray-200 bg-gray-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/50">
              <p className="font-medium text-gray-800 dark:text-slate-100">
                Imported {importResult.importedCount} properties
                {(importResult.skippedCount ?? 0) ? `, ${importResult.skippedCount} duplicates skipped` : ""}
                {importResult.failedCount ? `, ${importResult.failedCount} failed` : ""}.
              </p>
              {importResult.importedTruncated || importResult.skippedTruncated || importResult.errorsTruncated ? (
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Large import detected. Showing only first 200 imported/skipped/error rows in this summary.
                </p>
              ) : null}
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
              {importResult.skipped?.length ? (
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-300">Skipped Duplicates</p>
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {importResult.skipped.map((entry) => (
                      <p key={`${entry.row}-${entry.reason}`} className="text-[11px] text-amber-700 dark:text-amber-300">
                        Row {entry.row}: {entry.reason}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
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
            <Button type="button" variant="outline" size="sm" onClick={closePanel}>
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

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className ? `space-y-1 ${className}` : "space-y-1"}>
      <label className="text-xs font-medium text-gray-700 dark:text-slate-200">{label}</label>
      {children}
    </div>
  );
}
