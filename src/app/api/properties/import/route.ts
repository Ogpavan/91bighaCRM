import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import { createProperty, getPropertyTypeOptions } from "@/lib/properties";

export const runtime = "nodejs";

const HEADER_ALIASES: Record<string, string[]> = {
  title: ["title", "property title", "name", "property name"],
  description: ["description", "details", "summary"],
  listingType: ["listing type", "listingtype", "type", "listing"],
  propertyType: ["property type", "propertytype", "category"],
  locality: ["locality", "area", "location", "sector"],
  city: ["city"],
  state: ["state"],
  addressLine1: ["address", "address line 1", "address1"],
  pincode: ["pincode", "pin code", "zip", "zipcode"],
  status: ["status"],
  possessionStatus: ["possession status", "possession", "availability"],
  priceAmount: ["sale price", "price", "price amount", "selling price"],
  rentAmount: ["rent", "rent amount", "monthly rent"],
  securityDeposit: ["security deposit", "deposit"],
  maintenanceAmount: ["maintenance", "maintenance amount"],
  priceLabel: ["price label", "price note"],
  bedrooms: ["bedrooms", "beds", "bhk", "bedroom"],
  bathrooms: ["bathrooms", "baths", "bathroom"],
  balconies: ["balconies", "balcony"],
  floorNumber: ["floor number", "floor", "floor no", "floor_num"],
  floorsTotal: ["total floors", "total floor", "floors total", "total_floor"],
  builtupArea: ["builtup area", "built up area", "area", "builtup"],
  builtupAreaUnit: ["area unit", "builtup area unit", "unit"],
  parkingCount: ["parking", "parking count"],
  furnishingStatus: ["furnishing", "furnishing status"],
  ageOfProperty: ["age of property", "age", "property age"],
  facing: ["facing", "direction"],
  latitude: ["latitude", "lat"],
  longitude: ["longitude", "lng", "long"],
  coverImageUrl: ["cover image", "cover image url", "image", "image url"],
  isFeatured: ["featured", "is featured"],
  isVerified: ["verified", "is verified"]
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findMappedKey(headers: string[], targetKey: keyof typeof HEADER_ALIASES) {
  const aliases = HEADER_ALIASES[targetKey];
  return headers.find((header) => aliases.includes(normalizeHeader(header))) || null;
}

function getCell(row: Record<string, unknown>, mappedHeader: string | null) {
  if (!mappedHeader) {
    return undefined;
  }

  return row[mappedHeader];
}

function toOptionalString(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }
  const stringValue = String(value).trim();
  return stringValue ? stringValue : undefined;
}

function toRequiredString(value: unknown, fieldName: string) {
  const stringValue = toOptionalString(value);
  if (!stringValue) {
    throw new Error(`${fieldName} is required.`);
  }
  return stringValue;
}

function toOptionalNumber(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }
  return numberValue;
}

function toOptionalInteger(value: unknown, fieldName: string) {
  const numberValue = toOptionalNumber(value, fieldName);
  if (numberValue === undefined) {
    return undefined;
  }
  return Math.trunc(numberValue);
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["true", "yes", "1", "y"].includes(normalized);
}

function normalizeListingType(value: unknown) {
  const listingType = toRequiredString(value, "Listing type").toLowerCase();
  if (!["sale", "rent", "lease"].includes(listingType)) {
    throw new Error("Listing type must be sale, rent, or lease.");
  }
  return listingType;
}

function resolvePropertyTypeId(value: unknown, propertyTypes: Awaited<ReturnType<typeof getPropertyTypeOptions>>) {
  const raw = toRequiredString(value, "Property type");
  const asNumber = Number(raw);
  if (Number.isInteger(asNumber)) {
    const match = propertyTypes.find((type) => type.id === asNumber);
    if (match) {
      return match.id;
    }
  }

  const normalized = normalizeHeader(raw);
  const aliases: Record<string, string[]> = {
    apartment: ["residential apartment", "apartment", "flat"],
    "independent-house": ["independent house", "independent house villa", "independent house/villa", "house", "villa"],
    villa: ["villa"],
    plot: ["residential land", "land", "plot", "residential land plot", "residential land/plot"]
  };
  const match = propertyTypes.find((type) => {
    const typeName = normalizeHeader(type.name);
    const typeSlug = normalizeHeader(type.slug);
    return (
      typeName === normalized ||
      typeSlug === normalized ||
      (aliases[type.slug] || []).includes(normalized)
    );
  });
  if (!match) {
    throw new Error(`Unknown property type "${raw}".`);
  }

  return match.id;
}

