import { NextResponse } from "next/server";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";
import { createProperty, getPropertyTypeOptions, listApiProperties } from "@/lib/properties";

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error("Numeric fields must contain valid numbers.");
  }

  return numberValue;
}

function toNullableInteger(value: unknown) {
  const numberValue = toNullableNumber(value);

  if (numberValue === null) {
    return null;
  }

  return Math.trunc(numberValue);
}

function toRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
}

function toOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toBoolean(value: unknown) {
  return value === true || value === "true" || value === "on" || value === 1;
}

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    const [items, propertyTypes] = await Promise.all([listApiProperties(50), getPropertyTypeOptions()]);

    return withCors(
      NextResponse.json({
        ok: true,
        items,
        propertyTypes
      }),
      request
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";

    return withCors(
      NextResponse.json(
        {
          ok: false,
          error: message
        },
        { status: 500 }
      ),
      request
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const listingType = toRequiredString(body.listingType, "Listing type").toLowerCase();
    const propertyTypeId = Number(toRequiredString(body.propertyTypeId, "Property type"));

    if (!["sale", "rent", "lease"].includes(listingType)) {
      throw new Error("Listing type must be sale, rent, or lease.");
    }

    if (!Number.isInteger(propertyTypeId) || propertyTypeId <= 0) {
      throw new Error("Property type is invalid.");
    }

    const property = await createProperty({
      title: toRequiredString(body.title, "Title"),
      description: toOptionalString(body.description),
      listingType,
      propertyTypeId,
      locality: toRequiredString(body.locality, "Locality"),
      city: toOptionalString(body.city),
      state: toOptionalString(body.state),
      addressLine1: toOptionalString(body.addressLine1),
      pincode: toOptionalString(body.pincode),
      status: toOptionalString(body.status) || "active",
      possessionStatus: toOptionalString(body.possessionStatus),
      priceAmount: toNullableNumber(body.priceAmount),
      rentAmount: toNullableNumber(body.rentAmount),
      securityDeposit: toNullableNumber(body.securityDeposit),
      maintenanceAmount: toNullableNumber(body.maintenanceAmount),
      priceLabel: toOptionalString(body.priceLabel),
      bedrooms: toNullableInteger(body.bedrooms),
      bathrooms: toNullableInteger(body.bathrooms),
      balconies: toNullableInteger(body.balconies),
      floorNumber: toNullableInteger(body.floorNumber),
      floorsTotal: toNullableInteger(body.floorsTotal),
      builtupArea: toNullableNumber(body.builtupArea),
      builtupAreaUnit: toOptionalString(body.builtupAreaUnit) || "sqft",
      parkingCount: toNullableInteger(body.parkingCount),
      furnishingStatus: toOptionalString(body.furnishingStatus),
      ageOfProperty: toNullableInteger(body.ageOfProperty),
      facing: toOptionalString(body.facing),
      latitude: toNullableNumber(body.latitude),
      longitude: toNullableNumber(body.longitude),
      coverImageUrl: toOptionalString(body.coverImageUrl),
      imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls.filter((value: unknown): value is string => typeof value === "string") : null,
      source: toOptionalString(body.source),
      isFeatured: toBoolean(body.isFeatured),
      isVerified: toBoolean(body.isVerified)
    });

    return withCors(
      NextResponse.json({
        ok: true,
        property
      }),
      request
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown property creation error";

    return withCors(
      NextResponse.json(
        {
          ok: false,
          error: message
        },
        { status: 400 }
      ),
      request
    );
  }
}
