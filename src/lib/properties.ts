import { getDb, withDbClient } from "@/lib/db";

export type PropertyTypeOption = {
  id: number;
  name: string;
  slug: string;
};

export type HomepageProperty = {
  id: string;
  propertyCode: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  listingType: string;
  propertyType: string;
  locality: string | null;
  city: string | null;
  state: string | null;
  addressLine1: string | null;
  priceAmount: number | null;
  rentAmount: number | null;
  priceLabel: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  builtupArea: number | null;
  builtupAreaUnit: string | null;
  coverImage: string | null;
  isFeatured: boolean;
  isVerified: boolean;
  publishedAt: string | null;
};

export type PropertyDetail = HomepageProperty & {
  country: string | null;
  subLocality: string | null;
  addressLine2: string | null;
  landmark: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  possessionStatus: string | null;
  facing: string | null;
  securityDeposit: number | null;
  maintenanceAmount: number | null;
  balconies: number | null;
  floorsTotal: number | null;
  floorNumber: number | null;
  carpetArea: number | null;
  plotArea: number | null;
  parkingCount: number | null;
  furnishingStatus: string | null;
  ageOfProperty: number | null;
  images: string[];
  features: string[];
};

export type PropertyTypeCount = {
  name: string;
  slug: string;
  propertyCount: number;
};

export type SearchPropertiesInput = {
  listingType: string;
  propertyType?: string | null;
  location?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  minArea?: number | null;
  maxArea?: number | null;
  limit?: number;
};

export type CreatePropertyInput = {
  title: string;
  description?: string | null;
  listingType: string;
  propertyType?: string | null;
  locality: string;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  subLocality?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  landmark?: string | null;
  pincode?: string | null;
  status?: string | null;
  possessionStatus?: string | null;
  priceAmount?: number | null;
  rentAmount?: number | null;
  securityDeposit?: number | null;
  maintenanceAmount?: number | null;
  priceLabel?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  balconies?: number | null;
  floorNumber?: number | null;
  floorsTotal?: number | null;
  builtupArea?: number | null;
  builtupAreaUnit?: string | null;
  carpetArea?: number | null;
  plotArea?: number | null;
  parkingCount?: number | null;
  furnishingStatus?: string | null;
  ageOfProperty?: number | null;
  facing?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coverImageUrl?: string | null;
  imageUrls?: string[] | null;
  features?: string[] | null;
  source?: string | null;
  isFeatured?: boolean;
  isVerified?: boolean;
};

type RawHomepageProperty = {
  id: string;
  property_code: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  listing_type: string;
  property_type: string;
  locality: string | null;
  city: string | null;
  state: string | null;
  address_line1: string | null;
  price_amount: string | null;
  rent_amount: string | null;
  price_label: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  builtup_area: string | null;
  builtup_area_unit: string | null;
  cover_image: string | null;
  is_featured: boolean;
  is_verified: boolean;
  published_at: string | null;
};