function parseJsonPayload(buffer: Buffer) {
  try {
    return JSON.parse(buffer.toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

function toImageArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function normalizeFurnishing(value: unknown) {
  const normalized = toOptionalString(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (["unfurnished", "semifurnished", "semi furnished", "furnished"].includes(normalized)) {
    return normalized.replace("semi furnished", "semifurnished");
  }

  const furnishingMap: Record<string, string> = {
    "0": "unfurnished",
    "1": "furnished",
    "2": "unfurnished",
    "4": "semifurnished"
  };

  return furnishingMap[normalized] || normalized;
}

function normalizeFacing(value: unknown) {
  const normalized = toOptionalString(value);
  if (!normalized) {
    return undefined;
  }

  const facingMap: Record<string, string> = {
    "1": "North",
    "2": "South",
    "3": "East",
    "4": "West",
    "5": "North-East",
    "6": "North-West",
    "7": "South-East",
    "8": "South-West"
  };

  return facingMap[normalized] || normalized;
}

function normalizePossessionStatus(value: unknown) {
  const normalized = toOptionalString(value)?.toUpperCase();
  if (!normalized) {
    return undefined;
  }

  const statusMap: Record<string, string> = {
    I: "ready_to_move",
    L: "under_construction",
    N: "new_launch"
  };

  return statusMap[normalized] || normalized.toLowerCase();
}

function mapAgeBucket(value: unknown) {
  const normalized = toOptionalString(value);
  if (!normalized) {
    return undefined;
  }

  const ageMap: Record<string, number> = {
    "1": 3,
    "2": 7,
    "3": 10,
    "6": 0
  };

  if (normalized in ageMap) {
    return ageMap[normalized];
  }

  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) ? Math.trunc(numberValue) : undefined;
}

function build99AcresPayload(
  row: Record<string, unknown>,
  propertyTypes: Awaited<ReturnType<typeof getPropertyTypeOptions>>
) {
  const title =
    toOptionalString(row.PROP_HEADING) ||
    toOptionalString(row.PROP_NAME) ||
    `${toRequiredString(row.PROPERTY_TYPE, "Property type")} in ${toRequiredString(row.LOCALITY, "Locality")}`;

  return {
    title,
    description: toOptionalString(row.DESCRIPTION),
    listingType: row.PREFERENCE === "R" ? "rent" : "sale",
    propertyTypeId: resolvePropertyTypeId(row.PROPERTY_TYPE, propertyTypes),
    locality: toRequiredString(row.LOCALITY, "Locality"),
    city: toOptionalString(row.CITY) || "Bareilly",
    state: "Uttar Pradesh",
    addressLine1:
      toOptionalString((row.location as Record<string, unknown> | undefined)?.ADDRESS) ||
      toOptionalString((row.location as Record<string, unknown> | undefined)?.BUILDING_NAME),
    status: "active",
    possessionStatus: normalizePossessionStatus(row.AVAILABILITY),
    priceAmount: toOptionalNumber(row.MIN_PRICE, "Sale price"),
    rentAmount: undefined,
    priceLabel: toOptionalString(row.FORMATTED_PRICE) || toOptionalString(row.PRICE),
    bedrooms: toOptionalInteger(row.BEDROOM_NUM, "Bedrooms"),
    bathrooms: toOptionalInteger(row.BATHROOM_NUM, "Bathrooms"),
    balconies: toOptionalInteger(row.BALCONY_NUM, "Balconies"),
    floorNumber: toOptionalInteger(row.FLOOR_NUM, "Floor number"),
    floorsTotal: toOptionalInteger(row.TOTAL_FLOOR, "Total floors"),
    builtupArea:
      toOptionalNumber(row.SUPER_SQFT, "Built-up area") ||
      toOptionalNumber(row.BUILTUP_AREA, "Built-up area"),
    builtupAreaUnit: "sqft",
    parkingCount: (() => {
      const parking = row.RESERVED_PARKING;
      if (typeof parking === "string" && parking.trim()) {
        try {
          const parsed = JSON.parse(parking) as unknown;
          if (Array.isArray(parsed)) {
            return parsed.includes("N") ? 0 : undefined;
          }
          if (parsed && typeof parsed === "object") {
            return Object.values(parsed as Record<string, unknown>).reduce<number>((sum, entry) => {
              const next = Number(entry);
              return sum + (Number.isFinite(next) ? next : 0);
            }, 0);
          }
        } catch {
          return undefined;
        }
      }
      return undefined;
    })(),
    furnishingStatus:
      normalizeFurnishing((row.FORMATTED as Record<string, unknown> | undefined)?.FURNISH_LABEL) ||
      normalizeFurnishing(row.FURNISH),
    ageOfProperty: mapAgeBucket(row.AGE),
    facing: normalizeFacing(row.FACING),
    latitude: toOptionalNumber((row.MAP_DETAILS as Record<string, unknown> | undefined)?.LATITUDE, "Latitude"),
    longitude: toOptionalNumber((row.MAP_DETAILS as Record<string, unknown> | undefined)?.LONGITUDE, "Longitude"),
    coverImageUrl: toOptionalString(row.PHOTO_URL) || toOptionalString(row.MEDIUM_PHOTO_URL),
    imageUrls: toImageArray(row.PROPERTY_IMAGES),
    source: "99acres",
    isFeatured: false,
    isVerified: row.VERIFIED === "Y" || row.SELF_VERIFIED === "Y"
  };
}

function is99AcresPayload(value: unknown): value is { properties: Array<Record<string, unknown>> } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const properties = (value as { properties?: unknown }).properties;
  return Array.isArray(properties);
}

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new Error("Import file is required.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const propertyTypes = await getPropertyTypeOptions();
    const jsonPayload = parseJsonPayload(buffer);
    const imported: Array<{ row: number; propertyCode: string; slug: string }> = [];
    const errors: Array<{ row: number; error: string }> = [];

    if (is99AcresPayload(jsonPayload)) {
      for (const [index, row] of jsonPayload.properties.entries()) {
        try {
          const property = await createProperty(build99AcresPayload(row, propertyTypes));
          imported.push({
            row: index + 1,
            propertyCode: property.propertyCode,
            slug: property.slug
          });
        } catch (error) {
          errors.push({
            row: index + 1,
            error: error instanceof Error ? error.message : "Import failed."
          });
        }
      }

      return withCors(
        NextResponse.json({
          ok: true,
          importedCount: imported.length,
          failedCount: errors.length,
          imported,
          errors,
          mapping: { source: "99acres-json" },
          headers: ["properties"]
        }),
        request
      );
    }

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("The uploaded file does not contain any sheets.");
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
    const headers = rows.length ? Object.keys(rows[0]) : [];

    if (!rows.length) {
      throw new Error("The uploaded file does not contain any data rows.");
    }

    const mapping = {
      title: findMappedKey(headers, "title"),
      description: findMappedKey(headers, "description"),
      listingType: findMappedKey(headers, "listingType"),
      propertyType: findMappedKey(headers, "propertyType"),
      locality: findMappedKey(headers, "locality"),
      city: findMappedKey(headers, "city"),
      state: findMappedKey(headers, "state"),
      addressLine1: findMappedKey(headers, "addressLine1"),
      pincode: findMappedKey(headers, "pincode"),
      status: findMappedKey(headers, "status"),
      possessionStatus: findMappedKey(headers, "possessionStatus"),
      priceAmount: findMappedKey(headers, "priceAmount"),
      rentAmount: findMappedKey(headers, "rentAmount"),
      securityDeposit: findMappedKey(headers, "securityDeposit"),
      maintenanceAmount: findMappedKey(headers, "maintenanceAmount"),
      priceLabel: findMappedKey(headers, "priceLabel"),
      bedrooms: findMappedKey(headers, "bedrooms"),
      bathrooms: findMappedKey(headers, "bathrooms"),
      balconies: findMappedKey(headers, "balconies"),
      floorNumber: findMappedKey(headers, "floorNumber"),
      floorsTotal: findMappedKey(headers, "floorsTotal"),
      builtupArea: findMappedKey(headers, "builtupArea"),
      builtupAreaUnit: findMappedKey(headers, "builtupAreaUnit"),
      parkingCount: findMappedKey(headers, "parkingCount"),
      furnishingStatus: findMappedKey(headers, "furnishingStatus"),
      ageOfProperty: findMappedKey(headers, "ageOfProperty"),
      facing: findMappedKey(headers, "facing"),
      latitude: findMappedKey(headers, "latitude"),
      longitude: findMappedKey(headers, "longitude"),
      coverImageUrl: findMappedKey(headers, "coverImageUrl"),
      isFeatured: findMappedKey(headers, "isFeatured"),
      isVerified: findMappedKey(headers, "isVerified")
    };

    if (!mapping.title || !mapping.listingType || !mapping.propertyType || !mapping.locality) {
      throw new Error("Required columns missing. Include title, listing type, property type, and locality.");
    }

    for (const [index, row] of rows.entries()) {
      try {
        const property = await createProperty({
          title: toRequiredString(getCell(row, mapping.title), "Title"),
          description: toOptionalString(getCell(row, mapping.description)),
          listingType: normalizeListingType(getCell(row, mapping.listingType)),
          propertyTypeId: resolvePropertyTypeId(getCell(row, mapping.propertyType), propertyTypes),
          locality: toRequiredString(getCell(row, mapping.locality), "Locality"),
          city: toOptionalString(getCell(row, mapping.city)),
          state: toOptionalString(getCell(row, mapping.state)),
          addressLine1: toOptionalString(getCell(row, mapping.addressLine1)),
          pincode: toOptionalString(getCell(row, mapping.pincode)),
          status: toOptionalString(getCell(row, mapping.status)) || "active",
          possessionStatus: toOptionalString(getCell(row, mapping.possessionStatus)),
          priceAmount: toOptionalNumber(getCell(row, mapping.priceAmount), "Sale price"),
          rentAmount: toOptionalNumber(getCell(row, mapping.rentAmount), "Rent amount"),
          securityDeposit: toOptionalNumber(getCell(row, mapping.securityDeposit), "Security deposit"),
          maintenanceAmount: toOptionalNumber(getCell(row, mapping.maintenanceAmount), "Maintenance amount"),
          priceLabel: toOptionalString(getCell(row, mapping.priceLabel)),
          bedrooms: toOptionalInteger(getCell(row, mapping.bedrooms), "Bedrooms"),
          bathrooms: toOptionalInteger(getCell(row, mapping.bathrooms), "Bathrooms"),
          balconies: toOptionalInteger(getCell(row, mapping.balconies), "Balconies"),
          floorNumber: toOptionalInteger(getCell(row, mapping.floorNumber), "Floor number"),
          floorsTotal: toOptionalInteger(getCell(row, mapping.floorsTotal), "Total floors"),
          builtupArea: toOptionalNumber(getCell(row, mapping.builtupArea), "Built-up area"),
          builtupAreaUnit: toOptionalString(getCell(row, mapping.builtupAreaUnit)) || "sqft",
          parkingCount: toOptionalInteger(getCell(row, mapping.parkingCount), "Parking count"),
          furnishingStatus: toOptionalString(getCell(row, mapping.furnishingStatus)),
          ageOfProperty: toOptionalInteger(getCell(row, mapping.ageOfProperty), "Age of property"),
          facing: toOptionalString(getCell(row, mapping.facing)),
          latitude: toOptionalNumber(getCell(row, mapping.latitude), "Latitude"),
          longitude: toOptionalNumber(getCell(row, mapping.longitude), "Longitude"),
          coverImageUrl: toOptionalString(getCell(row, mapping.coverImageUrl)),
          isFeatured: toBoolean(getCell(row, mapping.isFeatured)),
          isVerified: toBoolean(getCell(row, mapping.isVerified))
        });

        imported.push({
          row: index + 2,
          propertyCode: property.propertyCode,
          slug: property.slug
        });
      } catch (error) {
        errors.push({
          row: index + 2,
          error: error instanceof Error ? error.message : "Import failed."
        });
      }
    }

    return withCors(
      NextResponse.json({
        ok: true,
        importedCount: imported.length,
        failedCount: errors.length,
        imported,
        errors,
        mapping,
        headers
      }),
      request
    );
  } catch (error) {
    return withCors(
      NextResponse.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to import properties."
        },
        { status: 400 }
      ),
      request
    );
  }
}