type RawPropertyDetail = RawHomepageProperty & {
  country: string | null;
  sub_locality: string | null;
  address_line2: string | null;
  landmark: string | null;
  pincode: string | null;
  latitude: string | null;
  longitude: string | null;
  possession_status: string | null;
  facing: string | null;
  security_deposit: string | null;
  maintenance_amount: string | null;
  balconies: number | null;
  floors_total: number | null;
  floor_number: number | null;
  carpet_area: string | null;
  plot_area: string | null;
  parking_count: number | null;
  furnishing_status: string | null;
  age_of_property: number | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function assertNumberRange(field: string, value: unknown, min: number, max: number) {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must be a valid number.`);
  }
  if (value < min || value > max) {
    throw new Error(`${field} must be between ${min} and ${max}.`);
  }
}

function assertDbNumericRanges(input: CreatePropertyInput) {
  const MAX_MONEY = 999_999_999_999.99; // numeric(14,2)
  const MAX_AREA = 9_999_999_999.99; // numeric(12,2)

  assertNumberRange("Latitude", input.latitude ?? null, -90, 90);
  assertNumberRange("Longitude", input.longitude ?? null, -180, 180);

  assertNumberRange("Price Amount", input.priceAmount ?? null, 0, MAX_MONEY);
  assertNumberRange("Rent Amount", input.rentAmount ?? null, 0, MAX_MONEY);
  assertNumberRange("Security Deposit", input.securityDeposit ?? null, 0, MAX_MONEY);
  assertNumberRange("Maintenance Amount", input.maintenanceAmount ?? null, 0, MAX_MONEY);

  assertNumberRange("Built-up Area", input.builtupArea ?? null, 0, MAX_AREA);
  assertNumberRange("Carpet Area", input.carpetArea ?? null, 0, MAX_AREA);
  assertNumberRange("Plot Area", input.plotArea ?? null, 0, MAX_AREA);
}

function normalizeImageUrl(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();
  if (lower === "null" || lower === "undefined") {
    return null;
  }

  return normalized;
}

function mapHomepageProperty(row: RawHomepageProperty): HomepageProperty {
  return {
    id: row.id,
    propertyCode: row.property_code,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: row.status,
    listingType: row.listing_type,
    propertyType: row.property_type,
    locality: row.locality,
    city: row.city,
    state: row.state,
    addressLine1: row.address_line1,
    priceAmount: normalizeNumber(row.price_amount),
    rentAmount: normalizeNumber(row.rent_amount),
    priceLabel: row.price_label,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    builtupArea: normalizeNumber(row.builtup_area),
    builtupAreaUnit: row.builtup_area_unit,
    coverImage: normalizeImageUrl(row.cover_image),
    isFeatured: row.is_featured,
    isVerified: row.is_verified,
    publishedAt: row.published_at
  };
}

function mapPropertyDetail(
  row: RawPropertyDetail,
  images: string[],
  features: string[]
): PropertyDetail {
  const base = mapHomepageProperty(row);

  return {
    ...base,
    country: row.country,
    subLocality: row.sub_locality,
    addressLine2: row.address_line2,
    landmark: row.landmark,
    pincode: row.pincode,
    latitude: normalizeNumber(row.latitude),
    longitude: normalizeNumber(row.longitude),
    possessionStatus: row.possession_status,
    facing: row.facing,
    securityDeposit: normalizeNumber(row.security_deposit),
    maintenanceAmount: normalizeNumber(row.maintenance_amount),
    balconies: row.balconies,
    floorsTotal: row.floors_total,
    floorNumber: row.floor_number,
    carpetArea: normalizeNumber(row.carpet_area),
    plotArea: normalizeNumber(row.plot_area),
    parkingCount: row.parking_count,
    furnishingStatus: row.furnishing_status,
    ageOfProperty: row.age_of_property,
    images,
    features
  };
}

export const CRM_PROPERTY_TYPES = [
  "Apartment",
  "Villa",
  "Plot",
  "Independent House",
  "Shop",
  "Office"
];

export async function getPropertyTypeOptions() {
  return CRM_PROPERTY_TYPES.map((name, index) => ({
    id: index + 1,
    name,
    slug: slugify(name)
  }));
}

export async function listHomepageProperties(listingType: string, limit = 6) {
  const db = await getDb();
  const result = await db.query<RawHomepageProperty>(
    `
      select
        p.id::text,
        p.property_code,
        p.title,
        p.slug,
        p.description,
        p.status,
        p.listing_type,
        p.property_type,
        p.locality,
        p.city,
        p.state,
        p.address_line1,
        p.price_amount::text,
        p.rent_amount::text,
        p.price_label,
        p.bedrooms,
        p.bathrooms,
        p.builtup_area::text,
        p.builtup_area_unit,
        p.cover_image,
        p.is_featured,
        p.is_verified,
        p.published_at::text
      from properties p
      where p.deleted_at is null
        and p.status = 'active'
        and p.listing_type = $1
      order by p.is_featured desc, coalesce(p.published_at, p.created_at) desc
      limit $2
    `,
    [listingType, limit]
  );

  return result.rows.map(mapHomepageProperty);
}

export async function searchProperties({
  listingType,
  propertyType,
  location,
  minPrice,
  maxPrice,
  bedrooms,
  bathrooms,
  minArea,
  maxArea,
  limit = 24
}: SearchPropertiesInput) {
  const db = await getDb();
  const filters: string[] = [
    "p.deleted_at is null",
    "p.status = 'active'",
    "p.listing_type = $1"
  ];
  const params: Array<string | number> = [listingType];

  const normalizedPropertyType = propertyType?.trim();
  if (normalizedPropertyType) {
    params.push(normalizedPropertyType);
    filters.push(`lower(coalesce(p.property_type, '')) = lower($${params.length})`);
  }

  const normalizedLocation = location?.trim();
  if (normalizedLocation) {
    params.push(`%${normalizedLocation}%`);
    const locationIndex = params.length;
    filters.push(
      `(coalesce(p.locality, '') ilike $${locationIndex}
        or coalesce(p.sub_locality, '') ilike $${locationIndex}
        or coalesce(p.city, '') ilike $${locationIndex}
        or coalesce(p.address_line1, '') ilike $${locationIndex})`
    );
  }

  const priceColumn = listingType === "rent" ? "p.rent_amount" : "p.price_amount";
  if (typeof minPrice === "number" && Number.isFinite(minPrice)) {
    params.push(minPrice);
    filters.push(`${priceColumn} >= $${params.length}`);
  }

  if (typeof maxPrice === "number" && Number.isFinite(maxPrice)) {
    params.push(maxPrice);
    filters.push(`${priceColumn} <= $${params.length}`);
  }

  if (typeof bedrooms === "number" && Number.isFinite(bedrooms)) {
    params.push(bedrooms);
    filters.push(`coalesce(p.bedrooms, 0) >= $${params.length}`);
  }

  if (typeof bathrooms === "number" && Number.isFinite(bathrooms)) {
    params.push(bathrooms);
    filters.push(`coalesce(p.bathrooms, 0) >= $${params.length}`);
  }

  if (typeof minArea === "number" && Number.isFinite(minArea)) {
    params.push(minArea);
    filters.push(`coalesce(p.builtup_area, 0) >= $${params.length}`);
  }

  if (typeof maxArea === "number" && Number.isFinite(maxArea)) {
    params.push(maxArea);
    filters.push(`coalesce(p.builtup_area, 0) <= $${params.length}`);
  }

  params.push(limit);

  const result = await db.query<RawHomepageProperty>(
    `
      select
        p.id::text,
        p.property_code,
        p.title,
        p.slug,
        p.description,
        p.status,
        p.listing_type,
        p.property_type,
        p.locality,
        p.city,
        p.state,
        p.address_line1,
        p.price_amount::text,
        p.rent_amount::text,
        p.price_label,
        p.bedrooms,
        p.bathrooms,
        p.builtup_area::text,
        p.builtup_area_unit,
        p.cover_image,
        p.is_featured,
        p.is_verified,
        p.published_at::text
      from properties p
      where ${filters.join("\n        and ")}
      order by p.is_featured desc, coalesce(p.published_at, p.created_at) desc
      limit $${params.length}
    `,
    params
  );

  return result.rows.map(mapHomepageProperty);
}

export async function listPropertyTypeCounts(limit = 6) {
  const db = await getDb();
  const result = await db.query<{
    name: string;
    slug: string;
    property_count: string;
  }>(
    `
      select
        p.property_type as name,
        regexp_replace(lower(p.property_type), '[^a-z0-9]+', '-', 'g') as slug,
        count(p.id)::text as property_count
      from properties p
      where p.deleted_at is null
        and p.status = 'active'
        and coalesce(p.property_type, '') <> ''
      group by p.property_type
      order by count(p.id) desc, p.property_type asc
      limit $1
    `,
    [limit]
  );

  return result.rows.map((row) => ({
    name: row.name,
    slug: row.slug,
    propertyCount: Number(row.property_count)
  }));
}

export async function listApiProperties(limit = 50) {
  const db = await getDb();
  const result = await db.query<RawHomepageProperty>(
    `
      select
        p.id::text,
        p.property_code,
        p.title,
        p.slug,
        p.description,
        p.status,
        p.listing_type,
        p.property_type,
        p.locality,
        p.city,
        p.state,
        p.address_line1,
        p.price_amount::text,
        p.rent_amount::text,
        p.price_label,
        p.bedrooms,
        p.bathrooms,
        p.builtup_area::text,
        p.builtup_area_unit,
        p.cover_image,
        p.is_featured,
        p.is_verified,
        p.published_at::text
      from properties p
      where p.deleted_at is null
      order by coalesce(p.published_at, p.created_at) desc
      limit $1
    `,
    [limit]
  );

  return result.rows.map(mapHomepageProperty);
}

export async function getPropertyBySlug(slug: string, listingType?: string) {
  const db = await getDb();
  const result = await db.query<RawPropertyDetail>(
    `
      select
        p.id::text,
        p.property_code,
        p.title,
        p.slug,
        p.description,
        p.status,
        p.listing_type,
        p.possession_status,
        p.facing,
        p.property_type,
        p.country,
        p.locality,
        p.sub_locality,
        p.city,
        p.state,
        p.address_line1,
        p.address_line2,
        p.landmark,
        p.pincode,
        p.latitude::text,
        p.longitude::text,
        p.price_amount::text,
        p.rent_amount::text,
        p.security_deposit::text,
        p.maintenance_amount::text,
        p.price_label,
        p.bedrooms,
        p.bathrooms,
        p.balconies,
        p.floors_total,
        p.floor_number,
        p.builtup_area::text,
        p.builtup_area_unit,
        p.carpet_area::text,
        p.plot_area::text,
        p.parking_count,
        p.furnishing_status,
        p.age_of_property,
        p.cover_image,
        p.is_featured,
        p.is_verified,
        p.published_at::text
      from properties p
      where p.deleted_at is null
        and p.status = 'active'
        and p.slug = $1
        and ($2::text is null or p.listing_type = $2)
      limit 1
    `,
    [slug, listingType ?? null]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const propertyResult = await db.query<{ image_urls: unknown; features: unknown }>(
    `select image_urls, features from properties where id = $1 limit 1`,
    [Number(row.id)]
  );
  const propertyData = propertyResult.rows[0];

  const imageValues = Array.isArray(propertyData?.image_urls) ? propertyData.image_urls : [];
  const featureValues = Array.isArray(propertyData?.features) ? propertyData.features : [];

  const images = Array.from(
    new Set(
      imageValues
        .map((entry) => (typeof entry === "string" ? normalizeImageUrl(entry) : null))
        .filter((value): value is string => Boolean(value))
    )
  );

  const features = featureValues
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((value): value is string => Boolean(value));

  return mapPropertyDetail(row, images, features);
}

export async function getApiPropertyById(propertyId: string) {
  const parsedId = Number(propertyId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return null;
  }

  const db = await getDb();
  const result = await db.query<RawPropertyDetail>(
    `
      select
        p.id::text,
        p.property_code,
        p.title,
        p.slug,
        p.description,
        p.status,
        p.listing_type,
        p.possession_status,
        p.facing,
        p.property_type,
        p.country,
        p.locality,
        p.sub_locality,
        p.city,
        p.state,
        p.address_line1,
        p.address_line2,
        p.landmark,
        p.pincode,
        p.latitude::text,
        p.longitude::text,
        p.price_amount::text,
        p.rent_amount::text,
        p.security_deposit::text,
        p.maintenance_amount::text,
        p.price_label,
        p.bedrooms,
        p.bathrooms,
        p.balconies,
        p.floors_total,
        p.floor_number,
        p.builtup_area::text,
        p.builtup_area_unit,
        p.carpet_area::text,
        p.plot_area::text,
        p.parking_count,
        p.furnishing_status,
        p.age_of_property,
        p.cover_image,
        p.is_featured,
        p.is_verified,
        p.published_at::text
      from properties p
      where p.deleted_at is null
        and p.id = $1
      limit 1
    `,
    [parsedId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const propertyResult = await db.query<{ image_urls: unknown; features: unknown }>(
    `select image_urls, features from properties where id = $1 limit 1`,
    [parsedId]
  );
  const propertyData = propertyResult.rows[0];

  const imageValues = Array.isArray(propertyData?.image_urls) ? propertyData.image_urls : [];
  const featureValues = Array.isArray(propertyData?.features) ? propertyData.features : [];

  const images = Array.from(
    new Set(
      imageValues
        .map((entry) => (typeof entry === "string" ? normalizeImageUrl(entry) : null))
        .filter((value): value is string => Boolean(value))
    )
  );

  const features = featureValues
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((value): value is string => Boolean(value));

  return mapPropertyDetail(row, images, features);
}

export async function createProperty(input: CreatePropertyInput) {
  const codeSeed = Math.random().toString(36).slice(2, 8).toUpperCase();
  const propertyCode = `PROP-${codeSeed}`;
  const propertySlug = `prop-${codeSeed.toLowerCase()}`;

  return withDbClient(async (client) => {
    await client.query("begin");

    try {
      assertDbNumericRanges(input);
      let resolvedPropertyType = input.propertyType?.trim() || "";

      if (!resolvedPropertyType) {
        resolvedPropertyType = CRM_PROPERTY_TYPES[0];
      }

      const mediaUrls = Array.from(
        new Set(
          [input.coverImageUrl, ...(input.imageUrls || [])]
            .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            .map((value) => value.trim())
        )
      );
      const featureValues = Array.from(
        new Set(
          (input.features || [])
            .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            .map((value) => value.trim())
        )
      );

      const propertyResult = await client.query<{ id: string }>(
        `
          insert into properties (
            property_code,
            title,
            slug,
            description,
            status,
            listing_type,
            property_type,
            possession_status,
            country,
            state,
            city,
            locality,
            sub_locality,
            address_line1,
            address_line2,
            landmark,
            pincode,
            latitude,
            longitude,
            facing,
            price_amount,
            rent_amount,
            security_deposit,
            maintenance_amount,
            price_label,
            bedrooms,
            bathrooms,
            balconies,
            floor_number,
            floors_total,
            builtup_area,
            builtup_area_unit,
            carpet_area,
            plot_area,
            parking_count,
            furnishing_status,
            age_of_property,
            cover_image,
            image_urls,
            features,
            source,
            is_featured,
            is_verified,
            published_at
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
            $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
            $35, $36, $37, $38, $39::jsonb, $40::jsonb, $41, $42, $43, now()
          )
          returning id::text
        `,
        [
          propertyCode,
          input.title,
          propertySlug,
          input.description || null,
          input.status || "active",
          input.listingType,
          resolvedPropertyType,
          input.possessionStatus || null,
          input.country || "India",
          input.state || "Uttar Pradesh",
          input.city || "Bareilly",
          input.locality,
          input.subLocality || null,
          input.addressLine1 || null,
          input.addressLine2 || null,
          input.landmark || null,
          input.pincode || null,
          input.latitude ?? null,
          input.longitude ?? null,
          input.facing || null,
          input.priceAmount ?? null,
          input.rentAmount ?? null,
          input.securityDeposit ?? null,
          input.maintenanceAmount ?? null,
          input.priceLabel || null,
          input.bedrooms ?? null,
          input.bathrooms ?? null,
          input.balconies ?? null,
          input.floorNumber ?? null,
          input.floorsTotal ?? null,
          input.builtupArea ?? null,
          input.builtupAreaUnit || "sqft",
          input.carpetArea ?? null,
          input.plotArea ?? null,
          input.parkingCount ?? null,
          input.furnishingStatus || null,
          input.ageOfProperty ?? null,
          normalizeImageUrl(input.coverImageUrl || mediaUrls[0] || null),
          JSON.stringify(mediaUrls),
          JSON.stringify(featureValues),
          input.source || "manual",
          Boolean(input.isFeatured),
          Boolean(input.isVerified)
        ]
      );

      const propertyId = propertyResult.rows[0]?.id;

      await client.query("commit");

      return {
        id: propertyId,
        propertyCode,
        slug: propertySlug
      };
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

export async function updatePropertyById(propertyId: string, input: CreatePropertyInput) {
  const parsedId = Number(propertyId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    throw new Error("Invalid property id.");
  }

  const title = input.title?.trim();
  const listingType = input.listingType?.trim().toLowerCase();
  const locality = input.locality?.trim();
  const propertyType = input.propertyType?.trim() || "";
  if (!title || !listingType || !locality || !propertyType) {
    throw new Error("Title, listing type, property type, and locality are required.");
  }

  assertDbNumericRanges(input);

  const hasMediaInput = input.coverImageUrl !== undefined || input.imageUrls !== undefined;
  const mediaUrls = hasMediaInput
    ? Array.from(
        new Set(
          [input.coverImageUrl, ...(input.imageUrls || [])]
            .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            .map((value) => value.trim())
        )
      )
    : null;

  const hasFeatureInput = input.features !== undefined;
  const featureValues = hasFeatureInput
    ? Array.from(
        new Set(
          (input.features || [])
            .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            .map((value) => value.trim())
        )
      )
    : null;

  return withDbClient(async (client) => {
    const result = await client.query<{ id: string; property_code: string; slug: string }>(
      `
        update properties
        set
          title = $2,
          description = $3,
          status = $4,
          listing_type = $5,
          property_type = $6,
          possession_status = $7,
          country = $8,
          state = $9,
          city = $10,
          locality = $11,
          sub_locality = $12,
          address_line1 = $13,
          address_line2 = $14,
          landmark = $15,
          pincode = $16,
          latitude = $17,
          longitude = $18,
          facing = $19,
          price_amount = $20,
          rent_amount = $21,
          security_deposit = $22,
          maintenance_amount = $23,
          price_label = $24,
          bedrooms = $25,
          bathrooms = $26,
          balconies = $27,
          floor_number = $28,
          floors_total = $29,
          builtup_area = $30,
          builtup_area_unit = $31,
          carpet_area = $32,
          plot_area = $33,
          parking_count = $34,
          furnishing_status = $35,
          age_of_property = $36,
          cover_image = case when $37::text is null then cover_image else $37::text end,
          image_urls = case when $38::jsonb is null then image_urls else $38::jsonb end,
          features = case when $39::jsonb is null then features else $39::jsonb end,
          source = coalesce($40, source),
          is_featured = coalesce($41, is_featured),
          is_verified = coalesce($42, is_verified),
          updated_at = now()
        where id = $1
          and deleted_at is null
        returning
          id::text,
          property_code,
          slug
      `,
      [
        parsedId,
        title,
        input.description || null,
        input.status || "active",
        listingType,
        propertyType,
        input.possessionStatus || null,
        input.country || "India",
        input.state || "Uttar Pradesh",
        input.city || "Bareilly",
        locality,
        input.subLocality || null,
        input.addressLine1 || null,
        input.addressLine2 || null,
        input.landmark || null,
        input.pincode || null,
        input.latitude ?? null,
        input.longitude ?? null,
        input.facing || null,
        input.priceAmount ?? null,
        input.rentAmount ?? null,
        input.securityDeposit ?? null,
        input.maintenanceAmount ?? null,
        input.priceLabel || null,
        input.bedrooms ?? null,
        input.bathrooms ?? null,
        input.balconies ?? null,
        input.floorNumber ?? null,
        input.floorsTotal ?? null,
        input.builtupArea ?? null,
        input.builtupAreaUnit || "sqft",
        input.carpetArea ?? null,
        input.plotArea ?? null,
        input.parkingCount ?? null,
        input.furnishingStatus || null,
        input.ageOfProperty ?? null,
        hasMediaInput ? normalizeImageUrl(input.coverImageUrl || mediaUrls?.[0] || null) : null,
        hasMediaInput ? JSON.stringify(mediaUrls) : null,
        hasFeatureInput ? JSON.stringify(featureValues) : null,
        input.source || null,
        input.isFeatured ?? null,
        input.isVerified ?? null
      ]
    );

    if (!result.rows.length) {
      throw new Error("Property not found.");
    }

    return {
      id: result.rows[0].id,
      propertyCode: result.rows[0].property_code,
      slug: result.rows[0].slug
    };
  });
}

export async function hardDeletePropertyById(propertyId: string) {
  const parsedId = Number(propertyId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    throw new Error("Invalid property id.");
  }

  return withDbClient(async (client) => {
    const result = await client.query<{ id: string }>(
      `
        delete from properties
        where id = $1
        returning id::text
      `,
      [parsedId]
    );

    if (!result.rows.length) {
      throw new Error("Property not found.");
    }

    return { id: result.rows[0].id };
  });
}
